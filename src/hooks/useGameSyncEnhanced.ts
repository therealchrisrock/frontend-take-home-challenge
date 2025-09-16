import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Board, Move, PieceColor } from "~/lib/game/logic";
import {
  gameSyncActions,
  gameSyncReducer,
  gameSyncSelectors,
  initialGameSyncState,
  type GameSyncState,
} from "~/lib/game/sync/game-sync-reducer";
import { OptimisticUpdateManager } from "~/lib/optimistic-updates";
import { createSSEClient, type SSEClient } from "~/lib/sse/enhanced-client";
import { api } from "~/trpc/react";

// Helper function to check if two moves are equal
function movesEqual(move1: Move, move2: Move): boolean {
  return (
    move1.from.row === move2.from.row &&
    move1.from.col === move2.from.col &&
    move1.to.row === move2.to.row &&
    move1.to.col === move2.to.col &&
    JSON.stringify(move1.captures || []) === JSON.stringify(move2.captures || [])
  );
}

export interface UseGameSyncEnhancedOptions {
  gameId?: string;
  enabled?: boolean;
  onOpponentMove?: (move: Move, newGameState: unknown) => void;
  onConnectionStatusChange?: (connected: boolean) => void;
  onConflictDetected?: (conflictData: {
    serverBoard: Board;
    localBoard: Board;
    serverMoveCount: number;
    localMoveCount: number;
  }) => void;
}

export interface GameSyncEnhancedActions {
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
  resolveConflict: (strategy: "optimistic" | "server-wins") => void;
  createOptimisticUpdate: (
    move: Move,
    currentBoard: Board,
    currentPlayer: PieceColor,
    moveCount: number,
  ) => string; // returns update ID
}

/**
 * Enhanced game sync hook using unified reducer pattern for better state management
 */
export function useGameSyncEnhanced(
  options: UseGameSyncEnhancedOptions,
): [GameSyncState, GameSyncEnhancedActions] {
  const {
    gameId,
    enabled = true,
    onOpponentMove,
    onConnectionStatusChange,
    onConflictDetected,
  } = options;

  const [syncState, syncDispatch] = useReducer(
    gameSyncReducer,
    initialGameSyncState,
  );

  const optimisticManagerRef = useRef<OptimisticUpdateManager | null>(null);
  const sseClientRef = useRef<SSEClient | null>(null);
  const isConnectingRef = useRef(false);
  const serverVersionRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);
  const lastMoveSubmissionRef = useRef<{ move: Move; timestamp: number } | null>(null);

  // tRPC mutations (use multiplayer makeMove for online games)
  const makeMoveApi = api.multiplayerGame.makeMove.useMutation();
  const { data: initialServerState } =
    api.multiplayerGame.getGameState.useQuery(
      { gameId: gameId as string },
      {
        enabled: !!gameId && enabled,
        refetchOnWindowFocus: false,
        staleTime: 3000,
      },
    );

  useEffect(() => {
    if (initialServerState?.version !== undefined) {
      serverVersionRef.current = initialServerState.version;
    }
  }, [initialServerState]);

  // Sync reconnect attempts ref with reducer state
  useEffect(() => {
    reconnectAttemptsRef.current = syncState.connection.reconnectAttempts;
  }, [syncState.connection.reconnectAttempts]);

  // Initialize optimistic update manager
  useEffect(() => {
    if (!gameId || !enabled) return;

    optimisticManagerRef.current = new OptimisticUpdateManager();

    const unsubscribe = optimisticManagerRef.current.subscribe(() => {
      // Reducer does not have a SYNC_STATE_UPDATE action; rely on selectors
    });

    return () => {
      unsubscribe();
      optimisticManagerRef.current = null;
    };
  }, [gameId, enabled]);

  const connect = useCallback(async () => {
    if (!gameId || !enabled || isConnectingRef.current) return;

    // Prevent multiple simultaneous connection attempts
    isConnectingRef.current = true;
    console.log(`Starting connection to game ${gameId}`);
    syncDispatch(gameSyncActions.attemptConnection(gameId));

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
            console.log("Enhanced game SSE message received:", data.type);

            // Dispatch SSE message received action
            syncDispatch({
              type: "SSE_MESSAGE_RECEIVED",
              payload: { messageType: data.type, data: data.data || data },
            });

            // Handle different message types
            switch (data.type) {
              case "GAME_MOVE": {
                const moveData = data.data || data;
                onOpponentMove?.(moveData.move, moveData.gameState || moveData);
                if (moveData.gameState?.version !== undefined) {
                  serverVersionRef.current = moveData.gameState.version;
                }

                // Confirm optimistic update if it was our move
                if (moveData.optimisticMoveId && optimisticManagerRef.current) {
                  syncDispatch({
                    type: "OPTIMISTIC_MOVE_CONFIRMED",
                    payload: { updateId: moveData.optimisticMoveId },
                  });
                  optimisticManagerRef.current.confirmUpdate(
                    moveData.optimisticMoveId,
                  );
                }
                break;
              }

              case "connection_established": {
                console.log("SSE connection_established message received");
                // Don't handle connection_established in onMessage - handled in onConnectionStateChange
                break;
              }

              case "conflict_detected": {
                const conflictData = data.data;
                if (onConflictDetected) {
                  onConflictDetected(conflictData);
                }
                syncDispatch({
                  type: "SYNC_CONFLICT_DETECTED",
                  payload: conflictData,
                });
                break;
              }

              default:
                // Other message types handled by enhanced client
                break;
            }
          } catch (error) {
            console.error(
              "Failed to parse enhanced game SSE message:",
              error,
              event.data,
            );
          }
        },
        onOpen: () => {
          console.log("Enhanced game sync SSE connection opened");
          isConnectingRef.current = false;
          // Connection state will be handled by onConnectionStateChange callback
        },
        onError: (error) => {
          console.error("Enhanced game sync SSE connection error:", error);
          isConnectingRef.current = false;

          reconnectAttemptsRef.current += 1;
          const newAttempts = reconnectAttemptsRef.current;

          syncDispatch({
            type: "CONNECTION_FAILED",
            payload: {
              error: "Connection lost",
              attempt: newAttempts,
            },
          });

          console.log(`Enhanced game sync connection status: false (error)`);
          onConnectionStatusChange?.(false);
        },
        onConnectionStateChange: (connectionState) => {
          console.log(`SSE client state change: ${connectionState}`);

          // Update connection state in reducer based on SSE client state
          switch (connectionState) {
            case "connecting":
              // Already handled by CONNECTION_ATTEMPT
              break;

            case "connected":
              console.log("Dispatching CONNECTION_ESTABLISHED");
              reconnectAttemptsRef.current = 0; // Reset on successful connection
              syncDispatch({
                type: "CONNECTION_ESTABLISHED",
                payload: {
                  eventSource: null as unknown as EventSource, // SSE client manages EventSource internally
                  gameId,
                },
              });
              console.log(`Enhanced game sync connection status: true`);
              onConnectionStatusChange?.(true);
              break;

            case "reconnecting":
              reconnectAttemptsRef.current += 1;
              syncDispatch({
                type: "CONNECTION_FAILED",
                payload: {
                  error: "Reconnecting",
                  attempt: reconnectAttemptsRef.current,
                },
              });
              console.log(`Enhanced game sync connection status: false (reconnecting)`);
              onConnectionStatusChange?.(false);
              break;

            case "disconnected":
            case "intentionally_disconnected":
              syncDispatch({
                type: "CONNECTION_CLOSED",
                payload: { reason: connectionState },
              });
              console.log(`Enhanced game sync connection status: false (${connectionState})`);
              onConnectionStatusChange?.(false);
              break;
          }

          // Always update heartbeat timestamp
          syncDispatch({
            type: "SSE_HEARTBEAT",
            payload: { timestamp: new Date() },
          });
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
      reconnectAttemptsRef.current += 1;
      const newAttempts = reconnectAttemptsRef.current;
      syncDispatch({
        type: "CONNECTION_FAILED",
        payload: {
          error: error instanceof Error ? error.message : "Connection failed",
          attempt: newAttempts,
        },
      });
      console.log(`Enhanced game sync connection status: false (connection failed, attempt ${newAttempts})`);
      onConnectionStatusChange?.(false);
    }
  }, [
    gameId,
    enabled,
    onOpponentMove,
    onConnectionStatusChange,
    onConflictDetected,
  ]);

  const disconnect = useCallback(() => {
    console.log("Disconnect requested");
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
    }

    syncDispatch({ type: "CONNECTION_CLOSED", payload: { reason: "manual_disconnect" } });
    console.log(`Enhanced game sync connection status: false (manual disconnect)`);
    onConnectionStatusChange?.(false);
  }, [onConnectionStatusChange]);

  const sendMove = useCallback(
    async (
      move: Move,
      currentBoard?: Board,
      currentPlayer?: PieceColor,
      moveCount?: number,
      isRetry = false,
    ): Promise<boolean> => {
      if (!gameId) return false;

      // Prevent duplicate move submissions within 500ms
      const now = Date.now();
      const lastSubmission = lastMoveSubmissionRef.current;

      if (lastSubmission &&
          now - lastSubmission.timestamp < 500 &&
          movesEqual(lastSubmission.move, move)) {
        console.log("Preventing duplicate move submission");
        return false;
      }

      // Record this move attempt
      lastMoveSubmissionRef.current = { move, timestamp: now };

      // Attempt send regardless of SSE connection; queue only on failure

      try {
        // Create optimistic update if we have the required state
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

          syncDispatch({
            type: "OPTIMISTIC_MOVE_CREATED",
            payload: update,
          });
        }

        // Send move via multiplayer API with server version
        const res = await makeMoveApi.mutateAsync({
          gameId,
          move,
          gameVersion: serverVersionRef.current ?? 0,
        });

        // If server reported conflict (success false), treat as failure
        if (!(res as any)?.success) {
          return false;
        }

        // Update local server version from response
        if ((res as any)?.newGameState?.version !== undefined) {
          serverVersionRef.current = (res as any).newGameState.version;
        } else {
          serverVersionRef.current += 1;
        }

        return true;
      } catch (error) {
        console.error("Failed to send enhanced move:", error);

        // Check if it's a unique constraint violation (race condition) and we haven't retried yet
        if (!isRetry && error instanceof Error && error.message?.includes("Unique constraint failed")) {
          console.log("Constraint violation detected, retrying with fresh state");
          // Wait a small random amount and retry once
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
          // Clear the last submission to allow retry
          lastMoveSubmissionRef.current = null;
          // Retry once (but don't infinite loop)
          return sendMove(move, currentBoard, currentPlayer, moveCount, true);
        }

        // Queue for retry when connection restored
        syncDispatch({
          type: "RETRY_MOVE_QUEUED",
          payload: move,
        });

        return false;
      }
    },
    [gameId, syncState, makeMoveApi],
  );

  const queueOfflineMove = useCallback((move: Move) => {
    syncDispatch(gameSyncActions.queueOfflineMove(move));
  }, []);

  const processOfflineQueue = useCallback(async () => {
    if (
      syncState.moveQueue.offline.length === 0 &&
      syncState.moveQueue.retry.length === 0
    ) {
      return;
    }

    console.log(
      `Processing ${syncState.moveQueue.offline.length + syncState.moveQueue.retry.length} queued moves`,
    );

    syncDispatch({
      type: "MOVE_QUEUE_PROCESSING_START",
      payload: { queueType: "offline" },
    });

    const allMoves = [
      ...syncState.moveQueue.offline,
      ...syncState.moveQueue.retry,
    ];
    const processedMoves: Move[] = [];
    const failedMoves: Move[] = [];

    let nextVersion = serverVersionRef.current ?? 0;
    for (const move of allMoves) {
      try {
        const result = await makeMoveApi.mutateAsync({
          gameId: gameId!,
          move,
          gameVersion: nextVersion,
        });
        if ((result as any)?.success) {
          // Advance expected version
          if ((result as any)?.newGameState?.version !== undefined) {
            nextVersion = (result as any).newGameState.version;
          } else {
            nextVersion += 1;
          }
        } else {
          throw new Error("Conflict while processing queued move");
        }
        processedMoves.push(move);
      } catch (error) {
        console.error("Failed to process queued move:", error);
        failedMoves.push(move);
      }
    }
    // Persist the latest version back to ref
    serverVersionRef.current = nextVersion;

    if (processedMoves.length > 0) {
      syncDispatch({
        type: "MOVE_QUEUE_PROCESSING_COMPLETE",
        payload: { queueType: "offline", processedMoves },
      });
    }

    if (failedMoves.length > 0) {
      syncDispatch({
        type: "MOVE_QUEUE_PROCESSING_FAILED",
        payload: { queueType: "retry", failedMoves },
      });
    }
  }, [syncState.moveQueue, gameId, makeMoveApi]);

  const resolveConflict = useCallback(
    (strategy: "optimistic" | "server-wins") => {
      syncDispatch({
        type: "CONFLICT_RESOLUTION_START",
        payload: { strategy },
      });

      // Implementation would depend on the strategy
      if (strategy === "server-wins") {
        // Clear optimistic updates
        syncDispatch({ type: "CLEAR_OPTIMISTIC_UPDATES" });
        if (optimisticManagerRef.current) {
          optimisticManagerRef.current.clearAllUpdates();
        }
      }

      syncDispatch({ type: "CONFLICT_RESOLUTION_COMPLETE" });
    },
    [],
  );

  const createOptimisticUpdate = useCallback(
    (
      move: Move,
      currentBoard: Board,
      currentPlayer: PieceColor,
      moveCount: number,
    ): string => {
      if (!optimisticManagerRef.current) {
        throw new Error("Optimistic update manager not initialized");
      }

      const update = optimisticManagerRef.current.createUpdate(
        move,
        currentBoard,
        currentPlayer,
        moveCount,
      );

      syncDispatch({
        type: "OPTIMISTIC_MOVE_CREATED",
        payload: update,
      });

      return update.id;
    },
    [],
  );

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
    if (
      gameSyncSelectors.isConnected(syncState) &&
      gameSyncSelectors.hasQueuedMoves(syncState)
    ) {
      void processOfflineQueue();
    }
  }, [syncState, processOfflineQueue]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      if (
        gameId &&
        enabled &&
        !gameSyncSelectors.isConnected(syncState) &&
        sseClientRef.current
      ) {
        void sseClientRef.current.reconnect();
      }
    };

    const handleOffline = () => {
      reconnectAttemptsRef.current += 1;
      syncDispatch({
        type: "CONNECTION_FAILED",
        payload: {
          error: "No internet connection",
          attempt: reconnectAttemptsRef.current,
        },
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [gameId, enabled, syncState]);

  const actions: GameSyncEnhancedActions = {
    connect,
    disconnect,
    sendMove,
    queueOfflineMove,
    processOfflineQueue,
    resolveConflict,
    createOptimisticUpdate,
  };

  // Debug: Log connection status when it changes
  const isConnected = syncState.connection.status === "connected";
  const lastConnectionStatus = useRef<boolean | null>(null);

  if (lastConnectionStatus.current !== isConnected) {
    console.log(`GameSyncEnhanced connection status changed: ${lastConnectionStatus.current} -> ${isConnected} (status: ${syncState.connection.status})`);
    lastConnectionStatus.current = isConnected;
  }

  return [syncState, actions];
}
