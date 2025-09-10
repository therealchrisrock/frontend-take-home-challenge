import { useCallback, useMemo } from 'react';
import { getMustCapturePositions, getValidMoves, makeMove, type Move, type Position } from '~/lib/game-logic';
import { checkWinner } from '~/lib/game-logic';
import { useGame } from '../state/game-context';

export function useMustCapture() {
  const { state, dispatch } = useGame();

  const mustCapturePositions = useMemo(() => {
    return getMustCapturePositions(state.board, state.currentPlayer, state.rules);
  }, [state.board, state.currentPlayer, state.rules]);

  const handleMove = useCallback((move: Move) => {
    const newBoard = makeMove(state.board, move, state.rules);
    // Pass draw state to check for draw conditions after the move is applied
    // Note: The draw state will be updated in the reducer after this move
    const winner = checkWinner(newBoard, state.rules, state.drawState);
    dispatch({ type: 'APPLY_MOVE', payload: { newBoard, move, winner } });
  }, [dispatch, state.board, state.rules, state.drawState]);

  const onSquareClick = useCallback((position: Position, event?: React.MouseEvent) => {
    const piece = state.board[position.row]?.[position.col];
    if (state.selectedPosition) {
      const move = state.validMoves.find(
        m => m.to.row === position.row && m.to.col === position.col
      );
      if (move) {
        handleMove(move);
      } else if (piece?.color === state.currentPlayer) {
        const moves = getValidMoves(state.board, position, state.currentPlayer, state.rules);
        dispatch({ type: 'SET_SELECTED', payload: position });
        dispatch({ type: 'SET_VALID_MOVES', payload: moves });
      } else {
        dispatch({ type: 'SET_SELECTED', payload: null });
        dispatch({ type: 'SET_VALID_MOVES', payload: [] });
      }
    } else if (piece?.color === state.currentPlayer) {
      // Enforce mandatory capture only if variant requires it
      if (state.rules.capture.mandatory && mustCapturePositions.length > 0) {
        const canThisCapture = mustCapturePositions.some(p => p.row === position.row && p.col === position.col);
        const firstCapture = mustCapturePositions[0];
        if (!canThisCapture && firstCapture) {
          const moves = getValidMoves(state.board, firstCapture, state.currentPlayer, state.rules);
          dispatch({ type: 'SET_SELECTED', payload: firstCapture });
          dispatch({ type: 'SET_VALID_MOVES', payload: moves });
          return;
        }
      }
      const moves = getValidMoves(state.board, position, state.currentPlayer, state.rules);
      dispatch({ type: 'SET_SELECTED', payload: position });
      dispatch({ type: 'SET_VALID_MOVES', payload: moves });
    }
  }, [state.board, state.selectedPosition, state.validMoves, state.currentPlayer, state.rules, mustCapturePositions, handleMove, dispatch]);

  const onDragStart = useCallback((position: Position) => {
    const piece = state.board[position.row]?.[position.col];
    if (piece?.color === state.currentPlayer) {
      const moves = getValidMoves(state.board, position, state.currentPlayer, state.rules);
      dispatch({ type: 'SET_SELECTED', payload: position });
      dispatch({ type: 'SET_DRAGGING', payload: position });
      dispatch({ type: 'SET_VALID_MOVES', payload: moves });
    }
  }, [state.board, state.currentPlayer, state.rules, dispatch]);

  const onDrop = useCallback((position: Position) => {
    if (state.selectedPosition) {
      const move = state.validMoves.find(
        m => m.to.row === position.row && m.to.col === position.col
      );
      if (move) {
        handleMove(move);
      }
    }
  }, [state.selectedPosition, state.validMoves, handleMove]);

  return { mustCapturePositions, onSquareClick, onDragStart, onDrop };
}

