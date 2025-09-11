import { useEffect, useState, useCallback, useRef } from "react";
import { MultiTabSyncManager } from "~/lib/multi-tab/sync-manager";
import { OptimisticUpdateManager } from "~/lib/optimistic-updates";
import { api } from "~/trpc/react";
import type {
  SyncEvent,
  InitialStatePayload,
  MoveAppliedPayload,
  TabStatusUpdatePayload,
  ConnectionStatus,
} from "~/lib/multi-tab/types";
import type { Move, Board, PieceColor } from "~/lib/game/logic";

export interface MultiTabSyncState {
  isConnected: boolean;
  isActiveTab: boolean;
  totalTabs: number;
  connectionError: string | null;
  isReconnecting: boolean;
  hasPendingUpdates: boolean;
  syncManager: MultiTabSyncManager | null;
  offlineMoveCount: number;
  lastConnected: Date | null;
}

export interface MultiTabSyncActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  makeOptimisticMove: (
    move: Move,
    currentBoard?: Board,
    currentPlayer?: PieceColor,
    moveCount?: number,
  ) => Promise<boolean>;
  requestTabActivation: () => Promise<boolean>;
  sendHeartbeat: () => Promise<void>;
  queueOfflineMove: (move: Move) => void;
}

export interface UseMultiTabSyncOptions {
  gameId?: string;
  onGameStateUpdate?: (state: InitialStatePayload) => void;
  onMoveApplied?: (payload: MoveAppliedPayload) => void;
  onTabStatusUpdate?: (payload: TabStatusUpdatePayload) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  onConflictDetected?: (conflictIds: string[]) => void;
}

export function useMultiTabSync(
  options: UseMultiTabSyncOptions,
): [MultiTabSyncState, MultiTabSyncActions] {
  const {
    gameId,
    onGameStateUpdate,
    onMoveApplied,
    onTabStatusUpdate,
    onConnectionStatusChange,
    onConflictDetected,
  } = options;

  const [state, setState] = useState<MultiTabSyncState>({
    isConnected: false,
    isActiveTab: false,
    totalTabs: 1,
    connectionError: null,
    isReconnecting: false,
    hasPendingUpdates: false,
    syncManager: null,
    offlineMoveCount: 0,
    lastConnected: null,
  });

  const syncManagerRef = useRef<MultiTabSyncManager | null>(null);
  const optimisticManagerRef = useRef<OptimisticUpdateManager | null>(null);

  // tRPC mutations
  const makeMoveApi = api.game.makeMove.useMutation();
  const requestTabActivationApi = api.game.requestTabActivation.useMutation();
  const heartbeatApi = api.game.heartbeat.useMutation();

  // Initialize managers
  useEffect(() => {
    if (!gameId) return;

    if (!optimisticManagerRef.current) {
      optimisticManagerRef.current = new OptimisticUpdateManager();

      // Subscribe to optimistic update state changes
      const unsubscribe = optimisticManagerRef.current.subscribe(
        (optimisticState) => {
          setState((prev) => ({
            ...prev,
            hasPendingUpdates: optimisticState.pendingCount > 0,
          }));
        },
      );

      return () => {
        unsubscribe();
      };
    }
  }, [gameId]);

  // Setup event listeners
  useEffect(() => {
    if (!syncManagerRef.current) return;

    const syncManager = syncManagerRef.current;

    const handleInitialState = (event: SyncEvent) => {
      const payload = event.payload as InitialStatePayload;
      onGameStateUpdate?.(payload);
    };

    const handleMoveApplied = (event: SyncEvent) => {
      const payload = event.payload as MoveAppliedPayload;

      // Remove matching optimistic update
      if (payload.optimisticMoveId && optimisticManagerRef.current) {
        optimisticManagerRef.current.confirmUpdate(payload.optimisticMoveId);
      }

      onMoveApplied?.(payload);
    };

    const handleTabStatusUpdate = (event: SyncEvent) => {
      const payload = event.payload as TabStatusUpdatePayload;

      setState((prev) => ({
        ...prev,
        isActiveTab: payload.activeTabId === syncManager.getTabId,
        totalTabs: payload.totalTabs,
      }));

      onTabStatusUpdate?.(payload);
    };

    const handleActiveTabChanged = (event: SyncEvent) => {
      const payload = event.payload as { activeTabId: string };

      setState((prev) => ({
        ...prev,
        isActiveTab: payload.activeTabId === syncManager.getTabId,
      }));
    };

    const handleConnectionStatus = (event: SyncEvent) => {
      const payload = event.payload as ConnectionStatus;

      setState((prev) => ({
        ...prev,
        isConnected: payload.connected,
        isReconnecting: payload.reconnecting,
        connectionError: payload.error,
        offlineMoveCount: payload.offlineMoveCount || 0,
        lastConnected: payload.lastConnected,
      }));

      onConnectionStatusChange?.(payload);
    };

    // Add event listeners
    syncManager.addEventListener("INITIAL_STATE", handleInitialState);
    syncManager.addEventListener("MOVE_APPLIED", handleMoveApplied);
    syncManager.addEventListener("TAB_STATUS_UPDATE", handleTabStatusUpdate);
    syncManager.addEventListener("ACTIVE_TAB_CHANGED", handleActiveTabChanged);
    syncManager.addEventListener("CONNECTION_STATUS", handleConnectionStatus);

    return () => {
      // Remove event listeners
      syncManager.removeEventListener("INITIAL_STATE", handleInitialState);
      syncManager.removeEventListener("MOVE_APPLIED", handleMoveApplied);
      syncManager.removeEventListener(
        "TAB_STATUS_UPDATE",
        handleTabStatusUpdate,
      );
      syncManager.removeEventListener(
        "ACTIVE_TAB_CHANGED",
        handleActiveTabChanged,
      );
      syncManager.removeEventListener(
        "CONNECTION_STATUS",
        handleConnectionStatus,
      );
    };
  }, [
    syncManagerRef.current,
    onGameStateUpdate,
    onMoveApplied,
    onTabStatusUpdate,
    onConnectionStatusChange,
  ]);

  const connect = useCallback(async () => {
    if (!gameId || syncManagerRef.current) return;

    try {
      const syncManager = new MultiTabSyncManager(gameId);
      syncManagerRef.current = syncManager;

      setState((prev) => ({
        ...prev,
        syncManager,
        connectionError: null,
      }));

      await syncManager.connect();

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isActiveTab: syncManager.isActiveTab,
        totalTabs: syncManager.totalTabs,
        lastConnected: new Date(),
      }));
    } catch (error) {
      console.error("Failed to connect to multi-tab sync:", error);
      setState((prev) => ({
        ...prev,
        connectionError:
          error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [gameId]);

  const disconnect = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.disconnect();
      syncManagerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      syncManager: null,
      lastConnected: prev.isConnected ? new Date() : prev.lastConnected,
    }));
  }, []);

  const makeOptimisticMove = useCallback(
    async (
      move: Move,
      currentBoard?: Board,
      currentPlayer?: PieceColor,
      moveCount?: number,
    ): Promise<boolean> => {
      if (!gameId || !syncManagerRef.current) return false;

      const syncManager = syncManagerRef.current;
      const optimisticManager = optimisticManagerRef.current;

      // If offline, queue the move
      if (!syncManager.isConnected) {
        syncManager.queueOfflineMove(move);
        console.log("Move queued for offline sync");
        // Still return true to allow local state updates
        return true;
      }

      if (!syncManager.isActiveTab) {
        throw new Error("Only the active tab can make moves");
      }

      try {
        // Create optimistic update
        let optimisticUpdate: any = null;
        if (
          optimisticManager &&
          currentBoard &&
          currentPlayer !== undefined &&
          moveCount !== undefined
        ) {
          optimisticUpdate = optimisticManager.createUpdate(
            move,
            currentBoard,
            currentPlayer,
            moveCount,
          );
        }

        // Make the move via tRPC
        const result = await makeMoveApi.mutateAsync({
          gameId,
          move,
          tabId: syncManager.getTabId,
          optimisticMoveId: optimisticUpdate?.id,
        });

        return result.success;
      } catch (error) {
        console.error("Failed to make optimistic move:", error);

        // If network error, queue for offline sync
        if (error instanceof Error && error.message.includes("fetch")) {
          syncManager.queueOfflineMove(move);
          console.log("Network error - move queued for offline sync");
          return true; // Allow local state update
        }

        // Rollback optimistic update if it exists
        if (optimisticManagerRef.current && currentBoard) {
          // Handle rollback logic here
        }

        throw error;
      }
    },
    [gameId, makeMoveApi],
  );

  const requestTabActivation = useCallback(async (): Promise<boolean> => {
    if (!gameId || !syncManagerRef.current) return false;

    try {
      const result = await requestTabActivationApi.mutateAsync({
        gameId,
        tabId: syncManagerRef.current.getTabId,
      });

      return result.success;
    } catch (error) {
      console.error("Failed to request tab activation:", error);
      return false;
    }
  }, [gameId, requestTabActivationApi]);

  const sendHeartbeat = useCallback(async (): Promise<void> => {
    if (!gameId || !syncManagerRef.current) return;

    try {
      await heartbeatApi.mutateAsync({
        gameId,
        tabId: syncManagerRef.current.getTabId,
      });
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    }
  }, [gameId, heartbeatApi]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const queueOfflineMove = useCallback((move: Move) => {
    if (syncManagerRef.current) {
      syncManagerRef.current.queueOfflineMove(move);
      setState((prev) => ({
        ...prev,
        offlineMoveCount: syncManagerRef.current?.getOfflineMoveCount() || 0,
      }));
    }
  }, []);

  const actions: MultiTabSyncActions = {
    connect,
    disconnect,
    makeOptimisticMove,
    requestTabActivation,
    sendHeartbeat,
    queueOfflineMove,
  };

  return [state, actions];
}
