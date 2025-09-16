import { useCallback, useEffect, useState } from "react";
import { useGameState } from "~/contexts/event-context";
import { api } from "~/trpc/react";
import type { Move, Board, PieceColor } from "~/lib/game/logic";

export interface MultiplayerGameState {
  gameId: string;
  isConnected: boolean;
  connectionError: string | null;
  isReconnecting: boolean;
  offlineMoveQueue: Move[];
  playerRole: 'PLAYER_1' | 'PLAYER_2' | 'SPECTATOR';
  playerColor: PieceColor | null;
  opponentConnected: boolean;
  spectatorCount: number;
  gameMode: 'online';
  boardOrientation: 'normal' | 'flipped';
  ping: number | null;
  lastSyncTime: number | null;
}

export interface MultiplayerGameActions {
  sendMove: (move: Move, gameState?: { board: Board; currentPlayer: PieceColor; moveCount: number }) => Promise<boolean>;
  reconnect: () => Promise<void>;
  leaveGame: () => void;
  joinAsSpectator: () => Promise<void>;
  promoteFromSpectator: () => Promise<void>;
}

export interface UseMultiplayerGameOptions {
  gameId: string;
  userId?: string;
  enabled?: boolean;
  onOpponentMove?: (move: Move, gameState: unknown) => void;
  onPlayerJoined?: (playerId: string, role: string) => void;
  onPlayerLeft?: (playerId: string) => void;
  onSpectatorCountChanged?: (count: number) => void;
}

/**
 * Enhanced multiplayer game hook that provides real-time multiplayer functionality
 * Now uses EventContext for all real-time synchronization
 */
export function useMultiplayerGame(options: UseMultiplayerGameOptions) {
  const {
    gameId,
    userId,
    enabled = true,
    onOpponentMove,
    onPlayerJoined: _onPlayerJoined,
    onPlayerLeft: _onPlayerLeft,
    onSpectatorCountChanged: _onSpectatorCountChanged,
  } = options;

  // Use EventContext for real-time game sync
  const { 
    gameState: eventGameState, 
    isConnected, 
    isReconnecting, 
    connectionError,
    sendMove: sendGameMove,
    reconnect: reconnectGame,
  } = useGameState(enabled ? gameId : undefined);

  // Fetch initial game data
  const { data: gameData } = api.multiplayerGame.getGameState.useQuery(
    { gameId },
    { enabled: enabled && !!gameId }
  );

  // Local state for multiplayer-specific features
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [offlineMoveQueue, setOfflineMoveQueue] = useState<Move[]>([]);
  const [lastPingTime] = useState<number | null>(null);

  // Determine player role and color
  const playerRole: 'PLAYER_1' | 'PLAYER_2' | 'SPECTATOR' = 
    gameData?.player1Id === userId ? 'PLAYER_1' :
    gameData?.player2Id === userId ? 'PLAYER_2' : 
    'SPECTATOR';

  const playerColor: PieceColor | null = 
    playerRole === 'PLAYER_1' ? 'red' :
    playerRole === 'PLAYER_2' ? 'black' : 
    null;

  const boardOrientation = playerRole === 'PLAYER_2' ? 'flipped' as const : 'normal' as const;
  
  // Determine if opponent is connected (simplified for now)
  const opponentConnected = isConnected && gameData?.player2Id != null;

  // Handle opponent moves from EventContext
  useEffect(() => {
    if (!eventGameState?.lastMove || !onOpponentMove) return;
    
    // Only trigger for opponent moves
    const movePlayer = eventGameState.currentPlayer === 'red' ? gameData?.player2Id : gameData?.player1Id;
    if (movePlayer !== userId) {
      onOpponentMove(eventGameState.lastMove, eventGameState.state);
    }
  }, [eventGameState?.lastMove, eventGameState?.state, eventGameState?.currentPlayer, userId, gameData, onOpponentMove]);

  // Enhanced sendMove that handles offline queue
  const sendMove = useCallback(
    async (move: Move, gameState?: { board: Board; currentPlayer: PieceColor; moveCount: number }) => {
      if (!isConnected) {
        // Queue move for later when reconnected
        setOfflineMoveQueue(prev => [...prev, move]);
        return true; // Optimistically return success
      }

      const success = await sendGameMove(move);
      
      if (!success && gameState) {
        // Failed to send, queue for retry
        setOfflineMoveQueue(prev => [...prev, move]);
      }
      
      return success;
    },
    [isConnected, sendGameMove]
  );

  // Process offline queue when reconnected
  useEffect(() => {
    if (isConnected && offlineMoveQueue.length > 0) {
      const processQueue = async () => {
        const queue = [...offlineMoveQueue];
        setOfflineMoveQueue([]);
        
        for (const move of queue) {
          const success = await sendGameMove(move);
          if (!success) {
            // Re-queue failed moves
            setOfflineMoveQueue(prev => [...prev, move]);
            break;
          }
        }
      };
      
      void processQueue();
    }
  }, [isConnected, offlineMoveQueue, sendGameMove]);

  const reconnect = useCallback(async () => {
    await reconnectGame();
  }, [reconnectGame]);

  const leaveGame = useCallback(() => {
    // TODO: Implement leave game functionality
    console.log("Leaving game", gameId);
  }, [gameId]);

  const joinAsSpectator = useCallback(async () => {
    // TODO: Implement spectator mode
    console.log("Joining as spectator", gameId);
  }, [gameId]);

  const promoteFromSpectator = useCallback(async () => {
    // TODO: Implement promotion from spectator
    console.log("Promoting from spectator", gameId);
  }, [gameId]);

  const state: MultiplayerGameState = {
    gameId,
    isConnected,
    connectionError,
    isReconnecting,
    offlineMoveQueue,
    playerRole,
    playerColor,
    opponentConnected,
    spectatorCount,
    gameMode: 'online',
    boardOrientation,
    ping: lastPingTime,
    lastSyncTime: eventGameState?.lastUpdate ?? null,
  };

  const actions: MultiplayerGameActions = {
    sendMove,
    reconnect,
    leaveGame,
    joinAsSpectator,
    promoteFromSpectator,
  };

  return [state, actions] as const;
}