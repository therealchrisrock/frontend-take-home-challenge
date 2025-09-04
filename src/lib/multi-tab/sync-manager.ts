import type { 
  TabId, 
  GameId, 
  MultiTabState, 
  SyncEvent, 
  OptimisticUpdate, 
  ConnectionStatus,
  InitialStatePayload,
  MoveAppliedPayload,
  TabStatusUpdatePayload
} from './types';
import type { Move } from '~/lib/game-logic';

export class MultiTabSyncManager {
  private gameId: GameId;
  private tabId: TabId;
  private eventSource: EventSource | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private state: MultiTabState;
  private listeners: Map<string, Set<(event: SyncEvent) => void>> = new Map();
  private offlineMoveQueue: Move[] = [];
  private lastSuccessfulConnection: Date | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private isManuallyDisconnected = false;

  // Configuration
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly RECONNECT_DELAY = 1000; // Start with 1 second
  private readonly MAX_RECONNECT_ATTEMPTS = 10; // Increased for better resilience
  private readonly CONNECTION_CHECK_INTERVAL = 5000; // Check connection every 5 seconds

  constructor(gameId: GameId) {
    this.gameId = gameId;
    this.tabId = this.generateTabId();
    this.state = {
      tabId: this.tabId,
      isConnected: false,
      isActiveTab: false,
      totalTabs: 1,
      connectionAttempts: 0,
      lastHeartbeat: null,
      optimisticUpdates: []
    };

    this.setupTabVisibilityHandling();
    this.setupBeforeUnloadHandling();
    this.setupOnlineStatusHandling();
    this.startConnectionMonitoring();
  }

  private generateTabId(): TabId {
    return `tab_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private setupTabVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isManuallyDisconnected) {
        if (this.eventSource?.readyState === EventSource.CLOSED || !this.state.isConnected) {
          this.reconnect();
        }
      }
    });
  }

  private setupOnlineStatusHandling(): void {
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      if (!this.isManuallyDisconnected) {
        this.reconnect();
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.notifyConnectionStatusListeners();
    });
  }

  private startConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(() => {
      if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED && 
          !this.isManuallyDisconnected && navigator.onLine) {
        console.log('Connection lost, attempting to reconnect...');
        this.reconnect();
      }
    }, this.CONNECTION_CHECK_INTERVAL);
  }

  private setupBeforeUnloadHandling(): void {
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });
  }

  async connect(): Promise<void> {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    this.isManuallyDisconnected = false;

    try {
      this.eventSource = new EventSource(
        `/api/game/${this.gameId}/stream?tabId=${this.tabId}`
      );

      this.eventSource.onopen = () => {
        console.log('SSE connection established');
        this.state.isConnected = true;
        this.state.connectionAttempts = 0;
        this.lastSuccessfulConnection = new Date();
        this.startHeartbeat();
        this.notifyConnectionStatusListeners();
        
        // Process any queued offline moves
        this.processOfflineMoveQueue();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const syncEvent: SyncEvent = JSON.parse(event.data);
          this.handleSyncEvent(syncEvent);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.state.isConnected = false;
        this.notifyConnectionStatusListeners();
        
        if (!this.isManuallyDisconnected && 
            this.state.connectionAttempts < this.MAX_RECONNECT_ATTEMPTS && 
            navigator.onLine) {
          this.scheduleReconnect();
        } else if (!navigator.onLine) {
          console.log('Offline - will retry when connection is restored');
        }
      };

      // Register tab with server via tRPC
      await this.registerTab();

    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      throw error;
    }
  }

  private async registerTab(): Promise<void> {
    // This would be implemented with tRPC call
    // For now, we'll implement this when we enhance the game router
  }

  private handleSyncEvent(event: SyncEvent): void {
    switch (event.type) {
      case 'INITIAL_STATE':
        this.handleInitialState(event.payload as InitialStatePayload);
        break;
      case 'MOVE_APPLIED':
        this.handleMoveApplied(event.payload as MoveAppliedPayload);
        break;
      case 'TAB_STATUS_UPDATE':
        this.handleTabStatusUpdate(event.payload as TabStatusUpdatePayload);
        break;
      case 'ACTIVE_TAB_CHANGED':
        this.handleActiveTabChanged(event.payload as { activeTabId: TabId });
        break;
      default:
        console.warn('Unknown sync event type:', event.type);
    }

    this.notifyEventListeners(event.type, event);
  }

  private handleInitialState(payload: InitialStatePayload): void {
    // Initial state will be handled by GameController
  }

  private handleMoveApplied(payload: MoveAppliedPayload): void {
    // Remove any matching optimistic update
    if (payload.optimisticMoveId) {
      this.state.optimisticUpdates = this.state.optimisticUpdates.filter(
        update => update.id !== payload.optimisticMoveId
      );
    }
  }

  private handleTabStatusUpdate(payload: TabStatusUpdatePayload): void {
    this.state.isActiveTab = payload.activeTabId === this.tabId;
    this.state.totalTabs = payload.totalTabs;
  }

  private handleActiveTabChanged(payload: { activeTabId: TabId }): void {
    this.state.isActiveTab = payload.activeTabId === this.tabId;
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      // This would be implemented with tRPC call
      this.state.lastHeartbeat = new Date();
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(
      this.RECONNECT_DELAY * Math.pow(1.5, this.state.connectionAttempts),
      30000 // Max 30 seconds
    );
    this.state.connectionAttempts++;

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.state.connectionAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (navigator.onLine && !this.isManuallyDisconnected) {
        this.reconnect();
      }
    }, delay);
  }

  private async reconnect(): Promise<void> {
    if (this.isManuallyDisconnected) {
      return;
    }

    console.log('Attempting to reconnect...');
    
    // Clean up existing connection but preserve the queue
    const preservedQueue = [...this.offlineMoveQueue];
    this.cleanupConnection();
    this.offlineMoveQueue = preservedQueue;
    
    try {
      await this.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  private cleanupConnection(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.cleanupConnection();
    
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    this.state.isConnected = false;
    this.notifyConnectionStatusListeners();
  }

  // Offline move queue management
  queueOfflineMove(move: Move): void {
    this.offlineMoveQueue.push(move);
    console.log(`Move queued for when connection is restored (${this.offlineMoveQueue.length} moves in queue)`);
  }

  private async processOfflineMoveQueue(): Promise<void> {
    if (this.offlineMoveQueue.length === 0) return;

    console.log(`Processing ${this.offlineMoveQueue.length} offline moves`);
    const moves = [...this.offlineMoveQueue];
    this.offlineMoveQueue = [];

    try {
      // Send all queued moves to server for syncing
      const response = await fetch('/api/trpc/game.syncOfflineMoves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            gameId: this.gameId,
            moves: moves,
            tabId: this.tabId
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync offline moves');
      }

      const result = await response.json();
      console.log(`Synced ${result.result.data.json.syncedMoves} moves successfully`);
      
      // Re-queue any failed moves
      if (result.result.data.json.failedMoves > 0) {
        console.warn(`${result.result.data.json.failedMoves} moves failed to sync`);
      }

    } catch (error) {
      console.error('Failed to process offline moves:', error);
      // Re-queue all moves on failure
      this.offlineMoveQueue = moves;
    }
    
    // Update connection status to reflect queue state
    this.notifyConnectionStatusListeners();
  }

  getOfflineMoveCount(): number {
    return this.offlineMoveQueue.length;
  }

  // Optimistic updates
  addOptimisticUpdate(move: Move): OptimisticUpdate {
    const update: OptimisticUpdate = {
      id: `opt_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      move,
      timestamp: new Date(),
      applied: false
    };

    this.state.optimisticUpdates.push(update);
    return update;
  }

  removeOptimisticUpdate(id: string): void {
    this.state.optimisticUpdates = this.state.optimisticUpdates.filter(
      update => update.id !== id
    );
  }

  // Event listeners
  addEventListener(eventType: string, listener: (event: SyncEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  removeEventListener(eventType: string, listener: (event: SyncEvent) => void): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  private notifyEventListeners(eventType: string, event: SyncEvent): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in sync event listener:', error);
        }
      });
    }
  }

  private notifyConnectionStatusListeners(): void {
    const connectionStatus: ConnectionStatus = {
      connected: this.state.isConnected,
      reconnecting: this.state.connectionAttempts > 0 && !this.state.isConnected,
      error: !navigator.onLine ? 'No internet connection' : null,
      lastConnected: this.lastSuccessfulConnection,
      offlineMoveCount: this.offlineMoveQueue.length
    };

    const event: SyncEvent<ConnectionStatus> = {
      type: 'CONNECTION_STATUS',
      payload: connectionStatus,
      timestamp: new Date().toISOString(),
      gameId: this.gameId,
      tabId: this.tabId
    };

    this.notifyEventListeners('CONNECTION_STATUS', event);
  }

  // Public getters
  get isConnected(): boolean {
    return this.state.isConnected;
  }

  get isActiveTab(): boolean {
    return this.state.isActiveTab;
  }

  get totalTabs(): number {
    return this.state.totalTabs;
  }

  get getTabId(): TabId {
    return this.tabId;
  }

  get getState(): Readonly<MultiTabState> {
    return { ...this.state };
  }

  get hasOfflineMoves(): boolean {
    return this.offlineMoveQueue.length > 0;
  }

  forceReconnect(): void {
    this.isManuallyDisconnected = false;
    this.state.connectionAttempts = 0;
    this.reconnect();
  }
}