import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { OptimisticUpdateManager } from "~/lib/optimistic-updates";
import { api } from "~/trpc/react";
import type { Move, Board, PieceColor } from "~/lib/game/logic";
import { MultiTabSyncManager } from "~/lib/multi-tab/sync-manager";

export interface GameSyncState {
  isConnected: boolean;
  connectionError: string | null;
  isReconnecting: boolean;
  hasPendingUpdates: boolean;
  offlineMoveQueue: Move[];
}

export interface GameSyncActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMove: (
    move: Move,
    currentBoard?: Board,
    currentPlayer?: PieceColor,
    moveCount?: number,
  ) => Promise<boolean>;
  queueOfflineMove: (move: Move) => void;
  processOfflineQueue: () => Promise<void>;
}

export interface UseGameSyncOptions {
  gameId?: string;
  enabled?: boolean;
  onOpponentMove?: (move: Move, newGameState: unknown) => void;
  onConnectionStatusChange?: (connected: boolean) => void;
}

/**
 * Simplified game sync hook for real-time opponent moves
 * Focuses on game synchronization without multi-tab complexity
 */
export function useGameSync(
  options: UseGameSyncOptions,
): [GameSyncState, GameSyncActions] {
  const {
    gameId,
    enabled = true,
    onOpponentMove,
    onConnectionStatusChange,
  } = options;

  const [state, setState] = useState<GameSyncState>({
    isConnected: false,
    connectionError: null,
    isReconnecting: false,
    hasPendingUpdates: false,
    offlineMoveQueue: [],
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const optimisticManagerRef = useRef<OptimisticUpdateManager | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const syncManager = useMemo(() => new MultiTabSyncManager(), []);
  const tabId = syncManager.getTabId;

  // tRPC mutations
  const makeMoveApi = api.game.makeMove.useMutation();

  // Initialize optimistic update manager
  useEffect(() => {
    if (!gameId || !enabled) return;

    optimisticManagerRef.current = new OptimisticUpdateManager();

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
      optimisticManagerRef.current = null;
    };
  }, [gameId, enabled]);

  const connect = useCallback(async () => {
    if (!gameId || !enabled || eventSourceRef.current) return;

    try {
      const eventSource = new EventSource(
        `/api/game/${gameId}/simplified-stream`,
      );
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("Game sync connected");
        setState((prev) => ({
          ...prev,
          isConnected: true,
          connectionError: null,
          isReconnecting: false,
        }));
        reconnectAttemptsRef.current = 0;
        onConnectionStatusChange?.(true);

        // Process any offline moves
        if (state.offlineMoveQueue.length > 0) {
          void processOfflineQueue();
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle opponent moves
          if (data.type === "OPPONENT_MOVE") {
            onOpponentMove?.(data.move, data.gameState);

            // Remove from optimistic updates if it was our move confirmed
            if (data.optimisticMoveId && optimisticManagerRef.current) {
              optimisticManagerRef.current.confirmUpdate(data.optimisticMoveId);
            }
          }
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      eventSource.onerror = () => {
        console.error("Game sync connection error");
        eventSourceRef.current = null;
        setState((prev) => ({
          ...prev,
          isConnected: false,
          connectionError: "Connection lost",
        }));
        onConnectionStatusChange?.(false);

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < 10) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000,
          );
          reconnectAttemptsRef.current++;

          setState((prev) => ({ ...prev, isReconnecting: true }));

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error("Failed to establish game sync connection:", error);
      setState((prev) => ({
        ...prev,
        connectionError:
          error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [gameId, enabled, onOpponentMove, onConnectionStatusChange]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isReconnecting: false,
    }));

    onConnectionStatusChange?.(false);
  }, [onConnectionStatusChange]);

  const sendMove = useCallback(
    async (
      move: Move,
      currentBoard?: Board,
      currentPlayer?: PieceColor,
      moveCount?: number,
    ): Promise<boolean> => {
      if (!gameId) return false;

      // If offline, queue the move
      if (!state.isConnected) {
        setState((prev) => ({
          ...prev,
          offlineMoveQueue: [...prev.offlineMoveQueue, move],
        }));
        return true; // Optimistically return success
      }

      try {
        // Create optimistic update
        let optimisticId: string | undefined;
        if (
          optimisticManagerRef.current &&
          currentBoard &&
          currentPlayer !== undefined &&
          moveCount !== undefined
        ) {
          const update = optimisticManagerRef.current.createUpdate(
            move,
            currentBoard,
            currentPlayer,
            moveCount,
          );
          optimisticId = update.id;
        }

        // Send move to server
        const result = await makeMoveApi.mutateAsync({
          gameId,
          tabId,
          move,
          optimisticMoveId: optimisticId,
        });

        return result.success;
      } catch (error) {
        console.error("Failed to send move:", error);

        // Queue for retry when connection restored
        setState((prev) => ({
          ...prev,
          offlineMoveQueue: [...prev.offlineMoveQueue, move],
        }));

        return false;
      }
    },
    [gameId, state.isConnected, makeMoveApi],
  );

  const queueOfflineMove = useCallback((move: Move) => {
    setState((prev) => ({
      ...prev,
      offlineMoveQueue: [...prev.offlineMoveQueue, move],
    }));
  }, []);

  const processOfflineQueue = useCallback(async () => {
    if (state.offlineMoveQueue.length === 0) return;

    console.log(`Processing ${state.offlineMoveQueue.length} offline moves`);

    const moves = [...state.offlineMoveQueue];
    setState((prev) => ({ ...prev, offlineMoveQueue: [] }));

    for (const move of moves) {
      try {
        await makeMoveApi.mutateAsync({
          gameId: gameId!,
          tabId,
          move,
        });
      } catch (error) {
        console.error("Failed to process offline move:", error);
        // Re-queue failed moves
        setState((prev) => ({
          ...prev,
          offlineMoveQueue: [...prev.offlineMoveQueue, move],
        }));
      }
    }
  }, [state.offlineMoveQueue, gameId, makeMoveApi]);

  // Auto-connect when gameId is available
  useEffect(() => {
    if (gameId && enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [gameId, enabled]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      if (gameId && enabled && !state.isConnected) {
        connect();
      }
    };

    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        connectionError: "No internet connection",
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [gameId, enabled, state.isConnected, connect]);

  const actions: GameSyncActions = {
    connect,
    disconnect,
    sendMove,
    queueOfflineMove,
    processOfflineQueue,
  };

  return [state, actions];
}
