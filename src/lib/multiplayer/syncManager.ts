import type { GameMove, GameState } from "../game/state/game-types";
import type { SSEMessage } from "../sse/types";
import { multiplayerStorage, type QueuedMove } from "./indexedDbStorage";

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

export interface GameSyncState {
  gameId: string;
  serverState: GameState | null;
  localState: GameState | null;
  hasLocalChanges: boolean;
  lastSyncTimestamp: number;
  sequenceNumber: number;
  conflictResolutionInProgress: boolean;
}

export interface SyncEvent {
  type: "move_synced" | "conflict_resolved" | "connection_status_changed" | "sync_error";
  gameId: string;
  data: any;
}

type SyncEventListener = (event: SyncEvent) => void;

export interface MultiplayerSyncConfig {
  gameId: string;
  playerId: string;
  maxRetries: number;
  retryDelay: number;
  heartbeatInterval: number;
  syncTimeout: number;
}

export class GameSyncManager {
  private gameStates = new Map<string, GameSyncState>();
  private eventListeners = new Set<SyncEventListener>();
  private eventSource: EventSource | null = null;
  private connectionStatus: ConnectionStatus = "disconnected";
  private config: MultiplayerSyncConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pingStartTime: number = 0;
  private latency: number = 0;

  constructor(config: MultiplayerSyncConfig) {
    this.config = config;
    this.initializeSync();
  }

  private initializeSync(): void {
    // Connect to SSE stream
    this.connectToStream();
    
    // Start periodic sync for queued moves
    this.startSyncInterval();
    
    // Start heartbeat for latency measurement
    this.startHeartbeat();
  }

  private connectToStream(): void {
    this.setConnectionStatus("connecting");
    
    try {
      this.eventSource = new EventSource(`/api/notifications/stream?gameId=${this.config.gameId}`);
      
      this.eventSource.onopen = () => {
        this.setConnectionStatus("connected");
        this.emitEvent({
          type: "connection_status_changed",
          gameId: this.config.gameId,
          data: { status: "connected", latency: this.latency }
        });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          this.handleSSEMessage(message);
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      this.eventSource.onerror = () => {
        this.setConnectionStatus("error");
        this.emitEvent({
          type: "connection_status_changed",
          gameId: this.config.gameId,
          data: { status: "error", latency: this.latency }
        });
        
        // Attempt reconnection after delay
        setTimeout(() => {
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.connectToStream();
          }
        }, this.config.retryDelay);
      };

    } catch (error) {
      this.setConnectionStatus("error");
      console.error("Failed to connect to SSE stream:", error);
    }
  }

  private handleSSEMessage(message: SSEMessage): void {
    switch (message.type) {
      case "heartbeat":
        if (this.pingStartTime > 0) {
          this.latency = Date.now() - this.pingStartTime;
          this.pingStartTime = 0;
        }
        break;
        
      case "notification":
        if (message.data?.notification?.type === "GAME_MOVE") {
          this.handleServerMove(message.data.notification);
        } else if (message.data?.notification?.type === "GAME_STATE_SYNC") {
          this.handleServerStateSync(message.data.notification);
        }
        break;
        
      case "connection_established":
        this.setConnectionStatus("connected");
        break;
        
      case "connection_closed":
        this.setConnectionStatus("disconnected");
        break;
    }
  }

  private async handleServerMove(notification: any): Promise<void> {
    const gameId = notification.relatedEntityId;
    if (!gameId) return;

    const moveData = notification.metadata as { move: GameMove; serverState: GameState; sequenceNumber: number };
    
    // Update local state with server move
    await this.updateGameState(gameId, moveData.serverState, moveData.sequenceNumber);
    
    this.emitEvent({
      type: "move_synced",
      gameId,
      data: { move: moveData.move, state: moveData.serverState }
    });
  }

  private async handleServerStateSync(notification: any): Promise<void> {
    const gameId = notification.relatedEntityId;
    if (!gameId) return;

    const syncData = notification.metadata as { serverState: GameState; sequenceNumber: number };
    const syncState = this.gameStates.get(gameId);

    if (syncState && syncState.hasLocalChanges) {
      // Conflict detected - resolve with server authority
      await this.resolveConflict(gameId, syncData.serverState, syncData.sequenceNumber);
    } else {
      // No conflict - update local state
      await this.updateGameState(gameId, syncData.serverState, syncData.sequenceNumber);
    }
  }

  private async resolveConflict(gameId: string, serverState: GameState, serverSequenceNumber: number): Promise<void> {
    const syncState = this.gameStates.get(gameId);
    if (!syncState || syncState.conflictResolutionInProgress) return;

    syncState.conflictResolutionInProgress = true;
    
    try {
      // Server authority - accept server state
      await this.updateGameState(gameId, serverState, serverSequenceNumber);
      
      // Re-queue any local moves that weren't reflected in server state
      const queuedMoves = await multiplayerStorage.getQueuedMoves(gameId);
      for (const queuedMove of queuedMoves) {
        if (queuedMove.sequenceNumber > serverSequenceNumber) {
          // This move might still be valid - will be retried in sync cycle
          continue;
        } else {
          // This move was likely rejected - remove from queue
          await multiplayerStorage.removeQueuedMove(queuedMove.id);
        }
      }
      
      this.emitEvent({
        type: "conflict_resolved",
        gameId,
        data: { resolvedState: serverState, method: "server_authority" }
      });
      
    } catch (error) {
      console.error("Conflict resolution failed:", error);
      this.emitEvent({
        type: "sync_error",
        gameId,
        data: { error: "conflict_resolution_failed" }
      });
    } finally {
      syncState.conflictResolutionInProgress = false;
    }
  }

  private async updateGameState(gameId: string, serverState: GameState, sequenceNumber: number): Promise<void> {
    const syncState = this.gameStates.get(gameId) || this.createInitialSyncState(gameId);
    
    syncState.serverState = serverState;
    syncState.localState = { ...serverState }; // Deep copy for local state
    syncState.hasLocalChanges = false;
    syncState.lastSyncTimestamp = Date.now();
    syncState.sequenceNumber = Math.max(syncState.sequenceNumber, sequenceNumber);
    
    // Cache the state locally
    await multiplayerStorage.cacheGameState(gameId, serverState, sequenceNumber);
    
    this.gameStates.set(gameId, syncState);
  }

  private createInitialSyncState(gameId: string): GameSyncState {
    return {
      gameId,
      serverState: null,
      localState: null,
      hasLocalChanges: false,
      lastSyncTimestamp: 0,
      sequenceNumber: 0,
      conflictResolutionInProgress: false,
    };
  }

  // Public API methods
  async queueMove(gameId: string, move: GameMove): Promise<void> {
    const syncState = this.gameStates.get(gameId) || this.createInitialSyncState(gameId);
    
    // Increment sequence number
    syncState.sequenceNumber++;
    syncState.hasLocalChanges = true;
    
    // Queue the move for sync
    await multiplayerStorage.queueMove(gameId, move, this.config.playerId, syncState.sequenceNumber);
    
    // Mark game state as locally modified
    await multiplayerStorage.markGameStateAsLocallyModified(gameId);
    
    this.gameStates.set(gameId, syncState);
    
    // Attempt immediate sync if online
    if (this.connectionStatus === "connected") {
      void this.syncQueuedMoves(gameId);
    }
  }

  async syncOnReconnect(gameId: string): Promise<void> {
    // Restore cached state
    const cachedState = await multiplayerStorage.getCachedGameState(gameId);
    if (cachedState) {
      const syncState = this.gameStates.get(gameId) || this.createInitialSyncState(gameId);
      syncState.localState = cachedState.state;
      syncState.hasLocalChanges = cachedState.localChanges;
      syncState.sequenceNumber = cachedState.serverVersion;
      this.gameStates.set(gameId, syncState);
    }
    
    // Sync any queued moves
    await this.syncQueuedMoves(gameId);
  }

  private async syncQueuedMoves(gameId: string): Promise<void> {
    if (this.connectionStatus !== "connected") return;
    
    const queuedMoves = await multiplayerStorage.getQueuedMoves(gameId);
    
    for (const queuedMove of queuedMoves) {
      try {
        const success = await this.sendMoveToServer(queuedMove);
        if (success) {
          await multiplayerStorage.removeQueuedMove(queuedMove.id);
        } else {
          await multiplayerStorage.incrementMoveRetryCount(queuedMove.id);
          
          // Remove moves that have exceeded retry limit
          if (queuedMove.retryCount >= this.config.maxRetries) {
            await multiplayerStorage.removeQueuedMove(queuedMove.id);
            console.warn(`Move ${queuedMove.id} exceeded retry limit and was removed`);
          }
        }
      } catch (error) {
        console.error("Failed to sync move:", error);
        await multiplayerStorage.incrementMoveRetryCount(queuedMove.id);
      }
    }
  }

  private async sendMoveToServer(queuedMove: QueuedMove): Promise<boolean> {
    try {
      const response = await fetch("/api/multiplayer/makeMove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: queuedMove.gameId,
          move: queuedMove.move,
          playerId: queuedMove.playerId,
          sequenceNumber: queuedMove.sequenceNumber,
        }),
        signal: AbortSignal.timeout(this.config.syncTimeout),
      });
      
      return response.ok;
    } catch (error) {
      console.error("Server move request failed:", error);
      return false;
    }
  }

  private startSyncInterval(): void {
    this.syncInterval = setInterval(async () => {
      if (this.connectionStatus === "connected") {
        for (const gameId of this.gameStates.keys()) {
          await this.syncQueuedMoves(gameId);
        }
      }
    }, 5000); // Sync every 5 seconds
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionStatus === "connected" && this.eventSource) {
        this.pingStartTime = Date.now();
        // Heartbeat will be responded to by the server
      }
    }, this.config.heartbeatInterval);
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      console.log(`Connection status changed to: ${status}`);
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  getLatency(): number {
    return this.latency;
  }

  handleServerConflict(serverState: GameState): void {
    // This method is called when the UI detects a conflict
    const gameId = this.config.gameId;
    void this.resolveConflict(gameId, serverState, Date.now());
  }

  // Event system
  addEventListener(listener: SyncEventListener): void {
    this.eventListeners.add(listener);
  }

  removeEventListener(listener: SyncEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(event: SyncEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Event listener error:", error);
      }
    });
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.eventListeners.clear();
    this.gameStates.clear();
  }
}