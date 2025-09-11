import type { GameMove } from "../game/state/game-types";
import { multiplayerStorage, type QueuedMove } from "./indexedDbStorage";
import type { ConnectionManager } from "./connectionManager";

export interface QueueStats {
  totalMoves: number;
  pendingMoves: number;
  failedMoves: number;
  averageRetryCount: number;
  oldestQueuedMove: number | null;
  queueSizeBytes: number;
}

export interface QueueEvent {
  type: "move_queued" | "move_sent" | "move_failed" | "queue_cleared" | "sync_started" | "sync_completed";
  gameId: string;
  data: {
    move?: GameMove;
    moveId?: string;
    stats?: QueueStats;
    error?: string;
    timestamp: number;
  };
}

type QueueEventListener = (event: QueueEvent) => void;

export interface OfflineQueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelays: number[];
  syncInterval: number;
  batchSize: number;
  compressionEnabled: boolean;
}

const DEFAULT_CONFIG: OfflineQueueConfig = {
  maxQueueSize: 100,
  maxRetries: 3,
  retryDelays: [1000, 5000, 15000], // 1s, 5s, 15s
  syncInterval: 10000, // 10 seconds
  batchSize: 5,
  compressionEnabled: true,
};

export class OfflineQueueManager {
  private eventListeners = new Set<QueueEventListener>();
  private syncInterval: NodeJS.Timeout | null = null;
  private syncInProgress = new Set<string>();
  private config: OfflineQueueConfig;
  private sequenceCounters = new Map<string, number>();

  constructor(
    private connectionManager: ConnectionManager,
    config: Partial<OfflineQueueConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startSyncInterval();
  }

  async queueMove(gameId: string, move: GameMove, playerId: string): Promise<void> {
    try {
      // Get next sequence number for this game
      const sequenceNumber = this.getNextSequenceNumber(gameId);
      
      // Check queue size limits
      await this.enforceQueueSizeLimit(gameId);
      
      // Queue the move
      await multiplayerStorage.queueMove(gameId, move, playerId, sequenceNumber);
      
      // Calculate queue stats
      const stats = await this.getQueueStats(gameId);
      
      this.emitEvent({
        type: "move_queued",
        gameId,
        data: {
          move,
          stats,
          timestamp: Date.now(),
        },
      });

      // Attempt immediate sync if online
      const connectionStatus = this.connectionManager.getConnectionStatusDisplay();
      if (connectionStatus.status === "connected") {
        // Don't await to avoid blocking the UI
        this.syncQueue(gameId).catch(error => {
          console.error("Immediate sync failed:", error);
        });
      }

    } catch (error) {
      console.error("Failed to queue move:", error);
      this.emitEvent({
        type: "move_failed",
        gameId,
        data: {
          move,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
        },
      });
      throw error;
    }
  }

  async syncQueue(gameId: string): Promise<void> {
    if (this.syncInProgress.has(gameId)) {
      return; // Sync already in progress for this game
    }

    const connectionStatus = this.connectionManager.getConnectionStatusDisplay();
    if (connectionStatus.status !== "connected") {
      return; // Not connected, skip sync
    }

    this.syncInProgress.add(gameId);

    try {
      this.emitEvent({
        type: "sync_started",
        gameId,
        data: { timestamp: Date.now() },
      });

      const queuedMoves = await multiplayerStorage.getQueuedMoves(gameId);
      
      if (queuedMoves.length === 0) {
        return; // Nothing to sync
      }

      // Process moves in batches to avoid overwhelming the server
      const batches = this.createBatches(queuedMoves, this.config.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(gameId, batch);
        
        // Check connection status between batches
        const currentStatus = this.connectionManager.getConnectionStatusDisplay();
        if (currentStatus.status !== "connected") {
          console.log("Connection lost during sync, stopping");
          break;
        }
      }

      const stats = await this.getQueueStats(gameId);
      this.emitEvent({
        type: "sync_completed",
        gameId,
        data: {
          stats,
          timestamp: Date.now(),
        },
      });

    } catch (error) {
      console.error("Queue sync failed:", error);
      this.emitEvent({
        type: "move_failed",
        gameId,
        data: {
          error: error instanceof Error ? error.message : "Sync failed",
          timestamp: Date.now(),
        },
      });
    } finally {
      this.syncInProgress.delete(gameId);
    }
  }

  private async processBatch(gameId: string, batch: QueuedMove[]): Promise<void> {
    const results = await Promise.allSettled(
      batch.map(queuedMove => this.syncSingleMove(gameId, queuedMove))
    );

    // Handle results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const queuedMove = batch[i];

      if (result.status === "fulfilled" && result.value) {
        // Move synced successfully
        await multiplayerStorage.removeQueuedMove(queuedMove.id);
        
        this.emitEvent({
          type: "move_sent",
          gameId,
          data: {
            move: queuedMove.move,
            moveId: queuedMove.id,
            timestamp: Date.now(),
          },
        });
      } else {
        // Move failed to sync
        await this.handleMoveFailure(queuedMove, result.status === "rejected" ? result.reason : "Unknown error");
      }
    }
  }

  private async syncSingleMove(gameId: string, queuedMove: QueuedMove): Promise<boolean> {
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
          timestamp: queuedMove.timestamp,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        return true;
      }

      // Handle specific HTTP errors
      if (response.status === 409) {
        // Conflict - move may be out of sequence or invalid
        console.warn(`Move conflict for sequence ${queuedMove.sequenceNumber}:`, response.statusText);
        return false;
      }

      if (response.status === 422) {
        // Invalid move - remove from queue
        console.warn(`Invalid move for sequence ${queuedMove.sequenceNumber}:`, response.statusText);
        await multiplayerStorage.removeQueuedMove(queuedMove.id);
        return false;
      }

      // Other errors - retry
      console.warn(`Move sync failed with status ${response.status}:`, response.statusText);
      return false;

    } catch (error) {
      console.error("Network error during move sync:", error);
      return false;
    }
  }

  private async handleMoveFailure(queuedMove: QueuedMove, error: any): Promise<void> {
    await multiplayerStorage.incrementMoveRetryCount(queuedMove.id);

    const retryDelay = this.config.retryDelays[Math.min(queuedMove.retryCount, this.config.retryDelays.length - 1)];

    if (queuedMove.retryCount >= this.config.maxRetries) {
      // Max retries exceeded - remove from queue
      await multiplayerStorage.removeQueuedMove(queuedMove.id);
      console.warn(`Move ${queuedMove.id} exceeded max retries and was removed`);
      
      this.emitEvent({
        type: "move_failed",
        gameId: queuedMove.gameId,
        data: {
          move: queuedMove.move,
          moveId: queuedMove.id,
          error: "Max retries exceeded",
          timestamp: Date.now(),
        },
      });
    } else {
      // Schedule retry
      setTimeout(() => {
        this.syncQueue(queuedMove.gameId).catch(console.error);
      }, retryDelay);
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private getNextSequenceNumber(gameId: string): number {
    const current = this.sequenceCounters.get(gameId) || 0;
    const next = current + 1;
    this.sequenceCounters.set(gameId, next);
    return next;
  }

  private async enforceQueueSizeLimit(gameId: string): Promise<void> {
    const queuedMoves = await multiplayerStorage.getQueuedMoves(gameId);
    
    if (queuedMoves.length >= this.config.maxQueueSize) {
      // Remove oldest moves to make room
      const sortedMoves = queuedMoves.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = sortedMoves.slice(0, queuedMoves.length - this.config.maxQueueSize + 1);
      
      for (const move of toRemove) {
        await multiplayerStorage.removeQueuedMove(move.id);
        console.warn(`Removed old queued move ${move.id} due to size limit`);
      }
    }
  }

  // Queue management methods
  async clearQueue(gameId: string): Promise<void> {
    await multiplayerStorage.clearMovesQueue(gameId);
    this.sequenceCounters.set(gameId, 0);
    
    this.emitEvent({
      type: "queue_cleared",
      gameId,
      data: { timestamp: Date.now() },
    });
  }

  async getQueueStats(gameId: string): Promise<QueueStats> {
    const queuedMoves = await multiplayerStorage.getQueuedMoves(gameId);
    
    const totalMoves = queuedMoves.length;
    const pendingMoves = queuedMoves.filter(m => m.retryCount === 0).length;
    const failedMoves = queuedMoves.filter(m => m.retryCount > 0).length;
    
    const totalRetries = queuedMoves.reduce((sum, m) => sum + m.retryCount, 0);
    const averageRetryCount = totalMoves > 0 ? totalRetries / totalMoves : 0;
    
    const oldestQueuedMove = queuedMoves.length > 0 
      ? Math.min(...queuedMoves.map(m => m.timestamp))
      : null;
    
    // Estimate queue size in bytes
    const queueSizeBytes = this.estimateQueueSize(queuedMoves);
    
    return {
      totalMoves,
      pendingMoves,
      failedMoves,
      averageRetryCount,
      oldestQueuedMove,
      queueSizeBytes,
    };
  }

  private estimateQueueSize(queuedMoves: QueuedMove[]): number {
    // Rough estimation of queue size in bytes
    const avgMoveSize = 200; // Estimated bytes per move
    return queuedMoves.length * avgMoveSize;
  }

  async getQueuedMoves(gameId: string): Promise<QueuedMove[]> {
    return multiplayerStorage.getQueuedMoves(gameId);
  }

  isSyncInProgress(gameId: string): boolean {
    return this.syncInProgress.has(gameId);
  }

  // Auto-sync management
  private startSyncInterval(): void {
    this.syncInterval = setInterval(async () => {
      // Get all games with queued moves and sync them
      const allGameIds = Array.from(this.sequenceCounters.keys());
      
      for (const gameId of allGameIds) {
        if (!this.syncInProgress.has(gameId)) {
          try {
            const queuedMoves = await multiplayerStorage.getQueuedMoves(gameId);
            if (queuedMoves.length > 0) {
              await this.syncQueue(gameId);
            }
          } catch (error) {
            console.error(`Auto-sync failed for game ${gameId}:`, error);
          }
        }
      }
    }, this.config.syncInterval);
  }

  // Manual sync trigger
  async forceSyncAll(): Promise<void> {
    const allGameIds = Array.from(this.sequenceCounters.keys());
    
    await Promise.allSettled(
      allGameIds.map(gameId => this.syncQueue(gameId))
    );
  }

  // Event system
  addEventListener(listener: QueueEventListener): void {
    this.eventListeners.add(listener);
  }

  removeEventListener(listener: QueueEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(event: QueueEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Queue event listener error:", error);
      }
    });
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.eventListeners.clear();
    this.syncInProgress.clear();
    this.sequenceCounters.clear();
  }
}