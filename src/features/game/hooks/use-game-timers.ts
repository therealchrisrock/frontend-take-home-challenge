import { useEffect, useRef } from 'react';
import { useTimer } from '~/hooks/useTimer';
import { useGame } from '../state/game-context';

export function useGameTimers() {
  const { state, dispatch } = useGame();
  const previousMoveCountRef = useRef(state.moveCount);
  const hasStartedRef = useRef(false);
  
  const timer = useTimer({
    timeControl: state.timeControl,
    onTimeExpired: (player) => {
      // When a player's time expires, the other player wins
      dispatch({ type: 'SET_WINNER', payload: player === 'red' ? 'black' : 'red' });
    },
    onTimeUpdate: () => {
      // Time update handled by timer hook internally
    }
  });

  // Handle game start and move transitions
  useEffect(() => {
    if (!state.timeControl || state.winner || state.isViewingHistory || state.isReviewMode) {
      return;
    }
    
    const currentMoveCount = state.moveCount;
    const previousMoveCount = previousMoveCountRef.current;
    
    // Game just started (first render with moveCount 0)
    if (currentMoveCount === 0 && !hasStartedRef.current) {
      hasStartedRef.current = true;
      timer.resetTimers();
      timer.startTimer('red');
    }
    // A move was made (moveCount increased)
    else if (currentMoveCount > previousMoveCount && previousMoveCount >= 0) {
      // Calculate who just moved based on move count
      // Even moves (0, 2, 4...) are red's moves, odd moves (1, 3, 5...) are black's moves
      const playerWhoJustMoved = previousMoveCount % 2 === 0 ? 'red' : 'black';
      
      // Add increment to the player who just moved
      if (state.timeControl.incrementSeconds > 0) {
        timer.addIncrement(playerWhoJustMoved);
      }
      
      // Start timer for the current player (who needs to move next)
      timer.startTimer(state.currentPlayer);
    }
    
    // Update ref for next comparison
    previousMoveCountRef.current = currentMoveCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moveCount, state.currentPlayer, state.timeControl, state.winner, state.isViewingHistory, state.isReviewMode]);

  // Stop timer when game ends or when viewing history
  useEffect(() => {
    if (state.winner || state.isViewingHistory || state.isReviewMode) {
      timer.stopTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.winner, state.isViewingHistory, state.isReviewMode]);

  // Reset when game is reset
  useEffect(() => {
    // Reset our tracking when a new game starts
    hasStartedRef.current = false;
    previousMoveCountRef.current = 0;
  }, [state.gameStartTime]);

  return timer;
}

