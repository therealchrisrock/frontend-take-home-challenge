import {
  type GameStorageAdapter,
  type PersistedGameState,
  type GameSummary,
  type StorageResult,
  type StorageConfig,
  DEFAULT_GAME_ID,
  STORAGE_VERSION
} from './types';

const STORAGE_PREFIX = 'checkers_';
const GAMES_LIST_KEY = `${STORAGE_PREFIX}games_list`;
const GAME_KEY_PREFIX = `${STORAGE_PREFIX}game_`;

export class LocalStorageAdapter implements GameStorageAdapter {
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private config: Required<StorageConfig>;

  constructor(config: StorageConfig = {}) {
    this.config = {
      autoSaveInterval: config.autoSaveInterval ?? 5000,
      maxSavedGames: config.maxSavedGames ?? 10,
      compressionEnabled: config.compressionEnabled ?? false,
      syncEnabled: config.syncEnabled ?? false,
    };
  }

  async saveGame(gameState: PersistedGameState): Promise<StorageResult<void>> {
    try {
      const key = `${GAME_KEY_PREFIX}${gameState.id}`;
      const serialized = JSON.stringify(gameState);
      
      localStorage.setItem(key, serialized);
      
      // Update games list
      await this.updateGamesList(gameState);
      
      return { success: true, data: undefined };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: 'Local storage quota exceeded. Please clear some saved games.',
            originalError: error
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: 'Failed to save game',
          originalError: error
        }
      };
    }
  }

  async loadGame(gameId: string = DEFAULT_GAME_ID): Promise<StorageResult<PersistedGameState | null>> {
    try {
      const key = `${GAME_KEY_PREFIX}${gameId}`;
      const serialized = localStorage.getItem(key);
      
      if (!serialized) {
        return { success: true, data: null };
      }
      
      const gameState = JSON.parse(serialized) as PersistedGameState;
      
      // Version migration if needed
      if (gameState.version !== STORAGE_VERSION) {
        const migrated = this.migrateGameState(gameState);
        if (migrated) {
          await this.saveGame(migrated);
          return { success: true, data: migrated };
        }
      }
      
      return { success: true, data: gameState };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Failed to load game. Data may be corrupted.',
          originalError: error
        }
      };
    }
  }

  async deleteGame(gameId: string = DEFAULT_GAME_ID): Promise<StorageResult<void>> {
    try {
      const key = `${GAME_KEY_PREFIX}${gameId}`;
      localStorage.removeItem(key);
      
      // Update games list
      const listResult = await this.listGames();
      if (listResult.success) {
        const updatedList = listResult.data.filter(g => g.id !== gameId);
        localStorage.setItem(GAMES_LIST_KEY, JSON.stringify(updatedList));
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: 'Failed to delete game',
          originalError: error
        }
      };
    }
  }

  async listGames(): Promise<StorageResult<GameSummary[]>> {
    try {
      const serialized = localStorage.getItem(GAMES_LIST_KEY);
      
      if (!serialized) {
        return { success: true, data: [] };
      }
      
      const games = JSON.parse(serialized) as GameSummary[];
      
      // Sort by last saved, newest first
      games.sort((a, b) => 
        new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()
      );
      
      return { success: true, data: games };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Failed to load games list',
          originalError: error
        }
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
        lastSaved: new Date().toISOString()
      });
    }, this.config.autoSaveInterval);
  }

  async clearAll(): Promise<StorageResult<void>> {
    try {
      const keys = Object.keys(localStorage);
      
      // Remove all checkers-related keys
      for (const key of keys) {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: 'Failed to clear storage',
          originalError: error
        }
      };
    }
  }

  private async updateGamesList(gameState: PersistedGameState): Promise<void> {
    const listResult = await this.listGames();
    const games = listResult.success ? listResult.data : [];
    
    const summary: GameSummary = {
      id: gameState.id,
      moveCount: gameState.moveCount,
      gameMode: gameState.gameMode,
      currentPlayer: gameState.currentPlayer,
      gameStartTime: gameState.gameStartTime,
      lastSaved: gameState.lastSaved,
      winner: gameState.winner
    };
    
    // Update or add the game summary
    const existingIndex = games.findIndex(g => g.id === gameState.id);
    if (existingIndex >= 0) {
      games[existingIndex] = summary;
    } else {
      games.unshift(summary);
    }
    
    // Enforce max saved games limit
    if (games.length > this.config.maxSavedGames) {
      const toDelete = games.splice(this.config.maxSavedGames);
      for (const game of toDelete) {
        const key = `${GAME_KEY_PREFIX}${game.id}`;
        localStorage.removeItem(key);
      }
    }
    
    localStorage.setItem(GAMES_LIST_KEY, JSON.stringify(games));
  }

  private migrateGameState(gameState: any): PersistedGameState | null {
    // Handle version migrations here
    // For now, just ensure all required fields exist
    try {
      return {
        id: gameState.id ?? DEFAULT_GAME_ID,
        board: gameState.board,
        currentPlayer: gameState.currentPlayer ?? 'red',
        moveCount: gameState.moveCount ?? 0,
        moveHistory: gameState.moveHistory ?? [],
        gameMode: gameState.gameMode ?? 'ai',
        gameStartTime: gameState.gameStartTime ?? new Date().toISOString(),
        lastSaved: gameState.lastSaved ?? new Date().toISOString(),
        winner: gameState.winner ?? null,
        version: STORAGE_VERSION
      };
    } catch {
      return null;
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