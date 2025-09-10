import { useEffect, useMemo } from 'react';
import { useGame } from '../state/game-context';
import { useMultiTabSync } from '~/hooks/useMultiTabSync';
import type { InitialStatePayload, MoveAppliedPayload } from '~/lib/multi-tab/types';
import type { Board } from '~/lib/game-logic';

export function useOnlineSync() {
  const { state, dispatch } = useGame();

  const enabled = state.gameMode === 'online' && !!state.gameId;
  const [syncState, syncActions] = useMultiTabSync({
    gameId: state.gameId,
    onGameStateUpdate: (payload: InitialStatePayload) => {
      dispatch({ type: 'LOAD_SNAPSHOT', payload: {
        board: payload.board as Board,
        currentPlayer: payload.currentPlayer,
        moveCount: payload.moveCount,
        winner: payload.winner,
        gameStartTime: new Date(payload.gameStartTime),
      }});
    },
    onMoveApplied: (payload: MoveAppliedPayload) => {
      dispatch({ type: 'LOAD_SNAPSHOT', payload: {
        board: payload.newGameState.board as Board,
        currentPlayer: payload.newGameState.currentPlayer,
        moveCount: payload.newGameState.moveCount,
        winner: payload.newGameState.winner,
      }});
    },
    onTabStatusUpdate: () => {
      // Tab status updates handled elsewhere
    },
    onConnectionStatusChange: () => {
      // Connection status updates handled elsewhere
    },
  });

  useEffect(() => {
    if (!enabled) return;
    syncActions.connect().catch(() => {
      // Connection errors handled by sync layer
    });
    return () => { syncActions.disconnect(); };
  }, [enabled, syncActions]);

  const canMoveThisTab = useMemo(() => {
    if (!enabled) return true;
    return !!syncState.isActiveTab;
  }, [enabled, syncState.isActiveTab]);

  return { enabled, canMoveThisTab, syncState, syncActions } as const;
}

