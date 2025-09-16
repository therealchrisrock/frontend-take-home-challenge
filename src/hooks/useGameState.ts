/**
 * useGameState Hook
 * 
 * Specialized hook for accessing game state from EventContext.
 * Provides filtered access to specific game state and game-related actions.
 */

import { useMemo } from 'react';
import { useEventContext } from '~/contexts/event-context';

/**
 * Get state for a specific game
 */
export function useGameState(gameId?: string) {
  const context = useEventContext();
  
  const gameState = useMemo(() => {
    if (!gameId) return null;
    return context.activeGames.get(gameId) ?? null;
  }, [context.activeGames, gameId]);
  
  return {
    gameState,
    makeMove: (move: any) => gameId ? context.makeGameMove(gameId, move) : Promise.resolve(),
  };
}

/**
 * Get all active games
 */
export function useActiveGames() {
  const context = useEventContext();
  
  const games = useMemo(() => {
    return Array.from(context.activeGames.entries()).map(([id, state]) => ({
      id,
      ...state,
    }));
  }, [context.activeGames]);
  
  return {
    games,
    totalGames: games.length,
  };
}

/**
 * Get game invites
 */
export function useGameInvites() {
  const context = useEventContext();
  
  return {
    invites: context.gameInvites,
    acceptInvite: context.acceptGameInvite,
    declineInvite: context.declineGameInvite,
  };
}