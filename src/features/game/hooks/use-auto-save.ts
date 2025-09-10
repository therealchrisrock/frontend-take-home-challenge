import { useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { useGame } from "../state/game-context";

export function useAutoSave() {
  const { state } = useGame();
  const saveMutation = api.game.save.useMutation();
  const lastSavedMoveCount = useRef(state.moveCount);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save game state whenever a move is made
  useEffect(() => {
    // Don't save if:
    // - No gameId (local game without persistence)
    // - No actual moves made yet
    // - Move count hasn't changed
    // - We're viewing history (not at the latest move)
    if (
      !state.gameId ||
      state.moveCount === 0 ||
      state.moveCount === lastSavedMoveCount.current ||
      state.isViewingHistory
    ) {
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save by 500ms to avoid too many requests
    saveTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate(
        {
          id: state.gameId,
          board: state.board,
          currentPlayer: state.currentPlayer,
          moveCount: state.moveCount,
          gameMode: state.gameMode,
          winner: state.winner,
          moves: state.moveHistory,
        },
        {
          onSuccess: () => {
            lastSavedMoveCount.current = state.moveCount;
            console.log("Game auto-saved");
          },
          onError: (error) => {
            console.error("Failed to auto-save game:", error);
          },
        },
      );
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    state.gameId,
    state.board,
    state.currentPlayer,
    state.moveCount,
    state.gameMode,
    state.winner,
    state.moveHistory,
    state.isViewingHistory,
    saveMutation,
  ]);

  // Save immediately when game ends
  useEffect(() => {
    if (state.gameId && state.winner) {
      saveMutation.mutate({
        id: state.gameId,
        board: state.board,
        currentPlayer: state.currentPlayer,
        moveCount: state.moveCount,
        gameMode: state.gameMode,
        winner: state.winner,
        moves: state.moveHistory,
      });
    }
  }, [state.winner, state.gameId]);

  return {
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}
