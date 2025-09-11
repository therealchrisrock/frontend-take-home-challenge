"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
}

export interface MultiplayerGameActions {
  sendMove: (move: Move, gameState?: { board: Board; currentPlayer: PieceColor; moveCount: number }) => Promise<boolean>;
  reconnect: () => Promise<void>;
  leaveGame: () => void;
  toggleSpectatorMode: () => void;
}

interface MultiplayerGameContext {
  state: MultiplayerGameState;
  actions: MultiplayerGameActions;
}

const MultiplayerGameContext = createContext<MultiplayerGameContext | null>(null);

export function useMultiplayerGame() {
  const context = useContext(MultiplayerGameContext);
  if (!context) {
    throw new Error("useMultiplayerGame must be used within MultiplayerGameProvider");
  }
  return context;
}

interface MultiplayerGameProviderProps {
  gameId: string;
  userId?: string;
  children: React.ReactNode;
}

export function MultiplayerGameProvider({ 
  gameId, 
  userId,
  children 
}: MultiplayerGameProviderProps) {
  const [gameState, setGameState] = useState<MultiplayerGameState>({
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
    boardOrientation: 'normal'
  });

  // Get game data to determine player role
  const { data: gameData } = api.game.getById.useQuery(
    { id: gameId },
    { 
      enabled: !!gameId,
      refetchOnWindowFocus: false
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

    setGameState(prev => ({
      ...prev,
      playerRole,
      playerColor,
      boardOrientation
    }));
  }, [gameData, userId]);

  // Handle opponent moves from game sync
  const handleOpponentMove = useCallback((_move: Move, _newGameState: unknown) => {
    // This will be handled by the parent GameProvider
    // We just need to track that opponent is connected
    setGameState(prev => ({
      ...prev,
      opponentConnected: true
    }));
  }, []);

  // Handle connection status changes
  const handleConnectionStatusChange = useCallback((connected: boolean) => {
    setGameState(prev => ({
      ...prev,
      isConnected: connected,
      connectionError: connected ? null : prev.connectionError
    }));
  }, []);

  // Use the existing game sync hook
  const [syncState, syncActions] = useGameSync({
    gameId,
    enabled: !!gameId,
    onOpponentMove: handleOpponentMove,
    onConnectionStatusChange: handleConnectionStatusChange
  });

  // Sync the game sync state with our state
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      isConnected: syncState.isConnected,
      connectionError: syncState.connectionError,
      isReconnecting: syncState.isReconnecting,
      offlineMoveQueue: syncState.offlineMoveQueue
    }));
  }, [syncState]);

  // Actions
  const sendMove = useCallback(async (
    move: Move, 
    gameState?: { board: Board; currentPlayer: PieceColor; moveCount: number }
  ) => {
    if (!gameState) return false;
    return await syncActions.sendMove(
      move, 
      gameState.board, 
      gameState.currentPlayer, 
      gameState.moveCount
    );
  }, [syncActions]);

  const reconnect = useCallback(async () => {
    await syncActions.connect();
  }, [syncActions]);

  const leaveGame = useCallback(() => {
    syncActions.disconnect();
  }, [syncActions]);

  const toggleSpectatorMode = useCallback(() => {
    // For now, this is a no-op since spectator mode logic 
    // will be implemented by Group 4
    console.log("Spectator mode toggle requested");
  }, []);

  const actions: MultiplayerGameActions = {
    sendMove,
    reconnect,
    leaveGame,
    toggleSpectatorMode
  };

  const contextValue: MultiplayerGameContext = {
    state: gameState,
    actions
  };

  return (
    <MultiplayerGameContext.Provider value={contextValue}>
      {children}
    </MultiplayerGameContext.Provider>
  );
}