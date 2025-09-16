import { useEffect } from "react";
import { checkWinner } from "~/lib/game/logic";
import { useGame } from "../state/game-context";

/**
 * Hook that checks for winners at the start of each player's turn.
 * This ensures both players get equal opportunity to make moves before the game ends.
 */
export function useTurnWinnerCheck() {
  const { state, dispatch } = useGame();

  useEffect(() => {
    // Don't check winner if:
    // - Game already has a winner
    // - User is viewing history
    // - In review mode
    // - AI is currently thinking (wait for AI move to complete)
    if (
      state.winner ||
      state.isViewingHistory ||
      state.isReviewMode ||
      state.isAIThinking
    ) {
      return;
    }

    // Check for winner at the start of the current player's turn
    const winner = checkWinner(state.board, state.rules, state.drawState);
    
    if (winner) {
      dispatch({ type: "SET_WINNER", payload: winner });
    }
  }, [
    state.board,
    state.currentPlayer, // Check when turn changes
    state.rules,
    state.drawState,
    state.winner,
    state.isViewingHistory,
    state.isReviewMode,
    state.isAIThinking,
    dispatch,
  ]);
}