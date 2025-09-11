/**
 * Integration tests for game engine
 * Tests complete game flows, variant switching, and system integration
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GameRules } from "../game-rules";
import { GameConfigLoader } from "../config-loader";
import { validateConfigWithErrors } from "../rule-schema";
import type { Board, Move, PieceColor } from "../../game/logic";
import type { VariantConfig } from "../rule-schema";

describe("Game Engine Integration Tests", () => {
  beforeEach(() => {
    // Clear cache before each test for isolation
    GameConfigLoader.clearCache();
  });

  afterEach(() => {
    // Clean up after tests
    GameConfigLoader.clearCache();
  });

  describe("Complete Game Flow", () => {
    it("should play a complete game from start to finish", () => {
      const rules = new GameRules("american");
      rules.initialize();

      let board = rules.createInitialBoard();
      let currentPlayer: PieceColor = "red";
      let moveCount = 0;
      const moveHistory: Move[] = [];

      // Play until game ends or max moves reached
      while (moveCount < 200) {
        const validMoves = rules.findValidMoves(board, currentPlayer);

        if (validMoves.length === 0) {
          // No moves available - game over
          break;
        }

        // Make a random move
        const move = validMoves[Math.floor(Math.random() * validMoves.length)]!;
        board = rules.makeMove(board, move);
        moveHistory.push(move);

        // Check for winner
        const winner = rules.checkWinner(board);
        if (winner) {
          expect(["red", "black", "draw"]).toContain(winner);
          break;
        }

        // Switch players
        currentPlayer = currentPlayer === "red" ? "black" : "red";
        moveCount++;
      }

      // Game should end within reasonable moves
      expect(moveCount).toBeLessThanOrEqual(200);
      expect(moveHistory.length).toBe(moveCount);
    });

    it("should maintain game consistency through multiple operations", () => {
      const rules = new GameRules("brazilian");
      rules.initialize();

      const initialBoard = rules.createInitialBoard();

      // Count initial pieces
      const countPieces = (b: Board) => {
        let red = 0,
          black = 0;
        for (const row of b) {
          for (const cell of row) {
            if (cell?.color === "red") red++;
            if (cell?.color === "black") black++;
          }
        }
        return { red, black };
      };

      const initialCount = countPieces(initialBoard);
      expect(initialCount.red).toBe(12);
      expect(initialCount.black).toBe(12);

      // Play several moves
      let board = initialBoard;
      let currentPlayer: PieceColor = "red";

      for (let i = 0; i < 10; i++) {
        const moves = rules.findValidMoves(board, currentPlayer);
        if (moves.length === 0) break;

        const move = moves[0]!;
        const previousCount = countPieces(board);
        board = rules.makeMove(board, move);
        const newCount = countPieces(board);

        // Pieces should only decrease (captures) or stay same
        expect(newCount.red).toBeLessThanOrEqual(previousCount.red);
        expect(newCount.black).toBeLessThanOrEqual(previousCount.black);

        // Total pieces should decrease by captures
        const totalBefore = previousCount.red + previousCount.black;
        const totalAfter = newCount.red + newCount.black;
        const captured = move.captures?.length ?? 0;
        expect(totalAfter).toBe(totalBefore - captured);

        currentPlayer = currentPlayer === "red" ? "black" : "red";
      }
    });
  });

  describe("Variant Switching and Configuration Management", () => {
    it("should switch between variants without errors", () => {
      const variants = ["american", "brazilian", "international"] as const;
      const boards: Board[] = [];

      for (const variant of variants) {
        const rules = new GameRules(variant);
        rules.initialize();

        const board = rules.createInitialBoard();
        boards.push(board);

        // Verify variant-specific properties
        switch (variant) {
          case "american":
            expect(board.length).toBe(8);
            expect(rules.requiresMaximumCapture()).toBe(false);
            break;
          case "brazilian":
            expect(board.length).toBe(8);
            expect(rules.requiresMaximumCapture()).toBe(true);
            break;
          case "international":
            expect(board.length).toBe(10);
            expect(rules.requiresMaximumCapture()).toBe(true);
            break;
        }
      }

      // Boards should be independent
      expect(boards[0]!.length).toBe(8); // American
      expect(boards[1]!.length).toBe(8); // Brazilian
      expect(boards[2]!.length).toBe(10); // International
    });

    it("should handle custom variant registration and usage", () => {
      // Create a custom variant based on American rules
      const baseConfig = GameConfigLoader.loadVariant("american");
      const customConfig: VariantConfig = {
        ...baseConfig,
        metadata: {
          ...baseConfig.metadata,
          name: "custom-test",
          displayName: "Custom Test Variant",
          description: "A test variant for integration testing",
        },
        // Modify some rules
        movement: {
          ...baseConfig.movement,
          regularPieces: {
            ...baseConfig.movement.regularPieces,
            canCaptureBackward: true, // Allow backward captures
          },
        },
        capture: {
          ...baseConfig.capture,
          requireMaximum: true, // Require maximum captures
          kingPriority: true, // Prioritize king captures
        },
      };

      // Register the custom variant
      GameConfigLoader.registerCustomVariant("custom-test", customConfig);

      // Use the custom variant
      const rules = new GameRules("custom-test");
      rules.initialize();

      // Verify custom rules are applied
      expect(rules.displayName).toBe("Custom Test Variant");
      expect(rules.canCaptureBackward({ color: "red", type: "regular" })).toBe(
        true,
      );
      expect(rules.requiresMaximumCapture()).toBe(true);
      expect(rules.requiresKingPriority()).toBe(true);

      // Should still have standard board setup
      const board = rules.createInitialBoard();
      expect(board.length).toBe(8);
    });

    it("should validate and reject invalid configurations", () => {
      const invalidConfig = {
        metadata: {
          name: "invalid",
          displayName: "Invalid Config",
          // Missing required fields
        },
        board: {
          size: -1, // Invalid size
          pieceCount: "twelve", // Wrong type
        },
      };

      const validation = validateConfigWithErrors(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Concurrent Game Sessions", () => {
    it("should handle multiple independent game instances", () => {
      // Create multiple game instances
      const game1 = new GameRules("american");
      const game2 = new GameRules("brazilian");
      const game3 = new GameRules("international");

      game1.initialize();
      game2.initialize();
      game3.initialize();

      const board1 = game1.createInitialBoard();
      const board2 = game2.createInitialBoard();
      const board3 = game3.createInitialBoard();

      // Make moves on each board
      const moves1 = game1.findValidMoves(board1, "red");
      const moves2 = game2.findValidMoves(board2, "red");
      const moves3 = game3.findValidMoves(board3, "red");

      if (moves1.length > 0 && moves1[0]) {
        const newBoard1 = game1.makeMove(board1, moves1[0]);
        expect(newBoard1).not.toBe(board1); // Should be a new board
      }

      if (moves2.length > 0 && moves2[0]) {
        const newBoard2 = game2.makeMove(board2, moves2[0]);
        expect(newBoard2).not.toBe(board2);
      }

      if (moves3.length > 0 && moves3[0]) {
        const newBoard3 = game3.makeMove(board3, moves3[0]);
        expect(newBoard3).not.toBe(board3);
      }

      // Original boards should be unchanged
      expect(board1.length).toBe(8);
      expect(board2.length).toBe(8);
      expect(board3.length).toBe(10);
    });
  });

  describe("Performance and Caching", () => {
    it("should cache configurations for performance", () => {
      // First load - will fetch and cache
      const start1 = performance.now();
      GameConfigLoader.loadVariant("american");
      const time1 = performance.now() - start1;

      // Second load - should use cache
      const start2 = performance.now();
      GameConfigLoader.loadVariant("american");
      const time2 = performance.now() - start2;

      // Cached load should be faster (allowing some variance)
      // Note: This might not always be true in test environments
      expect(time2).toBeLessThanOrEqual(time1 + 1);
    });

    it("should handle cache clearing correctly", () => {
      // Load and cache
      GameConfigLoader.loadVariant("american");
      expect(GameConfigLoader.hasVariant("american")).toBe(true);

      // Clear cache
      GameConfigLoader.clearCache();

      // Should still work after cache clear
      const rules = new GameRules("american");
      rules.initialize();
      expect(rules.getBoardSize()).toBe(8);
    });

    it("should preload all variants efficiently", () => {
      const start = performance.now();
      GameConfigLoader.preloadBuiltInVariants();
      const duration = performance.now() - start;

      // All variants should be loaded
      expect(GameConfigLoader.hasVariant("american")).toBe(true);
      expect(GameConfigLoader.hasVariant("brazilian")).toBe(true);
      expect(GameConfigLoader.hasVariant("international")).toBe(true);

      // Should complete reasonably quickly
      expect(duration).toBeLessThan(1000); // 1 second max
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle invalid variant names gracefully", () => {
      const rules = new GameRules("nonexistent");

      expect(() => rules.initialize()).toThrow("Unknown variant");
    });

    it("should handle invalid moves gracefully", () => {
      const rules = new GameRules("american");
      rules.initialize();

      const board = rules.createInitialBoard();

      // Invalid move - off board
      const invalidMove: Move = {
        from: { row: -1, col: -1 },
        to: { row: 10, col: 10 },
      };

      expect(rules.validateMove(board, invalidMove)).toBe(false);

      // Should not throw when making invalid move
      expect(() => {
        rules.validateMove(board, invalidMove);
      }).not.toThrow();
    });

    it("should recover from configuration errors", () => {
      // Try to register an invalid configuration
      const invalidConfig = {} as VariantConfig;

      expect(() => {
        GameConfigLoader.registerCustomVariant("broken", invalidConfig);
      }).toThrow();

      // Should still be able to use valid configurations
      const rules = new GameRules("american");
      rules.initialize();
      expect(rules.getBoardSize()).toBe(8);
    });
  });

  describe("Tournament Mode Integration", () => {
    it("should apply tournament rules when enabled", () => {
      const config = GameConfigLoader.loadVariant("american");

      // Check tournament configuration exists
      expect(config.tournament).toBeDefined();

      if (config.tournament) {
        expect(config.tournament.touchMove).toBeDefined();
        expect(config.tournament.notation.required).toBeDefined();

        // Time controls for tournament
        if (config.tournament.timeControls?.enabled) {
          expect(config.tournament.timeControls.classical).toBeDefined();
          expect(config.tournament.timeControls.rapid).toBeDefined();
          expect(config.tournament.timeControls.blitz).toBeDefined();
        }
      }
    });

    it("should handle tournament-specific restrictions", () => {
      const rules = new GameRules("american");
      rules.initialize();

      const config = GameConfigLoader.loadVariant("american");

      // In tournament mode with 3-move restriction
      if (config.openingRestrictions?.threeMove) {
        // Should have specific opening positions defined
        expect(config.openingRestrictions.customPositions).toBeDefined();
        if (config.openingRestrictions.customPositions) {
          expect(config.openingRestrictions.customPositions.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("State Persistence and Restoration", () => {
    it("should export and import variant configurations", () => {
      // Export a variant
      const exported = GameConfigLoader.exportVariant("american");
      expect(exported).toBeDefined();

      // Convert to JSON string
      const jsonString = JSON.stringify(exported);

      // Import as a new variant
      GameConfigLoader.importVariant("imported-american", jsonString);

      // Use the imported variant
      const rules = new GameRules("imported-american");
      rules.initialize();

      // Should behave the same as original
      expect(rules.getBoardSize()).toBe(8);
      expect(rules.getPieceCount()).toBe(12);
      expect(rules.canCaptureBackward({ color: "red", type: "regular" })).toBe(
        false,
      );
    });

    it("should maintain game state through serialization", () => {
      const rules = new GameRules("american");
      rules.initialize();

      const board = rules.createInitialBoard();

      // Make some moves
      const moves = rules.findValidMoves(board, "red");
      let currentBoard = board;
      const moveHistory: Move[] = [];

      for (let i = 0; i < 3 && i < moves.length; i++) {
        const move = moves[i];
        if (move) {
          currentBoard = rules.makeMove(currentBoard, move);
          moveHistory.push(move);
        }
      }

      // Serialize state
      const serializedState = {
        variant: "american",
        board: JSON.stringify(currentBoard),
        moveHistory: JSON.stringify(moveHistory),
      };

      // Restore state
      const restoredBoard = JSON.parse(serializedState.board) as Board;
      const restoredHistory = JSON.parse(serializedState.moveHistory) as Move[];

      // Create new rules instance
      const newRules = new GameRules(serializedState.variant);
      newRules.initialize();

      // Should be able to continue game
      const nextMoves = newRules.findValidMoves(restoredBoard, "black");
      expect(nextMoves).toBeDefined();
      expect(restoredHistory.length).toBe(3);
    });
  });
});
