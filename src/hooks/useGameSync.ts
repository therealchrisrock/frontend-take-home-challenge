import { useCallback, useEffect, useRef, useState } from "react";
import type { Board, Move, PieceColor } from "~/lib/game/logic";
import { OptimisticUpdateManager } from "~/lib/optimistic-updates";
import { createSSEClient, type SSEClient } from "~/lib/sse/enhanced-client";
import { api } from "~/trpc/react";

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

  const sseClientRef = useRef<SSEClient | null>(null);
  const optimisticManagerRef = useRef<OptimisticUpdateManager | null>(null);
  const isConnectingRef = useRef(false);

  // tRPC mutations
  // Note: This hook is deprecated for online flow; left in place for legacy offline sync.
  // Avoid calling wrong router; retain type but not used in multiplayer path.
  const makeMoveApi = api.game.save.useMutation();

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
    if (!gameId || !enabled || isConnectingRef.current) return;

    // Prevent multiple simultaneous connection attempts
    isConnectingRef.current = true;

    // Close any existing connection before creating a new one
    if (sseClientRef.current) {
      sseClientRef.current.destroy();
      sseClientRef.current = null;
    }

    try {
      const url = `/api/game/${gameId}/mp-stream`;

      sseClientRef.current = createSSEClient({
        url,
        onMessage: (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Game SSE message received:", data.type);

            // Handle opponent moves
            if (data.type === "GAME_MOVE") {
              console.log("Processing GAME_MOVE event:", data.data);
              // The server sends the data nested under 'data' property
              const moveData = data.data || data;
              onOpponentMove?.(moveData.move, moveData.gameState || moveData);

              // Remove from optimistic updates if it was our move confirmed
              if (moveData.optimisticMoveId && optimisticManagerRef.current) {
                optimisticManagerRef.current.confirmUpdate(
                  moveData.optimisticMoveId,
                );
              }
            } else if (data.type === "DRAW_REQUEST") {
              console.log("Processing DRAW_REQUEST event:", data.data);
              // Pass draw request event to the game state
              onOpponentMove?.(null, { type: "DRAW_REQUEST", ...data.data });
            } else if (data.type === "DRAW_ACCEPTED") {
              console.log("Processing DRAW_ACCEPTED event:", data.data);
              // Pass draw acceptance event to the game state
              onOpponentMove?.(null, { type: "DRAW_ACCEPTED", ...data.data });
            } else if (data.type === "DRAW_DECLINED") {
              console.log("Processing DRAW_DECLINED event:", data.data);
              // Pass draw decline event to the game state
              onOpponentMove?.(null, { type: "DRAW_DECLINED", ...data.data });
            } else if (data.type === "connection_established") {
              // Some environments may delay onopen; treat this as connected
              setState((prev) => ({
                ...prev,
                isConnected: true,
                connectionError: null,
                isReconnecting: false,
              }));
              onConnectionStatusChange?.(true);
            }
          } catch (error) {
            console.error(
              "Failed to parse game SSE message:",
              error,
              event.data,
            );
          }
        },
        onOpen: () => {
          console.log("Game sync SSE connected");
          isConnectingRef.current = false;
          setState((prev) => ({
            ...prev,
            isConnected: true,
            connectionError: null,
            isReconnecting: false,
          }));
          onConnectionStatusChange?.(true);
        },
        onError: (error) => {
          console.error("Game sync SSE connection error:", error);
          isConnectingRef.current = false;
          setState((prev) => ({
            ...prev,
            isConnected: false,
            connectionError: "Connection lost",
          }));
          onConnectionStatusChange?.(false);
        },
        onConnectionStateChange: (connectionState) => {
          const isConnected = connectionState === "connected";
          const isReconnecting = connectionState === "reconnecting";

          setState((prev) => ({
            ...prev,
            isConnected,
            isReconnecting,
            connectionError: isConnected ? null : "Connection lost",
          }));

          onConnectionStatusChange?.(isConnected);
        },
        maxReconnectAttempts: 10,
        autoConnect: true,
      });
    } catch (error) {
      console.error(
        "Failed to establish enhanced game sync connection:",
        error,
      );
      isConnectingRef.current = false;
      setState((prev) => ({
        ...prev,
        connectionError:
          error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [gameId, enabled, onOpponentMove, onConnectionStatusChange]);

  const disconnect = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
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

        // Legacy: persist local state if needed; online moves handled elsewhere
        await makeMoveApi.mutateAsync({
          id: gameId,
          board: currentBoard!,
          currentPlayer: currentPlayer!,
          moveCount: moveCount!,
          gameMode: "online",
          winner: null,
        } as any);

        return true;
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
          id: gameId!,
          board: [] as unknown as Board,
          currentPlayer: "red",
          moveCount: 0,
          gameMode: "online",
          winner: null,
        } as any);
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
      void connect();
    }

    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.destroy();
        sseClientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, enabled]);

  // Process offline queue when reconnected
  useEffect(() => {
    if (state.isConnected && state.offlineMoveQueue.length > 0) {
      void processOfflineQueue();
    }
  }, [state.isConnected, state.offlineMoveQueue.length, processOfflineQueue]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      if (gameId && enabled && !state.isConnected && sseClientRef.current) {
        void sseClientRef.current.reconnect();
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
  }, [gameId, enabled, state.isConnected]);

  const actions: GameSyncActions = {
    connect,
    disconnect,
    sendMove,
    queueOfflineMove,
    processOfflineQueue,
  };

  return [state, actions];
}
