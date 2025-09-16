import React, { useCallback, useEffect } from "react";
import { useGameSyncEnhanced } from "~/hooks/useGameSyncEnhanced";
import type { Board, Move } from "~/lib/game/logic";
import { makeMove } from "~/lib/game/logic";
import { api } from "~/trpc/react";
import { useGame } from "../state/game-context";

export function useOnlineSyncEnhanced() {
  const { state, dispatch } = useGame();

  const enabled = state.gameMode === "online" && !!state.gameId;
  const joinGame = api.multiplayerGame.joinGame.useMutation();
  const hasJoinedRef = React.useRef(false as boolean);

  // Enhanced conflict detection callback
  const handleConflictDetected = useCallback(
    (conflictData: {
      serverBoard: Board;
      localBoard: Board;
      serverMoveCount: number;
      localMoveCount: number;
    }) => {
      console.warn("Sync conflict detected:", conflictData);

      // Dispatch conflict resolution action to game state
      dispatch({
        type: "CONFLICT_RESOLUTION",
        payload: {
          strategy: "server-wins", // Default to server wins for now
          conflictData,
        },
      });
    },
    [dispatch],
  );

  const [syncState, syncActions] = useGameSyncEnhanced({
    gameId: state.gameId,
    enabled,
    onOpponentMove: (move: Move | null, newGameState: unknown) => {
      // Check if this is a draw event
      const raw: any = newGameState;
      if (raw?.type === "DRAW_REQUEST") {
        dispatch({
          type: "SYNC_DRAW_REQUEST",
          payload: { requestedBy: raw.requestedBy },
        });
        return;
      } else if (raw?.type === "DRAW_ACCEPTED") {
        dispatch({
          type: "SYNC_DRAW_ACCEPTED",
          payload: { acceptedBy: raw.acceptedBy },
        });
        return;
      } else if (raw?.type === "DRAW_DECLINED") {
        dispatch({
          type: "SYNC_DRAW_DECLINED",
          payload: { declinedBy: raw.declinedBy },
        });
        return;
      }

      // Otherwise handle as a normal move
      // Normalize server payloads. Server may send as { data: { gameState } } or flat state
      const gameData: any = (raw as any)?.gameState ?? raw;
      let board: Board;
      try {
        board =
          typeof gameData.board === "string"
            ? (JSON.parse(gameData.board) as Board)
            : (gameData.board as Board);
      } catch {
        return; // ignore malformed payload
      }
      const currentPlayer = gameData.currentPlayer as "red" | "black";
      const moveCount = Number(gameData.moveCount ?? 0);
      const winner = (gameData.winner ?? null) as "red" | "black" | "draw" | null;

      // Don't update if user is viewing history
      if (state.isViewingHistory) {
        return;
      }

      // Ignore stale snapshots (server behind local optimistic state)
      if (moveCount < state.moveCount) {
        return;
      }

      // Prevent update loops: only dispatch when the snapshot advances
      if (
        moveCount === state.moveCount &&
        currentPlayer === state.currentPlayer &&
        winner === state.winner
      ) {
        return;
      }

      // Update game state only - sync state is managed independently
      dispatch({
        type: "SERVER_STATE_OVERRIDE",
        payload: {
          board,
          currentPlayer,
          moveCount,
          winner,
        },
      });
    },
    onConnectionStatusChange: (connected: boolean) => {
      console.log(`Enhanced game sync connection status: ${connected}`);
      console.log(`Reducer connection status: ${syncState.connection.status}`);
      console.log(
        `isConnected computed value: ${syncState.connection.status === "connected"}`,
      );
      // Sync state is managed independently - no dispatch needed
    },
    onConflictDetected: handleConflictDetected,
  });

  // Ensure we join the multiplayer game to claim a player slot before sending moves
  useEffect(() => {
    if (!enabled || !state.gameId || hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    void joinGame.mutateAsync({ gameId: state.gameId }).catch((err) => {
      console.warn("Join game failed (non-fatal):", err);
      hasJoinedRef.current = false; // allow retry on next effect
    });
  }, [enabled, state.gameId, joinGame]);

  // Enhanced move sending with optimistic updates
  const sendMoveWithOptimisticUpdate = useCallback(
    async (move: Move): Promise<boolean> => {
      if (!state.gameId || !enabled) return false;

      try {
        // Create optimistic update ID
        const optimisticId = syncActions.createOptimisticUpdate(
          move,
          state.board,
          state.currentPlayer,
          state.moveCount,
        );

        // Apply optimistic move preview to game state
        const previewBoard = makeMove(state.board, move, state.rules);

        dispatch({
          type: "OPTIMISTIC_MOVE_PREVIEW",
          payload: {
            move,
            updateId: optimisticId,
            previewBoard,
          },
        });

        // Send move through enhanced sync
        const success = await syncActions.sendMove(
          move,
          state.board,
          state.currentPlayer,
          state.moveCount,
        );

        if (!success) {
          // Rollback optimistic update if send failed
          dispatch({
            type: "OPTIMISTIC_MOVE_ROLLBACK",
            payload: { updateId: optimisticId },
          });
        }

        return success;
      } catch (error) {
        console.error("Failed to send move with optimistic update:", error);
        return false;
      }
    },
    [state, syncActions, dispatch, enabled],
  );

  // Note: Removed the useEffect that was causing infinite loops
  // The syncState is now managed independently and accessed directly

  // Fallback polling when SSE is not connected
  const { data: polledState } = api.multiplayerGame.getGameState.useQuery(
    { gameId: state.gameId as string },
    {
      enabled:
        enabled &&
        syncState.connection.status !== "connected" &&
        !!state.gameId,
      refetchOnWindowFocus: false,
      refetchInterval: 2000,
    },
  );

  // Handle polled data with enhanced conflict detection
  useEffect(() => {
    if (!polledState || !enabled) return;

    // Don't update if user is viewing history
    if (state.isViewingHistory) {
      return;
    }

    // Check for conflicts between polled state and current state
    const serverMoveCount = polledState.moveCount;
    const localMoveCount = state.moveCount;

    // Ignore stale polls (server behind local optimistic state)
    if (serverMoveCount < localMoveCount) {
      return;
    }

    // Prevent update loops: only dispatch when the snapshot advances
    if (
      polledState.moveCount === state.moveCount &&
      polledState.currentPlayer === state.currentPlayer &&
      polledState.winner === state.winner
    ) {
      return;
    }

    try {
      const board =
        typeof polledState.board === "string"
          ? (JSON.parse(polledState.board) as Board)
          : (polledState.board as unknown as Board);

      dispatch({
        type: "SERVER_STATE_OVERRIDE",
        payload: {
          board,
          currentPlayer: polledState.currentPlayer,
          moveCount: polledState.moveCount,
          winner: polledState.winner,
        },
      });
    } catch (error) {
      console.error("Failed to process polled state:", error);
    }
  }, [
    polledState,
    state.moveCount,
    state.currentPlayer,
    state.winner,
    state.board,
    state.isViewingHistory,
    syncState,
    dispatch,
    enabled,
    handleConflictDetected,
  ]);

  return {
    enabled,
    canMoveThisTab: true, // Always allow moves - conflict resolution handles issues
    syncState,
    syncActions,
    sendMoveWithOptimisticUpdate,
    isConnected: syncState.connection.status === "connected",
    isReconnecting: syncState.connection.status === "reconnecting",
    hasOptimisticUpdates: syncState.optimistic.pendingCount > 0,
    hasQueuedMoves:
      syncState.moveQueue.offline.length + syncState.moveQueue.retry.length > 0,
    isInConflictResolution: syncState.sync.isProcessingConflict,
  } as const;
}
