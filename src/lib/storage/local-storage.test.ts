import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { LocalStorageAdapter } from "./local-storage";
import type { PersistedGameState } from "./types";

describe("LocalStorageAdapter", () => {
  let adapter: LocalStorageAdapter;
  let mockStorage: Storage;

  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};

    mockStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
      length: Object.keys(store).length,
    };

    // Replace global localStorage
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    });

    adapter = new LocalStorageAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("saveGame", () => {
    it("should save game to localStorage", async () => {
      const testGame: PersistedGameState = {
        id: "test-id",
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(null)),
        currentPlayer: "red",
        moveCount: 10,
        moveHistory: [],
        gameMode: "ai",
        gameStartTime: new Date().toISOString(),
        lastSaved: new Date().toISOString(),
        winner: null,
        version: 1,
      };

      const result = await adapter.saveGame(testGame);

      expect(result.success).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "checkers_game_test-id",
        expect.any(String),
      );
    });

    it("should handle serialization errors", async () => {
      const testGame: any = {
        id: "test-id",
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(null)),
        currentPlayer: "red",
        moveCount: 10,
        moveHistory: [],
        gameMode: "ai",
        gameStartTime: new Date(),
        lastSaved: new Date(),
        winner: null,
        version: 1,
      };

      // Add circular reference to cause serialization error
      testGame.circular = testGame;

      const result = await adapter.saveGame(testGame);

      expect(result.success).toBe(false);
    });
  });

  describe("loadGame", () => {
    it("should load game from localStorage", async () => {
      const testGame: PersistedGameState = {
        id: "test-id",
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(null)),
        currentPlayer: "red",
        moveCount: 10,
        moveHistory: [],
        gameMode: "ai",
        gameStartTime: new Date().toISOString(),
        lastSaved: new Date().toISOString(),
        winner: null,
        version: 1,
      };

      await adapter.saveGame(testGame);
      const result = await adapter.loadGame("test-id");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.id).toBe("test-id");
        expect(result.data?.currentPlayer).toBe("red");
        expect(result.data?.moveCount).toBe(10);
      }
    });

    it("should return null if no game exists", async () => {
      const result = await adapter.loadGame("nonexistent");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
      expect(mockStorage.getItem).toHaveBeenCalledWith(
        "checkers_game_nonexistent",
      );
    });

    it("should handle corrupted data gracefully", async () => {
      // Set corrupted data directly
      mockStorage.setItem("checkers_game_test-id", "invalid json");

      const result = await adapter.loadGame("test-id");

      // Corrupted data should return an error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe("INVALID_DATA");
      }
    });

    it("should handle partial data", async () => {
      const partialData = {
        id: "test-id",
        currentPlayer: "red",
        // Missing required fields
      };

      mockStorage.setItem("checkers_game_test-id", JSON.stringify(partialData));

      const result = await adapter.loadGame("test-id");

      // Partial data will still parse but might not have all fields
      // The adapter doesn't validate schema, just parses JSON
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.id).toBe("test-id");
      }
    });
  });

  describe("deleteGame", () => {
    it("should remove game from localStorage", async () => {
      const testGame: PersistedGameState = {
        id: "test-id",
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(null)),
        currentPlayer: "red",
        moveCount: 10,
        moveHistory: [],
        gameMode: "ai",
        gameStartTime: new Date().toISOString(),
        lastSaved: new Date().toISOString(),
        winner: null,
        version: 1,
      };

      await adapter.saveGame(testGame);
      const result = await adapter.deleteGame("test-id");

      expect(result.success).toBe(true);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(
        "checkers_game_test-id",
      );
    });

    it("should return true even if no game exists", async () => {
      const result = await adapter.deleteGame("nonexistent");

      expect(result.success).toBe(true);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(
        "checkers_game_nonexistent",
      );
    });
  });

  describe("listGames", () => {
    it("should return array with single game if exists", async () => {
      const testGame: PersistedGameState = {
        id: "test-id",
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(null)),
        currentPlayer: "red",
        moveCount: 10,
        moveHistory: [],
        gameMode: "ai",
        gameStartTime: new Date().toISOString(),
        lastSaved: new Date().toISOString(),
        winner: null,
        version: 1,
      };

      await adapter.saveGame(testGame);
      const result = await adapter.listGames();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data?.[0]).toMatchObject({
          id: "test-id",
          moveCount: 10,
          gameMode: "ai",
          currentPlayer: "red",
        });
      }
    });

    it("should return empty array if no games", async () => {
      const result = await adapter.listGames();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("clearAll", () => {
    it("should clear all games", async () => {
      const testGame: PersistedGameState = {
        id: "test-id",
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(null)),
        currentPlayer: "red",
        moveCount: 10,
        moveHistory: [],
        gameMode: "ai",
        gameStartTime: new Date().toISOString(),
        lastSaved: new Date().toISOString(),
        winner: null,
        version: 1,
      };

      await adapter.saveGame(testGame);

      // Mock Object.keys to return checkers keys
      const originalKeys = Object.keys;
      Object.keys = vi
        .fn()
        .mockReturnValue(["checkers_game_test-id", "checkers_games_list"]);

      const result = await adapter.clearAll();

      expect(result.success).toBe(true);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(
        "checkers_game_test-id",
      );

      // Restore original Object.keys
      Object.keys = originalKeys;
    });

    it("should handle errors gracefully", async () => {
      // Mock Object.keys to throw an error
      const originalKeys = Object.keys;
      Object.keys = vi.fn().mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = await adapter.clearAll();

      expect(result.success).toBe(false);

      // Restore original Object.keys
      Object.keys = originalKeys;
    });
  });

  describe("migration and versioning", () => {
    it("should handle games with different versions", async () => {
      const oldVersionGame = {
        id: "test-id",
        board: Array(8)
          .fill(null)
          .map(() => Array(8).fill(null)),
        currentPlayer: "red",
        moveCount: 10,
        moveHistory: [],
        gameMode: "ai",
        gameStartTime: new Date().toISOString(),
        lastSaved: new Date().toISOString(),
        winner: null,
        version: 0, // Old version
      };

      mockStorage.setItem(
        "checkers_game_test-id",
        JSON.stringify(oldVersionGame),
      );

      const result = await adapter.loadGame("test-id");

      // Should still load but might need migration
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.id).toBe("test-id");
      }
    });
  });
});
