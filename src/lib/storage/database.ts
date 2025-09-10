import { type api } from "~/trpc/react";
import type { api as serverApi } from "~/trpc/server";
import {
  type GameStorageAdapter,
  type PersistedGameState,
  type GameSummary,
  type StorageResult,
  type StorageConfig,
} from "./types";

type ApiClient = typeof api | typeof serverApi;

export class DatabaseStorageAdapter implements GameStorageAdapter {
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private config: Required<StorageConfig>;
  private apiClient: ApiClient;
  private isServer: boolean;

  constructor(apiClient: ApiClient, config: StorageConfig = {}) {
    this.apiClient = apiClient;
    this.isServer = typeof window === "undefined";
    this.config = {
      autoSaveInterval: config.autoSaveInterval ?? 10000, // Slower for network
      maxSavedGames: config.maxSavedGames ?? 50,
      compressionEnabled: config.compressionEnabled ?? false,
      syncEnabled: config.syncEnabled ?? true,
    };
  }

  async saveGame(gameState: PersistedGameState): Promise<StorageResult<void>> {
    try {
      // Check if game exists
      const existingGame = await this.loadGame(gameState.id);

      if (existingGame.success && existingGame.data) {
        // Update existing game
        await (this.apiClient as any).game.save.mutate({
          id: gameState.id,
          board: gameState.board,
          currentPlayer: gameState.currentPlayer,
          moveCount: gameState.moveCount,
          gameMode: gameState.gameMode,
          winner: gameState.winner,
          moves: gameState.moveHistory,
        });
      } else {
        // Create new game
        const result = await (this.apiClient as any).game.create.mutate({
          mode: gameState.gameMode,
          playerName: undefined,
        });

        // Update the gameState with the new ID
        gameState.id = result.id;

        // Save with moves
        if (gameState.moveHistory.length > 0) {
          await (this.apiClient as any).game.save.mutate({
            id: gameState.id,
            board: gameState.board,
            currentPlayer: gameState.currentPlayer,
            moveCount: gameState.moveCount,
            gameMode: gameState.gameMode,
            winner: gameState.winner,
            moves: gameState.moveHistory,
          });
        }
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to save game to database",
          originalError: error,
        },
      };
    }
  }

  async loadGame(
    gameId?: string,
  ): Promise<StorageResult<PersistedGameState | null>> {
    try {
      if (!gameId) {
        // Load the most recent game
        const games = await (this.apiClient as any).game.list.query({
          limit: 1,
        });

        if (!games || games.length === 0) {
          return { success: true, data: null };
        }

        gameId = games[0].id;
      }

      const game = await (this.apiClient as any).game.load.query({
        id: gameId,
      });

      if (!game) {
        return { success: true, data: null };
      }

      return { success: true, data: game };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to load game from database",
          originalError: error,
        },
      };
    }
  }

  async deleteGame(gameId?: string): Promise<StorageResult<void>> {
    try {
      if (!gameId) {
        // Delete the most recent game
        const games = await (this.apiClient as any).game.list.query({
          limit: 1,
        });

        if (!games || games.length === 0) {
          return { success: true, data: undefined };
        }

        gameId = games[0].id;
      }

      await (this.apiClient as any).game.delete.mutate({ id: gameId });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to delete game from database",
          originalError: error,
        },
      };
    }
  }

  async listGames(): Promise<StorageResult<GameSummary[]>> {
    try {
      const games = await (this.apiClient as any).game.list.query({
        limit: this.config.maxSavedGames,
      });

      return { success: true, data: games || [] };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to list games from database",
          originalError: error,
        },
      };
    }
  }

  async autoSave(gameState: PersistedGameState): Promise<void> {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Set new timer
    this.autoSaveTimer = setTimeout(async () => {
      await this.saveGame({
        ...gameState,
        lastSaved: new Date().toISOString(),
      });
    }, this.config.autoSaveInterval);
  }

  async clearAll(): Promise<StorageResult<void>> {
    try {
      await (this.apiClient as any).game.deleteAll.mutate();

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to clear all games from database",
          originalError: error,
        },
      };
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
}
