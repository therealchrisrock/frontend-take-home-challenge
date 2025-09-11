import { useEffect, useRef, useState, useCallback } from "react";
import type { GameMove, GameState } from "../lib/game/state/game-types";
import { GameSyncManager, type MultiplayerSyncConfig, type SyncEvent } from "../lib/multiplayer/syncManager";
import { ConnectionManager, type ConnectionEvent, type ConnectionMetrics } from "../lib/multiplayer/connectionManager";
import { OfflineQueueManager, type QueueEvent, type QueueStats } from "../lib/multiplayer/offlineQueueManager";
import { ConflictResolver, type ConflictEvent } from "../lib/multiplayer/conflictResolver";

export interface MultiplayerSyncState {
  isConnected: boolean;
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  connectionQuality: "excellent" | "good" | "fair" | "poor";
  latency: number;
  queueStats: QueueStats | null;
  hasQueuedMoves: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;
}

export interface MultiplayerSyncHook {
  // State
  syncState: MultiplayerSyncState;
  
  // Methods
  queueMove: (move: GameMove) => Promise<void>;
  forceSyncQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  testConnection: () => Promise<{ success: boolean; latency: number; error?: string }>;
  
  // Event callbacks (optional)
  onMoveSync?: (move: GameMove, state: GameState) => void;
  onConflictResolved?: (resolvedState: GameState) => void;
  onConnectionChange?: (isConnected: boolean, quality: string) => void;
  onSyncError?: (error: string) => void;
}

export function useMultiplayerSync(
  gameId: string,
  playerId: string,
  config: Partial<MultiplayerSyncConfig> = {}
): MultiplayerSyncHook {
  // Managers
  const syncManagerRef = useRef<GameSyncManager | null>(null);
  const connectionManagerRef = useRef<ConnectionManager | null>(null);
  const queueManagerRef = useRef<OfflineQueueManager | null>(null);
  const conflictResolverRef = useRef<ConflictResolver | null>(null);

  // State
  const [syncState, setSyncState] = useState<MultiplayerSyncState>({
    isConnected: false,
    connectionStatus: "disconnected",
    connectionQuality: "excellent",
    latency: 0,
    queueStats: null,
    hasQueuedMoves: false,
    isSyncing: false,
    lastSyncError: null,
  });

  // Event handlers
  const [eventCallbacks] = useState<{
    onMoveSync?: (move: GameMove, state: GameState) => void;
    onConflictResolved?: (resolvedState: GameState) => void;
    onConnectionChange?: (isConnected: boolean, quality: string) => void;
    onSyncError?: (error: string) => void;
  }>({});

  // Initialize managers
  useEffect(() => {
    const syncConfig: MultiplayerSyncConfig = {
      gameId,
      playerId,
      maxRetries: 3,
      retryDelay: 5000,
      heartbeatInterval: 30000,
      syncTimeout: 10000,
      ...config,
    };

    // Initialize connection manager
    const connectionManager = new ConnectionManager(gameId);
    connectionManagerRef.current = connectionManager;

    // Initialize sync manager
    const syncManager = new GameSyncManager(syncConfig);
    syncManagerRef.current = syncManager;

    // Initialize queue manager
    const queueManager = new OfflineQueueManager(connectionManager);
    queueManagerRef.current = queueManager;

    // Initialize conflict resolver
    const conflictResolver = new ConflictResolver();
    conflictResolverRef.current = conflictResolver;

    // Set up event listeners
    const handleSyncEvent = (event: SyncEvent) => {
      switch (event.type) {
        case "move_synced":
          eventCallbacks.onMoveSync?.(event.data.move, event.data.state);
          break;
        case "conflict_resolved":
          eventCallbacks.onConflictResolved?.(event.data.resolvedState);
          break;
        case "sync_error":
          setSyncState(prev => ({ ...prev, lastSyncError: event.data.error }));
          eventCallbacks.onSyncError?.(event.data.error);
          break;
        case "connection_status_changed":
          setSyncState(prev => ({
            ...prev,
            isConnected: event.data.status === "connected",
            connectionStatus: event.data.status,
            latency: event.data.latency || 0,
          }));
          break;
      }
    };

    const handleConnectionEvent = (event: ConnectionEvent) => {
      const { metrics } = event.data;
      
      setSyncState(prev => ({
        ...prev,
        isConnected: metrics.isOnline,
        connectionQuality: metrics.quality,
        latency: metrics.latency,
      }));

      if (event.type === "quality_changed" || event.type === "connection_restored" || event.type === "connection_lost") {
        eventCallbacks.onConnectionChange?.(metrics.isOnline, metrics.quality);
      }
    };

    const handleQueueEvent = (event: QueueEvent) => {
      switch (event.type) {
        case "sync_started":
          setSyncState(prev => ({ ...prev, isSyncing: true, lastSyncError: null }));
          break;
        case "sync_completed":
          setSyncState(prev => ({
            ...prev,
            isSyncing: false,
            queueStats: event.data.stats || null,
            hasQueuedMoves: (event.data.stats?.totalMoves || 0) > 0,
          }));
          break;
        case "move_queued":
          setSyncState(prev => ({
            ...prev,
            queueStats: event.data.stats || null,
            hasQueuedMoves: (event.data.stats?.totalMoves || 0) > 0,
          }));
          break;
        case "move_failed":
          setSyncState(prev => ({
            ...prev,
            lastSyncError: event.data.error || "Move failed",
            isSyncing: false,
          }));
          eventCallbacks.onSyncError?.(event.data.error || "Move failed");
          break;
      }
    };

    const handleConflictEvent = (event: ConflictEvent) => {
      if (event.type === "conflict_resolved" && event.data.resolution) {
        eventCallbacks.onConflictResolved?.(event.data.resolution.resolvedState);
      }
    };

    // Add event listeners
    syncManager.addEventListener(handleSyncEvent);
    connectionManager.addEventListener(handleConnectionEvent);
    queueManager.addEventListener(handleQueueEvent);
    conflictResolver.addEventListener(handleConflictEvent);

    // Initial state update
    const initialMetrics = connectionManager.getMetrics();
    setSyncState(prev => ({
      ...prev,
      isConnected: initialMetrics.isOnline,
      connectionQuality: initialMetrics.quality,
      latency: initialMetrics.latency,
    }));

    // Cleanup function
    return () => {
      syncManager.removeEventListener(handleSyncEvent);
      connectionManager.removeEventListener(handleConnectionEvent);
      queueManager.removeEventListener(handleQueueEvent);
      conflictResolver.removeEventListener(handleConflictEvent);

      syncManager.destroy();
      connectionManager.destroy();
      queueManager.destroy();
      conflictResolver.destroy();

      syncManagerRef.current = null;
      connectionManagerRef.current = null;
      queueManagerRef.current = null;
      conflictResolverRef.current = null;
    };
  }, [gameId, playerId]);

  // Update queue stats periodically
  useEffect(() => {
    const updateQueueStats = async () => {
      if (queueManagerRef.current) {
        try {
          const stats = await queueManagerRef.current.getQueueStats(gameId);
          setSyncState(prev => ({
            ...prev,
            queueStats: stats,
            hasQueuedMoves: stats.totalMoves > 0,
          }));
        } catch (error) {
          console.error("Failed to update queue stats:", error);
        }
      }
    };

    const interval = setInterval(updateQueueStats, 5000); // Update every 5 seconds
    updateQueueStats(); // Initial update

    return () => clearInterval(interval);
  }, [gameId]);

  // Methods
  const queueMove = useCallback(async (move: GameMove): Promise<void> => {
    if (!queueManagerRef.current) {
      throw new Error("Queue manager not initialized");
    }

    try {
      await queueManagerRef.current.queueMove(gameId, move, playerId);
      setSyncState(prev => ({ ...prev, lastSyncError: null }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to queue move";
      setSyncState(prev => ({ ...prev, lastSyncError: errorMessage }));
      throw error;
    }
  }, [gameId, playerId]);

  const forceSyncQueue = useCallback(async (): Promise<void> => {
    if (!queueManagerRef.current) {
      throw new Error("Queue manager not initialized");
    }

    try {
      await queueManagerRef.current.syncQueue(gameId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed";
      setSyncState(prev => ({ ...prev, lastSyncError: errorMessage }));
      throw error;
    }
  }, [gameId]);

  const clearQueue = useCallback(async (): Promise<void> => {
    if (!queueManagerRef.current) {
      throw new Error("Queue manager not initialized");
    }

    await queueManagerRef.current.clearQueue(gameId);
  }, [gameId]);

  const testConnection = useCallback(async (): Promise<{ success: boolean; latency: number; error?: string }> => {
    if (!connectionManagerRef.current) {
      return { success: false, latency: 0, error: "Connection manager not initialized" };
    }

    return connectionManagerRef.current.testConnection();
  }, []);

  // Set event callbacks
  const setEventCallbacks = useCallback((callbacks: {
    onMoveSync?: (move: GameMove, state: GameState) => void;
    onConflictResolved?: (resolvedState: GameState) => void;
    onConnectionChange?: (isConnected: boolean, quality: string) => void;
    onSyncError?: (error: string) => void;
  }) => {
    Object.assign(eventCallbacks, callbacks);
  }, [eventCallbacks]);

  return {
    syncState,
    queueMove,
    forceSyncQueue,
    clearQueue,
    testConnection,
    
    // Allow setting callbacks
    get onMoveSync() { return eventCallbacks.onMoveSync; },
    set onMoveSync(callback) { eventCallbacks.onMoveSync = callback; },
    
    get onConflictResolved() { return eventCallbacks.onConflictResolved; },
    set onConflictResolved(callback) { eventCallbacks.onConflictResolved = callback; },
    
    get onConnectionChange() { return eventCallbacks.onConnectionChange; },
    set onConnectionChange(callback) { eventCallbacks.onConnectionChange = callback; },
    
    get onSyncError() { return eventCallbacks.onSyncError; },
    set onSyncError(callback) { eventCallbacks.onSyncError = callback; },
  };
}