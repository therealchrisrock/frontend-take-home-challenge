import { useEffect, useMemo } from "react";
import { CheckersAI } from "~/lib/game/ai-engine";
import { makeMove, checkWinner } from "~/lib/game/logic";
import { useGame } from "../state/game-context";

export function useAI() {
  const { state, dispatch } = useGame();
  const engine = useMemo(
    () => new CheckersAI({ difficulty: "medium" }, state.rules),
    [state.rules],
  );

  useEffect(() => {
    if (state.gameMode !== "ai") return;
    const aiColor = state.playerColor === "red" ? "black" : "red";
    if (state.currentPlayer !== aiColor) return;
    if (state.winner || state.isViewingHistory || state.isReviewMode) return;
    if (state.isAIThinking) return; // Prevent re-triggering while AI is already thinking

    let cancelled = false;
    const think = async () => {
      dispatch({ type: "SET_AI_THINKING", payload: true });
      await new Promise((r) => setTimeout(r, 150));
      engine.setDifficulty(state.aiDifficulty);
      const aiMove = await engine.getBestMove(
        state.board,
        aiColor,
        state.moveCount,
      );
      if (cancelled || !aiMove) {
        if (!cancelled) {
          dispatch({ type: "SET_AI_THINKING", payload: false });
        }
        return;
      }
      const newBoard = makeMove(state.board, aiMove, state.rules);
      const winner = checkWinner(newBoard, state.rules, state.drawState);
      dispatch({
        type: "APPLY_MOVE",
        payload: { newBoard, move: aiMove, winner },
      });
      dispatch({ type: "SET_AI_THINKING", payload: false });
    };
    void think();

    return () => {
      cancelled = true;
      // Don't dispatch in cleanup - let the next render handle it
    };
  }, [
    state.board,
    state.currentPlayer,
    state.gameMode,
    state.winner,
    state.isViewingHistory,
    state.isReviewMode,
    state.aiDifficulty,
    state.moveCount,
    state.rules,
    state.playerColor,
    state.drawState,
    state.isAIThinking,
    dispatch,
    engine,
  ]);
}
