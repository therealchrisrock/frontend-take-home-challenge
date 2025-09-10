import { type Board, type PieceColor, type Move } from "~/lib/game-logic";

export interface PersistedGameState {
  id: string;
  board: Board;
  currentPlayer: PieceColor;
  moveCount: number;
  moveHistory: Move[];
  gameMode: "ai" | "local" | "online";
  gameStartTime: string;
  lastSaved: string;
  winner: PieceColor | "draw" | null;
  version: number;
}

export interface GameSummary {
  id: string;
  moveCount: number;
  gameMode: "ai" | "local" | "online";
  currentPlayer: PieceColor;
  gameStartTime: string;
  lastSaved: string;
  winner: PieceColor | "draw" | null;
}

export interface StorageError {
  code:
    | "QUOTA_EXCEEDED"
    | "NETWORK_ERROR"
    | "NOT_FOUND"
    | "INVALID_DATA"
    | "UNKNOWN";
  message: string;
  originalError?: unknown;
}

export type StorageResult<T> =
  | { success: true; data: T }
  | { success: false; error: StorageError };

export interface GameStorageAdapter {
  saveGame(gameState: PersistedGameState): Promise<StorageResult<void>>;
  loadGame(gameId?: string): Promise<StorageResult<PersistedGameState | null>>;
  deleteGame(gameId?: string): Promise<StorageResult<void>>;
  listGames(): Promise<StorageResult<GameSummary[]>>;
  autoSave(gameState: PersistedGameState): Promise<void>;
  clearAll(): Promise<StorageResult<void>>;
}

export interface StorageConfig {
  autoSaveInterval?: number;
  maxSavedGames?: number;
  compressionEnabled?: boolean;
  syncEnabled?: boolean;
}

export const STORAGE_VERSION = 1;
export const DEFAULT_GAME_ID = "current-game";
