/**
 * Unit tests for Multiplayer Game tRPC Router
 * Tests all procedures for multiplayer game management
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { TRPCError } from "@trpc/server";
import { multiplayerGameRouter } from "../multiplayerGame";

// Mock game logic functions
vi.mock("~/lib/game/logic", () => ({
  makeMove: vi.fn().mockReturnValue([
    [null, null, null, null, null, null, null, null],
    // ... mock board state after move
  ]),
  getValidMoves: vi.fn().mockReturnValue([
    {
      from: { row: 5, col: 0 },
      to: { row: 4, col: 1 },
      captures: [],
    },
  ]),
  checkWinner: vi.fn().mockReturnValue(null),
}));

// Mock database client
const mockDb = {
  game: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  gameMove: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Mock context
const createMockContext = (session?: any) => ({
  db: mockDb,
  session,
});

// Mock caller factory
const createCaller = (ctx: any) => {
  return multiplayerGameRouter.createCaller(ctx);
};

describe("multiplayerGameRouter", () => {
  const mockBoard = JSON.stringify([
    [null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }],
    [{ color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null],
    [null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }, null, { color: "black", type: "regular" }],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [{ color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null],
    [null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }],
    [{ color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null, { color: "red", type: "regular" }, null],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("joinGame", () => {
    const mockGame = {
      id: "game1",
      gameMode: "online",
      board: mockBoard,
      currentPlayer: "red",
      moveCount: 0,
      winner: null,
      version: 1,
      player1Id: "host1",
      player2Id: null,
      player1: {
        id: "host1",
        username: "host",
        name: "Host User",
      },
      player2: null,
    };

    it("should join game as spectator when both player slots filled", async () => {
      const ctx = createMockContext({
        user: { id: "spectator1", username: "spectator" },
      });
      const caller = createCaller(ctx);

      const filledGame = {
        ...mockGame,
        player2Id: "player2",
        player2: {
          id: "player2",
          username: "player2",
          name: "Player 2",
        },
      };

      mockDb.game.findUnique.mockResolvedValueOnce(filledGame);
      mockDb.gameMove.findFirst.mockResolvedValueOnce(null);

      const input = {
        gameId: "game1",
      };

      const result = await caller.joinGame(input);

      expect(result.playerRole).toBe("SPECTATOR");
      expect(result.gameState.id).toBe("game1");
      expect(result.connectionId).toBeDefined();
    });

    it("should join game as PLAYER_2 when slot available", async () => {
      const ctx = createMockContext({
        user: { id: "player2", username: "player2" },
      });
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);
      mockDb.game.update.mockResolvedValueOnce({
        ...mockGame,
        player2Id: "player2",
      });
      mockDb.gameMove.findFirst.mockResolvedValueOnce(null);

      const input = {
        gameId: "game1",
      };

      const result = await caller.joinGame(input);

      expect(result.playerRole).toBe("PLAYER_2");
      expect(mockDb.game.update).toHaveBeenCalledWith({
        where: { id: "game1" },
        data: { player2Id: "player2" },
      });
    });

    it("should join game as guest PLAYER_2", async () => {
      const ctx = createMockContext(null); // No session (guest)
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);
      mockDb.gameMove.findFirst.mockResolvedValueOnce(null);

      const input = {
        gameId: "game1",
        guestInfo: {
          displayName: "Guest Player",
          sessionId: "guest123",
        },
      };

      const result = await caller.joinGame(input);

      expect(result.playerRole).toBe("PLAYER_2");
      expect(result.gameState.players.player2.isGuest).toBe(true);
      expect(result.gameState.players.player2.displayName).toBe("Guest Player");
    });

    it("should recognize existing PLAYER_1", async () => {
      const ctx = createMockContext({
        user: { id: "host1", username: "host" },
      });
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);
      mockDb.gameMove.findFirst.mockResolvedValueOnce(null);

      const input = {
        gameId: "game1",
      };

      const result = await caller.joinGame(input);

      expect(result.playerRole).toBe("PLAYER_1");
    });

    it("should handle game not found", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(null);

      const input = {
        gameId: "nonexistent",
      };

      await expect(caller.joinGame(input)).rejects.toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        })
      );
    });

    it("should reject non-online games", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      const aiGame = {
        ...mockGame,
        gameMode: "ai",
      };

      mockDb.game.findUnique.mockResolvedValueOnce(aiGame);

      const input = {
        gameId: "game1",
      };

      await expect(caller.joinGame(input)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "This game is not a multiplayer game",
        })
      );
    });

    it("should include last move in game state", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);

      const mockLastMove = {
        fromRow: 5,
        fromCol: 0,
        toRow: 4,
        toCol: 1,
        captures: JSON.stringify([{ row: 3, col: 2 }]),
        createdAt: new Date("2024-01-01T12:00:00Z"),
      };

      mockDb.gameMove.findFirst.mockResolvedValueOnce(mockLastMove);

      const input = {
        gameId: "game1",
      };

      const result = await caller.joinGame(input);

      expect(result.gameState.lastMove).toEqual({
        from: { row: 5, col: 0 },
        to: { row: 4, col: 1 },
        captures: [{ row: 3, col: 2 }],
        timestamp: new Date("2024-01-01T12:00:00Z"),
      });
    });
  });

  describe("makeMove", () => {
    const mockSession = {
      user: { id: "player1", username: "player1" },
    };

    const mockGame = {
      id: "game1",
      board: mockBoard,
      currentPlayer: "red",
      moveCount: 5,
      winner: null,
      version: 3,
      player1Id: "player1",
      player2Id: "player2",
      player1: {
        id: "player1",
        username: "player1",
        name: "Player 1",
      },
      player2: {
        id: "player2",
        username: "player2",
        name: "Player 2",
      },
    };

    it("should successfully make a valid move", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);

      const updatedGame = {
        ...mockGame,
        currentPlayer: "black",
        moveCount: 6,
        version: 4,
      };

      mockDb.$transaction.mockResolvedValueOnce(updatedGame);

      const input = {
        gameId: "game1",
        move: {
          from: { row: 5, col: 0 },
          to: { row: 4, col: 1 },
          captures: [],
        },
        gameVersion: 3,
      };

      const result = await caller.makeMove(input);

      expect(result.success).toBe(true);
      expect(result.newGameState).toBeDefined();
      expect(result.newGameState?.currentPlayer).toBe("black");
      expect(result.newGameState?.moveCount).toBe(6);
      expect(result.newGameState?.version).toBe(4);
    });

    it("should handle version conflicts (optimistic locking)", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const gameWithNewerVersion = {
        ...mockGame,
        version: 5, // Server version is newer than client
      };

      mockDb.game.findUnique.mockResolvedValueOnce(gameWithNewerVersion);

      const conflictingMoves = [
        {
          gameId: "game1",
          moveIndex: 3,
          fromRow: 2,
          fromCol: 1,
          toRow: 3,
          toCol: 2,
          captures: null,
        },
        {
          gameId: "game1",
          moveIndex: 4,
          fromRow: 4,
          fromCol: 3,
          toRow: 5,
          toCol: 4,
          captures: null,
        },
      ];

      mockDb.gameMove.findMany.mockResolvedValueOnce(conflictingMoves);

      const input = {
        gameId: "game1",
        move: {
          from: { row: 5, col: 0 },
          to: { row: 4, col: 1 },
        },
        gameVersion: 3, // Client version is behind
      };

      const result = await caller.makeMove(input);

      expect(result.success).toBe(false);
      expect(result.conflictResolution).toBeDefined();
      expect(result.conflictResolution?.serverVersion).toBe(5);
      expect(result.conflictResolution?.conflictingMoves).toHaveLength(2);
    });

    it("should prevent moves when not player's turn", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const gameWithBlackTurn = {
        ...mockGame,
        currentPlayer: "black", // Player 1 is red, but it's black's turn
      };

      mockDb.game.findUnique.mockResolvedValueOnce(gameWithBlackTurn);

      const input = {
        gameId: "game1",
        move: {
          from: { row: 5, col: 0 },
          to: { row: 4, col: 1 },
        },
        gameVersion: 3,
      };

      await expect(caller.makeMove(input)).rejects.toThrow(
        new TRPCError({
          code: "FORBIDDEN",
          message: "It's not your turn or you don't have permission to move",
        })
      );
    });

    it("should prevent moves in finished games", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const finishedGame = {
        ...mockGame,
        winner: "red",
      };

      mockDb.game.findUnique.mockResolvedValueOnce(finishedGame);

      const input = {
        gameId: "game1",
        move: {
          from: { row: 5, col: 0 },
          to: { row: 4, col: 1 },
        },
        gameVersion: 3,
      };

      await expect(caller.makeMove(input)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already ended",
        })
      );
    });

    it("should handle invalid moves", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);
      
      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);

      // Mock getValidMoves to return empty array (no valid moves)
      const { getValidMoves } = await import("~/lib/game/logic");
      (getValidMoves as Mock).mockReturnValueOnce([]);

      const input = {
        gameId: "game1",
        move: {
          from: { row: 5, col: 0 },
          to: { row: 3, col: 2 }, // Invalid move
        },
        gameVersion: 3,
      };

      await expect(caller.makeMove(input)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid move",
        })
      );
    });

    it("should handle guest player moves", async () => {
      const ctx = createMockContext({
        user: { id: "guest123", username: "guest" },
      });
      const caller = createCaller(ctx);

      const gameWithGuestPlayer = {
        ...mockGame,
        currentPlayer: "black", // Guest plays black (player 2)
        player2Id: null, // No registered user for player 2
      };

      mockDb.game.findUnique.mockResolvedValueOnce(gameWithGuestPlayer);

      const updatedGame = {
        ...gameWithGuestPlayer,
        currentPlayer: "red",
        moveCount: 6,
        version: 4,
      };

      mockDb.$transaction.mockResolvedValueOnce(updatedGame);

      const input = {
        gameId: "game1",
        move: {
          from: { row: 2, col: 1 },
          to: { row: 3, col: 2 },
        },
        gameVersion: 3,
        guestSessionId: "guest123",
      };

      const result = await caller.makeMove(input);

      expect(result.success).toBe(true);
    });

    it("should notify players when game ends", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);

      // Mock checkWinner to return a winner
      const { checkWinner } = await import("~/lib/game/logic");
      (checkWinner as Mock).mockReturnValueOnce("red");

      const gameWithWinner = {
        ...mockGame,
        winner: "red",
        moveCount: 6,
        version: 4,
      };

      mockDb.$transaction.mockResolvedValueOnce(gameWithWinner);

      const input = {
        gameId: "game1",
        move: {
          from: { row: 5, col: 0 },
          to: { row: 4, col: 1 },
        },
        gameVersion: 3,
      };

      const result = await caller.makeMove(input);

      expect(result.success).toBe(true);
      expect(mockDb.notification.create).toHaveBeenCalledTimes(2); // Notify both players
      expect(mockDb.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Game Finished",
          message: expect.stringContaining("Winner: player1"),
        }),
      });
    });
  });

  describe("getGameState", () => {
    it("should return current game state", async () => {
      const ctx = createMockContext(null); // Public procedure
      const caller = createCaller(ctx);

      const mockGame = {
        id: "game1",
        board: mockBoard,
        currentPlayer: "red",
        moveCount: 10,
        winner: null,
        version: 5,
        player1: {
          id: "player1",
          username: "player1",
          name: "Player 1",
        },
        player2: {
          id: "player2",
          username: "player2",
          name: "Player 2",
        },
      };

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);

      const mockLastMove = {
        fromRow: 3,
        fromCol: 2,
        toRow: 4,
        toCol: 3,
        captures: null,
        createdAt: new Date("2024-01-01T15:30:00Z"),
      };

      mockDb.gameMove.findFirst.mockResolvedValueOnce(mockLastMove);

      const result = await caller.getGameState({ gameId: "game1" });

      expect(result).toMatchObject({
        id: "game1",
        board: mockBoard,
        currentPlayer: "red",
        moveCount: 10,
        winner: null,
        version: 5,
        players: {
          player1: {
            id: "player1",
            username: "player1",
            displayName: "Player 1",
            isGuest: false,
          },
          player2: {
            id: "player2",
            username: "player2",
            displayName: "Player 2",
            isGuest: false,
          },
        },
        lastMove: {
          from: { row: 3, col: 2 },
          to: { row: 4, col: 3 },
          captures: [],
          timestamp: new Date("2024-01-01T15:30:00Z"),
        },
      });
    });

    it("should handle game not found", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(null);

      await expect(
        caller.getGameState({ gameId: "nonexistent" })
      ).rejects.toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        })
      );
    });

    it("should handle guest player state", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      const gameWithGuest = {
        id: "game1",
        board: mockBoard,
        currentPlayer: "red",
        moveCount: 5,
        winner: null,
        version: 3,
        player1: {
          id: "player1",
          username: "player1",
          name: "Player 1",
        },
        player2: null, // Guest player
      };

      mockDb.game.findUnique.mockResolvedValueOnce(gameWithGuest);
      mockDb.gameMove.findFirst.mockResolvedValueOnce(null);

      const result = await caller.getGameState({ gameId: "game1" });

      expect(result.players.player2).toMatchObject({
        id: null,
        username: null,
        displayName: null,
        isGuest: true,
      });
    });
  });

  describe("leaveGame", () => {
    it("should handle player leaving game", async () => {
      const ctx = createMockContext(null); // Public procedure
      const caller = createCaller(ctx);

      const mockGame = {
        id: "game1",
        player1Id: "player1",
        player2Id: "player2",
        winner: null,
      };

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);

      const input = {
        gameId: "game1",
        connectionId: "conn123",
      };

      const result = await caller.leaveGame(input);

      expect(result).toEqual({ success: true });
    });

    it("should handle game not found", async () => {
      const ctx = createMockContext(null);
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(null);

      const input = {
        gameId: "nonexistent",
        connectionId: "conn123",
      };

      await expect(caller.leaveGame(input)).rejects.toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        })
      );
    });
  });

  describe("syncGameState", () => {
    const mockSession = {
      user: { id: "player1", username: "player1" },
    };

    it("should return UP_TO_DATE when versions match", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const mockGame = {
        id: "game1",
        board: mockBoard,
        currentPlayer: "red",
        moveCount: 10,
        winner: null,
        version: 5,
        player1: {
          id: "player1",
          username: "player1",
          name: "Player 1",
        },
        player2: {
          id: "player2",
          username: "player2",
          name: "Player 2",
        },
      };

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);
      mockDb.gameMove.findFirst.mockResolvedValueOnce(null);

      const input = {
        gameId: "game1",
        clientVersion: 5, // Matches server version
        pendingMoves: [],
      };

      const result = await caller.syncGameState(input);

      expect(result.syncResult).toBe("UP_TO_DATE");
      expect(result.rejectedMoves).toHaveLength(0);
    });

    it("should return SERVER_AHEAD when client behind", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const mockGame = {
        id: "game1",
        board: mockBoard,
        currentPlayer: "black",
        moveCount: 12,
        winner: null,
        version: 7,
        player1: {
          id: "player1",
          username: "player1",
          name: "Player 1",
        },
        player2: {
          id: "player2",
          username: "player2",
          name: "Player 2",
        },
      };

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);
      mockDb.gameMove.findFirst.mockResolvedValueOnce(null);

      const input = {
        gameId: "game1",
        clientVersion: 5, // Client behind server
        pendingMoves: [],
      };

      const result = await caller.syncGameState(input);

      expect(result.syncResult).toBe("SERVER_AHEAD");
      expect(result.gameState.version).toBe(7);
    });

    it("should handle conflicts with pending moves", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      const mockGame = {
        id: "game1",
        board: mockBoard,
        currentPlayer: "red",
        moveCount: 8,
        winner: null,
        version: 6,
        player1: {
          id: "player1",
          username: "player1",
          name: "Player 1",
        },
        player2: {
          id: "player2",
          username: "player2",
          name: "Player 2",
        },
      };

      mockDb.game.findUnique.mockResolvedValueOnce(mockGame);
      mockDb.gameMove.findFirst.mockResolvedValueOnce(null);

      const pendingMoves = [
        {
          from: { row: 5, col: 0 },
          to: { row: 4, col: 1 },
          captures: [],
        },
        {
          from: { row: 3, col: 2 },
          to: { row: 2, col: 3 },
          captures: [],
        },
      ];

      const input = {
        gameId: "game1",
        clientVersion: 4, // Client behind with pending moves
        pendingMoves,
      };

      const result = await caller.syncGameState(input);

      expect(result.syncResult).toBe("CONFLICTS_RESOLVED");
      expect(result.rejectedMoves).toHaveLength(2); // All pending moves rejected
    });

    it("should handle game not found", async () => {
      const ctx = createMockContext(mockSession);
      const caller = createCaller(ctx);

      mockDb.game.findUnique.mockResolvedValueOnce(null);

      const input = {
        gameId: "nonexistent",
        clientVersion: 1,
        pendingMoves: [],
      };

      await expect(caller.syncGameState(input)).rejects.toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        })
      );
    });
  });
});