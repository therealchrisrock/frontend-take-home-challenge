import {
  type GameStorageAdapter,
  type PersistedGameState,
  type GameSummary,
  type StorageResult,
  type StorageConfig,
  DEFAULT_GAME_ID,
  STORAGE_VERSION
} from './types';

const DB_NAME = 'CheckersGameDB';
const DB_VERSION = 1;
const GAMES_STORE = 'games';
const SYNC_QUEUE_STORE = 'syncQueue';

interface SyncQueueItem {
  id: string;
  gameState: PersistedGameState;
  operation: 'save' | 'delete';
  timestamp: string;
  retryCount: number;
}

export class IndexedDBAdapter implements GameStorageAdapter {
  private db: IDBDatabase | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private config: Required<StorageConfig>;
  private isOnline: boolean = navigator.onLine;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(config: StorageConfig = {}) {
    this.config = {
      autoSaveInterval: config.autoSaveInterval ?? 5000,
      maxSavedGames: config.maxSavedGames ?? 10,
      compressionEnabled: config.compressionEnabled ?? false,
      syncEnabled: config.syncEnabled ?? true,
    };

    // Listen to online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }

    // Initialize database
    this.initDB().catch(console.error);

    // Start sync interval if enabled
    if (this.config.syncEnabled) {
      this.startSyncInterval();
    }
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create games object store
        if (!db.objectStoreNames.contains(GAMES_STORE)) {
          const gamesStore = db.createObjectStore(GAMES_STORE, { keyPath: 'id' });
          gamesStore.createIndex('lastSaved', 'lastSaved', { unique: false });
          gamesStore.createIndex('gameMode', 'gameMode', { unique: false });
          gamesStore.createIndex('winner', 'winner', { unique: false });
        }

        // Create sync queue object store for offline sync
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  async saveGame(gameState: PersistedGameState): Promise<StorageResult<void>> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([GAMES_STORE], 'readwrite');
      const store = transaction.objectStore(GAMES_STORE);

      // Enforce max saved games limit
      await this.enforceMaxGamesLimit(store, gameState.id);

      const request = store.put(gameState);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          // Queue for sync if online and sync is enabled
          if (this.config.syncEnabled && this.isOnline) {
            void this.queueForSync(gameState, 'save');
          }
          resolve({ success: true, data: undefined });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: {
              code: 'SAVE_FAILED',
              message: 'Failed to save game to IndexedDB',
              originalError: request.error
            }
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Database operation failed',
          originalError: error
        }
      };
    }
  }

  async loadGame(gameId: string = DEFAULT_GAME_ID): Promise<StorageResult<PersistedGameState | null>> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([GAMES_STORE], 'readonly');
      const store = transaction.objectStore(GAMES_STORE);
      const request = store.get(gameId);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const gameState = request.result as PersistedGameState | undefined;
          
          if (!gameState) {
            resolve({ success: true, data: null });
            return;
          }

          // Version migration if needed
          if (gameState.version !== STORAGE_VERSION) {
            const migrated = this.migrateGameState(gameState);
            if (migrated) {
              void this.saveGame(migrated);
              resolve({ success: true, data: migrated });
            } else {
              resolve({ success: true, data: null });
            }
          } else {
            resolve({ success: true, data: gameState });
          }
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: {
              code: 'LOAD_FAILED',
              message: 'Failed to load game from IndexedDB',
              originalError: request.error
            }
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Database operation failed',
          originalError: error
        }
      };
    }
  }

  async deleteGame(gameId: string = DEFAULT_GAME_ID): Promise<StorageResult<void>> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([GAMES_STORE], 'readwrite');
      const store = transaction.objectStore(GAMES_STORE);
      const request = store.delete(gameId);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          // Queue for sync if online and sync is enabled
          if (this.config.syncEnabled && this.isOnline) {
            void this.queueForDelete(gameId);
          }
          resolve({ success: true, data: undefined });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: {
              code: 'DELETE_FAILED',
              message: 'Failed to delete game from IndexedDB',
              originalError: request.error
            }
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Database operation failed',
          originalError: error
        }
      };
    }
  }

  async listGames(): Promise<StorageResult<GameSummary[]>> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([GAMES_STORE], 'readonly');
      const store = transaction.objectStore(GAMES_STORE);
      const index = store.index('lastSaved');
      const request = index.openCursor(null, 'prev'); // Sort by lastSaved descending

      const games: GameSummary[] = [];

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const cursor = request.result;
          
          if (cursor) {
            const gameState = cursor.value as PersistedGameState;
            games.push({
              id: gameState.id,
              moveCount: gameState.moveCount,
              gameMode: gameState.gameMode,
              currentPlayer: gameState.currentPlayer,
              gameStartTime: gameState.gameStartTime,
              lastSaved: gameState.lastSaved,
              winner: gameState.winner
            });
            cursor.continue();
          } else {
            resolve({ success: true, data: games });
          }
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: {
              code: 'LIST_FAILED',
              message: 'Failed to list games from IndexedDB',
              originalError: request.error
            }
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Database operation failed',
          originalError: error
        }
      };
    }
  }

  async autoSave(gameState: PersistedGameState): Promise<void> {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(async () => {
      await this.saveGame({
        ...gameState,
        lastSaved: new Date().toISOString()
      });
    }, this.config.autoSaveInterval);
  }

  async clearAll(): Promise<StorageResult<void>> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([GAMES_STORE, SYNC_QUEUE_STORE], 'readwrite');
      const gamesStore = transaction.objectStore(GAMES_STORE);
      const syncStore = transaction.objectStore(SYNC_QUEUE_STORE);

      const clearGames = gamesStore.clear();
      const clearSync = syncStore.clear();

      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          resolve({ success: true, data: undefined });
        };

        transaction.onerror = () => {
          resolve({
            success: false,
            error: {
              code: 'CLEAR_FAILED',
              message: 'Failed to clear IndexedDB',
              originalError: transaction.error
            }
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Database operation failed',
          originalError: error
        }
      };
    }
  }

  private async enforceMaxGamesLimit(store: IDBObjectStore, currentGameId: string): Promise<void> {
    const index = store.index('lastSaved');
    const request = index.openCursor();
    const games: Array<{ id: string; lastSaved: string }> = [];

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const cursor = request.result;
        
        if (cursor) {
          const game = cursor.value as PersistedGameState;
          if (game.id !== currentGameId) {
            games.push({ id: game.id, lastSaved: game.lastSaved });
          }
          cursor.continue();
        } else {
          // Sort by lastSaved and remove oldest if over limit
          games.sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime());
          
          if (games.length >= this.config.maxSavedGames) {
            const toDelete = games.slice(this.config.maxSavedGames - 1);
            for (const game of toDelete) {
              store.delete(game.id);
            }
          }
          
          resolve();
        }
      };
    });
  }

  private async queueForSync(gameState: PersistedGameState, operation: 'save' | 'delete'): Promise<void> {
    if (!this.config.syncEnabled) return;

    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);

      const queueItem: SyncQueueItem = {
        id: `${gameState.id}_${Date.now()}`,
        gameState,
        operation,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };

      store.put(queueItem);
    } catch (error) {
      console.error('Failed to queue for sync:', error);
    }
  }

  private async queueForDelete(gameId: string): Promise<void> {
    if (!this.config.syncEnabled) return;

    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);

      const queueItem: SyncQueueItem = {
        id: `${gameId}_delete_${Date.now()}`,
        gameState: { id: gameId } as PersistedGameState,
        operation: 'delete',
        timestamp: new Date().toISOString(),
        retryCount: 0
      };

      store.put(queueItem);
    } catch (error) {
      console.error('Failed to queue delete for sync:', error);
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || !this.config.syncEnabled) return;

    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = async () => {
        const items = request.result as SyncQueueItem[];
        
        for (const item of items) {
          try {
            // This would be where you sync to the server
            // For now, we'll just remove from the queue
            await this.removeSyncQueueItem(item.id);
          } catch (error) {
            // Increment retry count
            if (item.retryCount < 3) {
              item.retryCount++;
              store.put(item);
            } else {
              // Give up after 3 retries
              await this.removeSyncQueueItem(item.id);
            }
          }
        }
      };
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  }

  private async removeSyncQueueItem(id: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      store.delete(id);
    } catch (error) {
      console.error('Failed to remove sync queue item:', error);
    }
  }

  private handleOnline(): void {
    this.isOnline = true;
    // Process sync queue when coming online
    void this.processSyncQueue();
  }

  private handleOffline(): void {
    this.isOnline = false;
  }

  private startSyncInterval(): void {
    // Process sync queue every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        void this.processSyncQueue();
      }
    }, 30000);
  }

  private migrateGameState(gameState: any): PersistedGameState | null {
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

  destroy(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}