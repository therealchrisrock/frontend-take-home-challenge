import type { GameMove, GameState } from "../game/state/game-types";

const DB_NAME = "MultiplayerCheckersDB";
const DB_VERSION = 1;
const MOVES_QUEUE_STORE = "movesQueue";
const GAME_STATES_STORE = "gameStates";
const GUEST_SESSIONS_STORE = "guestSessions";

export interface QueuedMove {
  id: string;
  gameId: string;
  move: GameMove;
  timestamp: number;
  playerId: string;
  sequenceNumber: number;
  retryCount: number;
}

export interface CachedGameState {
  gameId: string;
  state: GameState;
  lastUpdated: number;
  serverVersion: number;
  localChanges: boolean;
}

export interface GuestSession {
  guestId: string;
  gameId: string;
  displayName: string;
  createdAt: number;
  gameHistory: string[]; // Array of gameIds
}

export class MultiplayerIndexedDBStorage {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly MAX_CACHED_GAMES = 10;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline.bind(this));
      window.addEventListener("offline", this.handleOffline.bind(this));
    }
    this.initDB().catch(console.error);
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Failed to open MultiplayerCheckersDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Move queue store for offline moves
        if (!db.objectStoreNames.contains(MOVES_QUEUE_STORE)) {
          const movesStore = db.createObjectStore(MOVES_QUEUE_STORE, {
            keyPath: "id",
          });
          movesStore.createIndex("gameId", "gameId", { unique: false });
          movesStore.createIndex("timestamp", "timestamp", { unique: false });
          movesStore.createIndex("sequenceNumber", "sequenceNumber", { unique: false });
        }

        // Game state cache store
        if (!db.objectStoreNames.contains(GAME_STATES_STORE)) {
          const gameStatesStore = db.createObjectStore(GAME_STATES_STORE, {
            keyPath: "gameId",
          });
          gameStatesStore.createIndex("lastUpdated", "lastUpdated", { unique: false });
        }

        // Guest sessions store
        if (!db.objectStoreNames.contains(GUEST_SESSIONS_STORE)) {
          const guestStore = db.createObjectStore(GUEST_SESSIONS_STORE, {
            keyPath: "guestId",
          });
          guestStore.createIndex("gameId", "gameId", { unique: false });
          guestStore.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error("Failed to initialize MultiplayerCheckersDB");
    }
    return this.db;
  }

  // Move Queue Operations
  async queueMove(gameId: string, move: GameMove, playerId: string, sequenceNumber: number): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MOVES_QUEUE_STORE], "readwrite");
    const store = transaction.objectStore(MOVES_QUEUE_STORE);

    const queuedMove: QueuedMove = {
      id: `${gameId}_${sequenceNumber}_${Date.now()}`,
      gameId,
      move,
      timestamp: Date.now(),
      playerId,
      sequenceNumber,
      retryCount: 0,
    };

    // Enforce queue size limit
    await this.enforceQueueLimit(store, gameId);

    return new Promise((resolve, reject) => {
      const request = store.put(queuedMove);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to queue move"));
    });
  }

  async getQueuedMoves(gameId: string): Promise<QueuedMove[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MOVES_QUEUE_STORE], "readonly");
    const store = transaction.objectStore(MOVES_QUEUE_STORE);
    const index = store.index("gameId");

    return new Promise((resolve, reject) => {
      const request = index.getAll(gameId);
      
      request.onsuccess = () => {
        const moves = request.result as QueuedMove[];
        // Sort by sequence number to maintain order
        moves.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        resolve(moves);
      };
      
      request.onerror = () => reject(new Error("Failed to get queued moves"));
    });
  }

  async removeQueuedMove(moveId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MOVES_QUEUE_STORE], "readwrite");
    const store = transaction.objectStore(MOVES_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(moveId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to remove queued move"));
    });
  }

  async clearMovesQueue(gameId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MOVES_QUEUE_STORE], "readwrite");
    const store = transaction.objectStore(MOVES_QUEUE_STORE);
    const index = store.index("gameId");

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(gameId));
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error("Failed to clear moves queue"));
    });
  }

  async incrementMoveRetryCount(moveId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MOVES_QUEUE_STORE], "readwrite");
    const store = transaction.objectStore(MOVES_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(moveId);
      
      getRequest.onsuccess = () => {
        const move = getRequest.result as QueuedMove;
        if (move) {
          move.retryCount++;
          const putRequest = store.put(move);
          
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(new Error("Failed to update retry count"));
        } else {
          resolve(); // Move might have been removed
        }
      };
      
      getRequest.onerror = () => reject(new Error("Failed to get move for retry count update"));
    });
  }

  // Game State Cache Operations
  async cacheGameState(gameId: string, state: GameState, serverVersion: number): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([GAME_STATES_STORE], "readwrite");
    const store = transaction.objectStore(GAME_STATES_STORE);

    const cachedState: CachedGameState = {
      gameId,
      state,
      lastUpdated: Date.now(),
      serverVersion,
      localChanges: false,
    };

    // Enforce cache size limit
    await this.enforceGameStateCacheLimit(store);

    return new Promise((resolve, reject) => {
      const request = store.put(cachedState);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to cache game state"));
    });
  }

  async getCachedGameState(gameId: string): Promise<CachedGameState | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([GAME_STATES_STORE], "readonly");
    const store = transaction.objectStore(GAME_STATES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(gameId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => reject(new Error("Failed to get cached game state"));
    });
  }

  async markGameStateAsLocallyModified(gameId: string): Promise<void> {
    const cachedState = await this.getCachedGameState(gameId);
    if (cachedState) {
      cachedState.localChanges = true;
      await this.cacheGameState(gameId, cachedState.state, cachedState.serverVersion);
    }
  }

  // Guest Session Operations
  async createGuestSession(gameId: string, displayName: string): Promise<string> {
    const db = await this.ensureDB();
    const transaction = db.transaction([GUEST_SESSIONS_STORE], "readwrite");
    const store = transaction.objectStore(GUEST_SESSIONS_STORE);

    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const guestSession: GuestSession = {
      guestId,
      gameId,
      displayName,
      createdAt: Date.now(),
      gameHistory: [gameId],
    };

    return new Promise((resolve, reject) => {
      const request = store.put(guestSession);
      
      request.onsuccess = () => resolve(guestId);
      request.onerror = () => reject(new Error("Failed to create guest session"));
    });
  }

  async getGuestSession(guestId: string): Promise<GuestSession | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([GUEST_SESSIONS_STORE], "readonly");
    const store = transaction.objectStore(GUEST_SESSIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(guestId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => reject(new Error("Failed to get guest session"));
    });
  }

  async addGameToGuestHistory(guestId: string, gameId: string): Promise<void> {
    const guestSession = await this.getGuestSession(guestId);
    if (guestSession) {
      if (!guestSession.gameHistory.includes(gameId)) {
        guestSession.gameHistory.push(gameId);
        
        const db = await this.ensureDB();
        const transaction = db.transaction([GUEST_SESSIONS_STORE], "readwrite");
        const store = transaction.objectStore(GUEST_SESSIONS_STORE);
        
        return new Promise((resolve, reject) => {
          const request = store.put(guestSession);
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error("Failed to update guest history"));
        });
      }
    }
  }

  // Utility Methods
  private async enforceQueueLimit(store: IDBObjectStore, gameId: string): Promise<void> {
    const index = store.index("gameId");
    const request = index.openCursor(IDBKeyRange.only(gameId));
    const moves: QueuedMove[] = [];

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const cursor = request.result;
        
        if (cursor) {
          moves.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by timestamp and remove oldest if over limit
          moves.sort((a, b) => a.timestamp - b.timestamp);
          
          if (moves.length >= this.MAX_QUEUE_SIZE) {
            const toDelete = moves.slice(0, moves.length - this.MAX_QUEUE_SIZE + 1);
            for (const move of toDelete) {
              store.delete(move.id);
            }
          }
          
          resolve();
        }
      };
    });
  }

  private async enforceGameStateCacheLimit(store: IDBObjectStore): Promise<void> {
    const index = store.index("lastUpdated");
    const request = index.openCursor();
    const gameStates: CachedGameState[] = [];

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const cursor = request.result;
        
        if (cursor) {
          gameStates.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by lastUpdated and remove oldest if over limit
          gameStates.sort((a, b) => b.lastUpdated - a.lastUpdated);
          
          if (gameStates.length >= this.MAX_CACHED_GAMES) {
            const toDelete = gameStates.slice(this.MAX_CACHED_GAMES);
            for (const gameState of toDelete) {
              store.delete(gameState.gameId);
            }
          }
          
          resolve();
        }
      };
    });
  }

  private handleOnline(): void {
    this.isOnline = true;
  }

  private handleOffline(): void {
    this.isOnline = false;
  }

  // Connection status
  getConnectionStatus(): { isOnline: boolean } {
    return { isOnline: this.isOnline };
  }

  // Cleanup
  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline.bind(this));
      window.removeEventListener("offline", this.handleOffline.bind(this));
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const multiplayerStorage = new MultiplayerIndexedDBStorage();