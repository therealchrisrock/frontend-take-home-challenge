"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { GameMove, GameState } from "../lib/game/state/game-types";
import { useMultiplayerSync, type MultiplayerSyncState, type MultiplayerSyncHook } from "../hooks/useMultiplayerSync";

export interface MultiplayerGameSession {
  gameId: string;
  playerId: string;
  playerRole: "player1" | "player2" | "spectator";
  playerColor: "red" | "black" | null;
  isHost: boolean;
  isGuest: boolean;
  guestId?: string;
}

export interface MultiplayerContextValue {
  // Session info
  session: MultiplayerGameSession | null;
  isMultiplayer: boolean;
  
  // Sync state and methods
  syncState: MultiplayerSyncState;
  queueMove: (move: GameMove) => Promise<void>;
  forceSyncQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  testConnection: () => Promise<{ success: boolean; latency: number; error?: string }>;
  
  // Game state management
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  
  // Event handlers
  onMoveReceived: (handler: (move: GameMove, state: GameState) => void) => void;
  onConflictResolved: (handler: (resolvedState: GameState) => void) => void;
  onConnectionChange: (handler: (isConnected: boolean, quality: string) => void) => void;
  onSyncError: (handler: (error: string) => void) => void;
  
  // Connection utilities
  getConnectionIndicator: () => "🟢" | "🟡" | "🔴";
  getConnectionSummary: () => string;
  
  // Session management
  initializeSession: (session: MultiplayerGameSession) => void;
  clearSession: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextValue | null>(null);

export interface MultiplayerProviderProps {
  children: ReactNode;
  defaultSession?: MultiplayerGameSession;
}

export function MultiplayerProvider({ children, defaultSession }: MultiplayerProviderProps) {
  const [session, setSession] = useState<MultiplayerGameSession | null>(defaultSession || null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [eventHandlers, setEventHandlers] = useState<{
    onMoveReceived?: (move: GameMove, state: GameState) => void;
    onConflictResolved?: (resolvedState: GameState) => void;
    onConnectionChange?: (isConnected: boolean, quality: string) => void;
    onSyncError?: (error: string) => void;
  }>({});

  // Initialize multiplayer sync only when we have a session
  const multiplayerSync = useMultiplayerSync(
    session?.gameId || "",
    session?.playerId || "",
    {
      maxRetries: 3,
      retryDelay: 5000,
      heartbeatInterval: 30000,
      syncTimeout: 10000,
    }
  );

  // Set up event handlers when they change
  useEffect(() => {
    if (multiplayerSync && session) {
      multiplayerSync.onMoveSync = eventHandlers.onMoveReceived;
      multiplayerSync.onConflictResolved = eventHandlers.onConflictResolved;
      multiplayerSync.onConnectionChange = eventHandlers.onConnectionChange;
      multiplayerSync.onSyncError = eventHandlers.onSyncError;
    }
  }, [multiplayerSync, session, eventHandlers]);

  // Default conflict resolution handler
  useEffect(() => {
    if (multiplayerSync && session && !eventHandlers.onConflictResolved) {
      multiplayerSync.onConflictResolved = (resolvedState: GameState) => {
        setGameState(resolvedState);
        console.log("Conflict resolved, game state updated");
      };
    }
  }, [multiplayerSync, session, eventHandlers.onConflictResolved]);

  // Default move sync handler
  useEffect(() => {
    if (multiplayerSync && session && !eventHandlers.onMoveReceived) {
      multiplayerSync.onMoveSync = (move: GameMove, state: GameState) => {
        setGameState(state);
        console.log("Move synced from server:", move);
      };
    }
  }, [multiplayerSync, session, eventHandlers.onMoveReceived]);

  // Enhanced move queuing with optimistic updates
  const queueMove = async (move: GameMove): Promise<void> => {
    if (!session || !multiplayerSync) {
      throw new Error("No active multiplayer session");
    }

    // Apply move optimistically to local state
    if (gameState) {
      // This would typically use the game engine to apply the move
      // For now, we'll just update the state and let the sync handle conflicts
      // setGameState(applyMoveToState(gameState, move));
    }

    // Queue the move for server sync
    await multiplayerSync.queueMove(move);
  };

  // Connection status utilities
  const getConnectionIndicator = (): "🟢" | "🟡" | "🔴" => {
    if (!session) return "🔴";
    
    const { syncState } = multiplayerSync;
    
    if (!syncState.isConnected) return "🔴";
    if (syncState.hasQueuedMoves || syncState.isSyncing) return "🟡";
    if (syncState.connectionQuality === "poor") return "🟡";
    
    return "🟢";
  };

  const getConnectionSummary = (): string => {
    if (!session) return "Not connected";
    
    const { syncState } = multiplayerSync;
    
    if (!syncState.isConnected) {
      return "Disconnected - moves queued for sync";
    }
    
    const parts: string[] = [];
    
    // Connection quality
    parts.push(`${syncState.connectionQuality} connection`);
    
    // Latency
    if (syncState.latency > 0) {
      parts.push(`${syncState.latency}ms`);
    }
    
    // Queue status
    if (syncState.hasQueuedMoves) {
      const moveCount = syncState.queueStats?.totalMoves || 0;
      parts.push(`${moveCount} move${moveCount !== 1 ? 's' : ''} queued`);
    }
    
    // Sync status
    if (syncState.isSyncing) {
      parts.push("syncing...");
    }
    
    return parts.join(", ");
  };

  // Session management
  const initializeSession = (newSession: MultiplayerGameSession) => {
    setSession(newSession);
    setGameState(null); // Clear previous game state
    
    console.log("Multiplayer session initialized:", {
      gameId: newSession.gameId,
      playerId: newSession.playerId,
      playerRole: newSession.playerRole,
      isGuest: newSession.isGuest,
    });
  };

  const clearSession = () => {
    setSession(null);
    setGameState(null);
    setEventHandlers({});
    
    console.log("Multiplayer session cleared");
  };

  // Event handler registration
  const onMoveReceived = (handler: (move: GameMove, state: GameState) => void) => {
    setEventHandlers(prev => ({ ...prev, onMoveReceived: handler }));
  };

  const onConflictResolved = (handler: (resolvedState: GameState) => void) => {
    setEventHandlers(prev => ({ ...prev, onConflictResolved: handler }));
  };

  const onConnectionChange = (handler: (isConnected: boolean, quality: string) => void) => {
    setEventHandlers(prev => ({ ...prev, onConnectionChange: handler }));
  };

  const onSyncError = (handler: (error: string) => void) => {
    setEventHandlers(prev => ({ ...prev, onSyncError: handler }));
  };

  const value: MultiplayerContextValue = {
    // Session info
    session,
    isMultiplayer: !!session,
    
    // Sync state and methods
    syncState: multiplayerSync?.syncState || {
      isConnected: false,
      connectionStatus: "disconnected",
      connectionQuality: "excellent",
      latency: 0,
      queueStats: null,
      hasQueuedMoves: false,
      isSyncing: false,
      lastSyncError: null,
    },
    queueMove,
    forceSyncQueue: multiplayerSync?.forceSyncQueue || (async () => {}),
    clearQueue: multiplayerSync?.clearQueue || (async () => {}),
    testConnection: multiplayerSync?.testConnection || (async () => ({ success: false, latency: 0, error: "Not initialized" })),
    
    // Game state management
    gameState,
    setGameState,
    
    // Event handlers
    onMoveReceived,
    onConflictResolved,
    onConnectionChange,
    onSyncError,
    
    // Connection utilities
    getConnectionIndicator,
    getConnectionSummary,
    
    // Session management
    initializeSession,
    clearSession,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer(): MultiplayerContextValue {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider");
  }
  return context;
}

// Convenience hook for checking multiplayer status
export function useIsMultiplayer(): boolean {
  const { isMultiplayer } = useMultiplayer();
  return isMultiplayer;
}

// Convenience hook for connection status
export function useConnectionStatus() {
  const { syncState, getConnectionIndicator, getConnectionSummary } = useMultiplayer();
  
  return {
    isConnected: syncState.isConnected,
    connectionStatus: syncState.connectionStatus,
    connectionQuality: syncState.connectionQuality,
    latency: syncState.latency,
    hasQueuedMoves: syncState.hasQueuedMoves,
    isSyncing: syncState.isSyncing,
    indicator: getConnectionIndicator(),
    summary: getConnectionSummary(),
  };
}

// Convenience hook for queue status
export function useQueueStatus() {
  const { syncState, clearQueue, forceSyncQueue } = useMultiplayer();
  
  return {
    stats: syncState.queueStats,
    hasQueuedMoves: syncState.hasQueuedMoves,
    isSyncing: syncState.isSyncing,
    lastError: syncState.lastSyncError,
    clearQueue,
    forceSyncQueue,
  };
}

export default MultiplayerProvider;