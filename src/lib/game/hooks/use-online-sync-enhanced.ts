import React, { useCallback, useEffect } from "react";
import { useGameState } from "~/contexts/event-context";
import type { Board, Move } from "~/lib/game/logic";
import { makeMove } from "~/lib/game/logic";
import { api } from "~/trpc/react";
import { useGame } from "../state/game-context";

export function useOnlineSyncEnhanced() {
  const { state, dispatch } = useGame();

  const enabled = state.gameMode === "online" && !!state.gameId;
  const joinGame = api.multiplayerGame.joinGame.useMutation();
  const hasJoinedRef = React.useRef(false);
  const lastAppliedServerMoveCountRef = React.useRef<number | null>(null);
  const latestLocalMoveCountRef = React.useRef<number>(state.moveCount);

  // Keep a ref of the latest local moveCount to compare against server updates without causing effect loops
  useEffect(() => {
    latestLocalMoveCountRef.current = state.moveCount;
  }, [state.moveCount]);

  // Use EventContext for real-time game sync
  const {
    gameState: eventGameState,
    isConnected,
    isReconnecting,
    connectionError,
    sendMove: sendGameMove,
    reconnect,
  } = useGameState(enabled ? state.gameId : undefined, state.moveCount);

  const normalizeColor = (value: unknown): "red" | "black" | undefined => {
    return value === "red" || value === "black"
      ? (value as "red" | "black")
      : undefined;
  };

  const normalizeWinner = (
    value: unknown,
  ): "red" | "black" | "draw" | null | undefined => {
    return value === "red" ||
      value === "black" ||
      value === "draw" ||
      value === null
      ? (value as "red" | "black" | "draw" | null)
      : undefined;
  };

  // Handle game state updates from EventContext
  useEffect(() => {
    if (!eventGameState || !enabled) return;

    // Check for draw events in game state
    if (eventGameState.status === "DRAW_REQUESTED") {
      const requestedBy = normalizeColor((eventGameState.state as any)?.drawRequestedBy);
      if (requestedBy) {
        dispatch({
          type: "SYNC_DRAW_REQUEST",
          payload: { requestedBy },
        });
      }
      return;
    } else if (eventGameState.status === "DRAW_ACCEPTED") {
      dispatch({
        type: "SYNC_DRAW_ACCEPTED",
        payload: { acceptedBy: state.currentPlayer },
      });
      return;
    } else if (eventGameState.status === "DRAW_DECLINED") {
      dispatch({
        type: "SYNC_DRAW_DECLINED",
        payload: { declinedBy: state.currentPlayer },
      });
      return;
    } else if (eventGameState.status === "COMPLETED" && (eventGameState.state as any)?.winner) {
      // Handle resignation or game end
      const winner = normalizeWinner((eventGameState.state as any).winner);
      if (winner) {
        dispatch({
          type: "SERVER_STATE_OVERRIDE",
          payload: {
            board: state.board, // Keep current board
            moveCount: state.moveCount,
            currentPlayer: state.currentPlayer,
            winner,
          },
        });
      }
      return;
    }

    // Handle server game updates (opponent moves or confirmations)
    if (eventGameState.lastMove && eventGameState.state) {
      const move = eventGameState.lastMove as Move;

      // Apply the move to our local state
      const boardState = eventGameState.state as any;
      if (boardState.board) {
        // Get server move count
        const serverMoveCount: number | undefined =
          typeof boardState.moveCount === "number"
            ? boardState.moveCount
            : undefined;

        // Special handling for the first move: don't filter if lastAppliedServerMoveCountRef is null
        const isFirstMove = lastAppliedServerMoveCountRef.current === null;

        // Debug logging for first move synchronization
        if (serverMoveCount === 1 || latestLocalMoveCountRef.current === 0) {
          console.log("[OnlineSync] First move sync:", {
            serverMoveCount,
            localMoveCount: latestLocalMoveCountRef.current,
            lastApplied: lastAppliedServerMoveCountRef.current,
            isFirstMove,
          });
        }

        // Only filter stale events if not the first move
        if (!isFirstMove) {
          // Ignore stale events: if server moveCount is behind our local moveCount (optimistic preview)
          if (
            serverMoveCount !== undefined &&
            serverMoveCount < latestLocalMoveCountRef.current
          ) {
            console.log("[OnlineSync] Ignoring stale event:", {
              serverMoveCount,
              localMoveCount: latestLocalMoveCountRef.current,
            });
            return;
          }

          // Prevent re-applying the same server moveCount repeatedly
          if (
            serverMoveCount !== undefined &&
            lastAppliedServerMoveCountRef.current === serverMoveCount
          ) {
            console.log("[OnlineSync] Ignoring duplicate event:", {
              serverMoveCount,
              lastApplied: lastAppliedServerMoveCountRef.current,
            });
            return;
          }
        }

        // Parse the board if it's a JSON string
        let board: Board;
        try {
          board =
            typeof boardState.board === "string"
              ? JSON.parse(boardState.board)
              : boardState.board;
        } catch (error) {
          console.error("Failed to parse board state:", error);
          return;
        }

        const nextPlayer =
          normalizeColor(boardState.currentPlayer) || state.currentPlayer;
        const winner = normalizeWinner(boardState.winner);
        const moveCount =
          typeof boardState.moveCount === "number"
            ? boardState.moveCount
            : latestLocalMoveCountRef.current + 1;

        // Log the state override for debugging
        console.log("[OnlineSync] Applying server state:", {
          moveCount,
          currentPlayer: nextPlayer,
          hasWinner: winner !== undefined,
        });

        dispatch({
          type: "SERVER_STATE_OVERRIDE",
          payload: {
            board,
            moveCount,
            currentPlayer: nextPlayer,
            ...(winner !== undefined ? { winner } : {}),
            lastMove: move,  // Include the move for sound playback
          },
        });

        // Update the last applied server move count
        if (serverMoveCount !== undefined) {
          lastAppliedServerMoveCountRef.current = serverMoveCount;
        }
      }
    }
  }, [eventGameState, enabled, dispatch]);

  // Handle connection state changes
  useEffect(() => {
    if (!enabled) return;

    const status = isConnected
      ? "connected"
      : isReconnecting
        ? "reconnecting"
        : "disconnected";
    dispatch({
      type: "SYNC_STATE_UPDATE",
      payload: {
        connection: {
          status,
          error: connectionError ?? null,
        },
      },
    });
  }, [isConnected, isReconnecting, connectionError, enabled, dispatch]);

  // Join game on mount if not already joined
  useEffect(() => {
    if (enabled && state.gameId && isConnected && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinGame
        .mutateAsync({ gameId: state.gameId })
        .then((result) => {
          console.log("Successfully joined game");
          // Initialize the lastAppliedServerMoveCountRef with the current game moveCount
          // This prevents the first move from being incorrectly filtered
          if (result && typeof result.gameState?.moveCount === "number") {
            lastAppliedServerMoveCountRef.current = result.gameState.moveCount;
          }
        })
        .catch((error) => {
          console.error("Failed to join game:", error);
          hasJoinedRef.current = false;
        });
    }
  }, [enabled, state.gameId, isConnected, joinGame]);

  // Enhanced sendMove with optimistic updates
  const sendMove = useCallback(
    async (move: Move): Promise<boolean> => {
      if (!state.gameId || !isConnected) {
        console.log("Cannot send move: not connected or no gameId");
        return false;
      }

      // Optimistically apply the move locally
      const previewBoard = makeMove(state.board, move, state.rules as any);
      const updateId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      dispatch({
        type: "OPTIMISTIC_MOVE_PREVIEW",
        payload: {
          move,
          updateId,
          previewBoard,
        },
      });

      // Send the move through EventContext with server version when available
      const serverVersion = (() => {
        const v = (eventGameState as any)?.state?.version;
        // Use the current moveCount as version for the first move or when version is not available
        return typeof v === "number" ? v : state.moveCount;
      })();

      try {
        const success = await sendGameMove(move, serverVersion);

        if (!success) {
          // Only rollback if the move explicitly failed
          console.log("Move failed, rolling back optimistic update");
          dispatch({
            type: "OPTIMISTIC_MOVE_ROLLBACK",
            payload: { updateId },
          });
        }
        // If successful, the server confirmation will override the optimistic update
        // through the SERVER_STATE_OVERRIDE action

        return success;
      } catch (error) {
        console.error("Error sending move:", error);
        // Rollback on error
        dispatch({
          type: "OPTIMISTIC_MOVE_ROLLBACK",
          payload: { updateId },
        });
        return false;
      }
    },
    [
      state.gameId,
      state.board,
      state.rules,
      state.moveCount,
      isConnected,
      sendGameMove,
      dispatch,
      (eventGameState as any)?.state?.version,
    ],
  );

  // Process any queued moves when reconnected (using syncState.moveQueue.pending)
  useEffect(() => {
    const pending = state.syncState?.moveQueue?.pending ?? [];
    if (isConnected && pending.length > 0) {
      const processQueue = async () => {
        for (const queuedMove of pending) {
          await sendMove(queuedMove);
        }
        // Clear pending queue
        const currentMoveQueue = state.syncState?.moveQueue ?? {
          offline: [],
          retry: [],
          pending: [],
        };
        dispatch({
          type: "SYNC_STATE_UPDATE",
          payload: {
            moveQueue: { ...currentMoveQueue, pending: [] },
          } as any,
        });
      };
      void processQueue();
    }
  }, [
    isConnected,
    state.syncState?.moveQueue?.pending,
    sendMove,
    dispatch,
    state.syncState?.moveQueue,
  ]);

  return {
    isConnected,
    isReconnecting,
    connectionError,
    sendMove,
    reconnect,
  };
}
