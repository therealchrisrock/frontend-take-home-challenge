"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type GameStorageAdapter,
  type PersistedGameState,
  type StorageType,
  createStorageAdapter,
  DEFAULT_GAME_ID,
  STORAGE_VERSION,
} from "~/lib/storage";
import { type Board, type PieceColor, type Move } from "~/lib/game/logic";
import { type TimeControl, type TimeState } from "~/lib/game/time-control-types";

interface UseGameStorageProps {
  storageType?: StorageType;
  gameId?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

interface GameStorageState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  hasSavedGame: boolean;
  savedGameSummary: {
    moveCount: number;
    lastSaved: string;
    gameMode: "ai" | "local" | "online";
  } | null;
}

interface GameStorageActions {
  saveGame: (state: GameState) => Promise<void>;
  loadGame: () => Promise<GameState | null>;
  deleteGame: () => Promise<void>;
  clearAllGames: () => Promise<void>;
  checkForSavedGame: () => Promise<boolean>;
}

interface GameState {
  board: Board;
  currentPlayer: PieceColor;
  moveCount: number;
  moveHistory: Move[];
  gameMode: "ai" | "local" | "online";
  gameStartTime: Date;
  winner: PieceColor | "draw" | null;
  timeControl?: TimeControl | null;
  timeState?: TimeState | null;
  audioWarningsEnabled?: boolean;
  soundEffectsEnabled?: boolean;
}

export function useGameStorage({
  storageType = "local",
  gameId = DEFAULT_GAME_ID,
  autoSave = true,
  autoSaveInterval = 5000,
}: UseGameStorageProps = {}): [GameStorageState, GameStorageActions] {
  const [state, setState] = useState<GameStorageState>({
    loading: false,
    saving: false,
    error: null,
    hasSavedGame: false,
    savedGameSummary: null,
  });

  const storageRef = useRef<GameStorageAdapter | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize storage adapter
  useEffect(() => {
    storageRef.current ??= createStorageAdapter({
      type: storageType,
      autoSaveInterval,
    });

    // Check for saved game on mount
    void checkForSavedGame();

    return () => {
      // Cleanup
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (storageRef.current && "destroy" in storageRef.current) {
        (storageRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [storageType, autoSaveInterval, checkForSavedGame]);

  const checkForSavedGame = useCallback(async (): Promise<boolean> => {
    if (!storageRef.current) return false;

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const result = await storageRef.current.loadGame(gameId);

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          loading: false,
          hasSavedGame: true,
          savedGameSummary: {
            moveCount: result.data!.moveCount,
            lastSaved: result.data!.lastSaved,
            gameMode: result.data!.gameMode,
          },
        }));
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          hasSavedGame: false,
          savedGameSummary: null,
        }));
        return false;
      }
    } catch (_error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to check for saved game",
      }));
      return false;
    }
  }, [gameId]);

  const saveGame = useCallback(
    async (state: GameState): Promise<void> => {
      if (!storageRef.current) return;

      const persistedState: PersistedGameState = {
        id: gameId,
        board: state.board,
        currentPlayer: state.currentPlayer,
        moveCount: state.moveCount,
        moveHistory: state.moveHistory,
        gameMode: state.gameMode,
        gameStartTime: state.gameStartTime.toISOString(),
        lastSaved: new Date().toISOString(),
        winner: state.winner,
        version: STORAGE_VERSION,
      };

      try {
        setState((prev) => ({ ...prev, saving: true, error: null }));

        if (autoSave && autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }

        const result = await storageRef.current.saveGame(persistedState);

        if (result.success) {
          setState((prev) => ({
            ...prev,
            saving: false,
            hasSavedGame: true,
            savedGameSummary: {
              moveCount: state.moveCount,
              lastSaved: new Date().toISOString(),
              gameMode: state.gameMode,
            },
          }));

          // Schedule auto-save if enabled
          if (autoSave && !state.winner) {
            autoSaveTimerRef.current = setTimeout(() => {
              void storageRef.current?.autoSave(persistedState);
            }, autoSaveInterval);
          }
        } else {
          throw new Error(result.error.message);
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: error instanceof Error ? error.message : "Failed to save game",
        }));
      }
    },
    [gameId, autoSave, autoSaveInterval],
  );

  const loadGame = useCallback(async (): Promise<GameState | null> => {
    if (!storageRef.current) return null;

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const result = await storageRef.current.loadGame(gameId);

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          loading: false,
          hasSavedGame: true,
        }));

        return {
          board: result.data.board,
          currentPlayer: result.data.currentPlayer,
          moveCount: result.data.moveCount,
          moveHistory: result.data.moveHistory,
          gameMode: result.data.gameMode,
          gameStartTime: new Date(result.data.gameStartTime),
          winner: result.data.winner,
        };
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          hasSavedGame: false,
        }));
        return null;
      }
    } catch (_error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load game",
      }));
      return null;
    }
  }, [gameId]);

  const deleteGame = useCallback(async (): Promise<void> => {
    if (!storageRef.current) return;

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const result = await storageRef.current.deleteGame(gameId);

      if (result.success) {
        setState((prev) => ({
          ...prev,
          loading: false,
          hasSavedGame: false,
          savedGameSummary: null,
        }));
      } else {
        throw new Error(result.error.message);
      }
    } catch (_error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to delete game",
      }));
    }
  }, [gameId]);

  const clearAllGames = useCallback(async (): Promise<void> => {
    if (!storageRef.current) return;

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const result = await storageRef.current.clearAll();

      if (result.success) {
        setState((prev) => ({
          ...prev,
          loading: false,
          hasSavedGame: false,
          savedGameSummary: null,
        }));
      } else {
        throw new Error(result.error.message);
      }
    } catch (_error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to clear games",
      }));
    }
  }, []);

  return [
    state,
    {
      saveGame,
      loadGame,
      deleteGame,
      clearAllGames,
      checkForSavedGame,
    },
  ];
}
