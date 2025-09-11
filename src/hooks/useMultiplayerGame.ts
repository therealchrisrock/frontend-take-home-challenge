import { useCallback, useEffect, useState } from "react";
import { useGameSync } from "~/hooks/useGameSync";
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
 * Built on top of the existing useGameSync hook with additional multiplayer features
 */
export function useMultiplayerGame(options: UseMultiplayerGameOptions) {
  const {
    gameId,
    userId,
    enabled = true,
    onOpponentMove,
    onPlayerJoined: _onPlayerJoined,
    onPlayerLeft: _onPlayerLeft,
    onSpectatorCountChanged: _onSpectatorCountChanged
  } = options;

  const [multiplayerState, setMultiplayerState] = useState<MultiplayerGameState>({
    gameId,
    isConnected: false,
    connectionError: null,
    isReconnecting: false,
    offlineMoveQueue: [],
    playerRole: 'SPECTATOR',
    playerColor: null,
    opponentConnected: false,
    spectatorCount: 0,
    gameMode: 'online',
    boardOrientation: 'normal',
    ping: null,
    lastSyncTime: null
  });

  // Get game data to determine player role
  const { data: gameData, refetch: refetchGame } = api.game.getById.useQuery(
    { id: gameId },
    { 
      enabled: !!gameId && enabled,
      refetchOnWindowFocus: false,
      refetchInterval: 30000 // Refetch every 30 seconds to check for changes
    }
  );

  // Determine player role and board orientation
  useEffect(() => {
    if (!gameData || !userId) return;

    let playerRole: 'PLAYER_1' | 'PLAYER_2' | 'SPECTATOR' = 'SPECTATOR';
    let playerColor: PieceColor | null = null;
    let boardOrientation: 'normal' | 'flipped' = 'normal';

    if (gameData.player1Id === userId) {
      playerRole = 'PLAYER_1';
      playerColor = 'red'; // Player 1 is red
      boardOrientation = 'normal'; // Red pieces at bottom
    } else if (gameData.player2Id === userId) {
      playerRole = 'PLAYER_2';
      playerColor = 'black'; // Player 2 is black
      boardOrientation = 'flipped'; // Black pieces at bottom (board flipped)
    }

    setMultiplayerState(prev => ({
      ...prev,
      playerRole,
      playerColor,
      boardOrientation
    }));
  }, [gameData, userId]);

  // Handle multiplayer-specific events
  const handleMultiplayerEvent = useCallback((move: Move, gameState: unknown) => {
    // Update last sync time for ping calculation
    setMultiplayerState(prev => ({
      ...prev,
      lastSyncTime: Date.now(),
      opponentConnected: true
    }));

    // Forward to parent handler
    onOpponentMove?.(move, gameState);
  }, [onOpponentMove]);

  // Handle connection status changes with multiplayer context
  const handleConnectionStatusChange = useCallback((connected: boolean) => {
    setMultiplayerState(prev => ({
      ...prev,
      isConnected: connected,
      connectionError: connected ? null : prev.connectionError,
      ping: connected && prev.lastSyncTime ? Date.now() - prev.lastSyncTime : null
    }));
  }, []);

  // Use the existing game sync hook with multiplayer enhancements
  const [syncState, syncActions] = useGameSync({
    gameId,
    enabled: enabled && !!gameId,
    onOpponentMove: handleMultiplayerEvent,
    onConnectionStatusChange: handleConnectionStatusChange
  });

  // Sync the game sync state with our multiplayer state
  useEffect(() => {
    setMultiplayerState(prev => ({
      ...prev,
      isConnected: syncState.isConnected,
      connectionError: syncState.connectionError,
      isReconnecting: syncState.isReconnecting,
      offlineMoveQueue: syncState.offlineMoveQueue
    }));
  }, [syncState]);

  // Enhanced move sending with multiplayer context
  const sendMove = useCallback(async (
    move: Move, 
    gameState?: { board: Board; currentPlayer: PieceColor; moveCount: number }
  ) => {
    if (!gameState || multiplayerState.playerRole === 'SPECTATOR') {
      return false;
    }

    // Check if it's this player's turn
    if (multiplayerState.playerColor !== gameState.currentPlayer) {
      console.warn("Not your turn to move");
      return false;
    }

    const success = await syncActions.sendMove(
      move, 
      gameState.board, 
      gameState.currentPlayer, 
      gameState.moveCount
    );

    if (success) {
      setMultiplayerState(prev => ({
        ...prev,
        lastSyncTime: Date.now()
      }));
    }

    return success;
  }, [syncActions, multiplayerState.playerRole, multiplayerState.playerColor]);

  // Reconnect with multiplayer context
  const reconnect = useCallback(async () => {
    setMultiplayerState(prev => ({
      ...prev,
      isReconnecting: true
    }));
    
    try {
      await syncActions.connect();
      await refetchGame(); // Refresh game state on reconnect
    } catch (error) {
      console.error("Failed to reconnect:", error);
      setMultiplayerState(prev => ({
        ...prev,
        connectionError: "Failed to reconnect"
      }));
    }
  }, [syncActions, refetchGame]);

  // Leave game
  const leaveGame = useCallback(() => {
    syncActions.disconnect();
    setMultiplayerState(prev => ({
      ...prev,
      isConnected: false,
      opponentConnected: false
    }));
  }, [syncActions]);

  // Join as spectator (placeholder for when Group 4 implements spectator system)
  const joinAsSpectator = useCallback(async () => {
    console.log("Joining as spectator - to be implemented by Group 4");
    // This will be implemented when Group 4 completes spectator system
  }, []);

  // Promote from spectator to player (placeholder)
  const promoteFromSpectator = useCallback(async () => {
    console.log("Promoting from spectator - to be implemented by Group 4");
    // This will be implemented when Group 4 completes spectator system
  }, []);

  // Monitor ping by measuring round-trip time
  useEffect(() => {
    if (!multiplayerState.isConnected) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (multiplayerState.lastSyncTime) {
        const ping = now - multiplayerState.lastSyncTime;
        if (ping < 5000) { // Only update if recent
          setMultiplayerState(prev => ({
            ...prev,
            ping: Math.min(ping, 999) // Cap at 999ms for display
          }));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [multiplayerState.isConnected, multiplayerState.lastSyncTime]);

  const actions: MultiplayerGameActions = {
    sendMove,
    reconnect,
    leaveGame,
    joinAsSpectator,
    promoteFromSpectator
  };

  return {
    state: multiplayerState,
    actions,
    // Expose sync actions for advanced usage
    syncState,
    syncActions
  };
}