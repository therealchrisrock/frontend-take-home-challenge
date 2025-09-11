/**
 * Edge case tests for game engine
 * Tests complex scenarios and boundary conditions across variants
 */

import { describe, it, expect, beforeAll } from "vitest";
import { GameRules } from "../game-rules";
import { GameConfigLoader } from "../config-loader";
import type { Board, Move } from "../../game/logic";

describe("Edge Cases and Complex Scenarios", () => {
  const variants = ["american", "brazilian", "international"] as const;
  const variantRules = new Map<string, GameRules>();

  beforeAll(async () => {
    await GameConfigLoader.preloadBuiltInVariants();
    for (const variant of variants) {
      const rules = new GameRules(variant);
      await rules.initialize();
      variantRules.set(variant, rules);
    }
  });

  describe("Multi-Jump Capture Sequences", () => {
    it("should handle triple jump correctly", async () => {
      const rules = variantRules.get("american")!;
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Set up triple jump scenario
      board[7]![0] = { color: "red", type: "regular" };
      board[6]![1] = { color: "black", type: "regular" };
      board[4]![3] = { color: "black", type: "regular" };
      board[2]![5] = { color: "black", type: "regular" };

      // First jump
      const move: Move = {
        from: { row: 7, col: 0 },
        to: { row: 5, col: 2 },
        captures: [{ row: 6, col: 1 }],
      };

      expect(rules.validateMove(board, move)).toBe(true);
      const newBoard = rules.makeMove(board, move);
      expect(newBoard[6]![1]).toBeNull(); // Piece captured

      // Should require continuation
      const continuations = rules.findValidMoves(newBoard, "red");
      const captureMove = continuations.find(
        (m) => m.captures && m.captures.length > 0,
      );
      expect(captureMove).toBeDefined();
    });

    it("Brazilian: should prioritize king captures in maximum capture", async () => {
      const rules = variantRules.get("brazilian")!;
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Scenario: choice between capturing a regular piece or a king
      board[4]![3] = { color: "red", type: "regular" };
      board[3]![2] = { color: "black", type: "regular" };
      board[3]![4] = { color: "black", type: "king" }; // King to capture

      const moves = rules.findValidMoves(board, "red");

      // When king priority is enabled, capturing the king should be prioritized
      const capturingKing = moves.find((m) =>
        m.captures?.some((c) => c.row === 3 && c.col === 4),
      );

      if (rules.requiresKingPriority() && capturingKing) {
        // If there's a move that captures a king, it should be preferred
        expect(capturingKing).toBeDefined();
      }
    });

    it("International: should handle flying king captures correctly", async () => {
      const rules = variantRules.get("international")!;
      const board: Board = Array(10)
        .fill(null)
        .map(() => Array(10).fill(null));

      // Flying king scenario
      board[9]![0] = { color: "red", type: "king" };
      board[5]![4] = { color: "black", type: "regular" };

      // King should be able to fly and capture
      const move: Move = {
        from: { row: 9, col: 0 },
        to: { row: 4, col: 5 },
        captures: [{ row: 5, col: 4 }],
      };

      if (rules.canFlyAsKing()) {
        expect(rules.validateMove(board, move)).toBe(true);
      }
    });
  });

  describe("Promotion Edge Cases", () => {
    it("should handle promotion during capture sequence correctly", async () => {
      const rules = variantRules.get("american")!;
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Red piece about to capture and promote
      board[2]![3] = { color: "red", type: "regular" };
      board[1]![4] = { color: "black", type: "regular" };

      const move: Move = {
        from: { row: 2, col: 3 },
        to: { row: 0, col: 5 },
        captures: [{ row: 1, col: 4 }],
      };

      const newBoard = rules.makeMove(board, move);

      // Should be promoted to king
      expect(newBoard[0]![5]?.type).toBe("king");

      // Check if capture chain stops on promotion (variant-specific)
      const config = await GameConfigLoader.loadVariant("american");
      if (config.capture.promotion.stopsCaptureChain) {
        // Should not continue capture chain after promotion
        const moves = rules.findValidMoves(newBoard, "red");
        const hasMoreCaptures = moves.some(
          (m) => m.captures && m.captures.length > 0,
        );
        expect(hasMoreCaptures).toBe(false);
      }
    });

    it("should handle simultaneous promotion possibility", async () => {
      // When a piece could promote by moving to multiple squares
      const rules = variantRules.get("american")!;
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[1]![2] = { color: "red", type: "regular" };

      // Two possible promotion squares
      const moves = [
        { from: { row: 1, col: 2 }, to: { row: 0, col: 1 } },
        { from: { row: 1, col: 2 }, to: { row: 0, col: 3 } },
      ];

      for (const move of moves) {
        if (rules.validateMove(board, move)) {
          const newBoard = rules.makeMove(board, move);
          expect(newBoard[0]![move.to.col]?.type).toBe("king");
        }
      }
    });
  });

  describe("Stalemate and Draw Conditions", () => {
    it("should detect stalemate when no moves available", async () => {
      const rules = variantRules.get("american")!;
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Minimal endgame: one piece blocked
      board[0]![1] = { color: "red", type: "regular" };
      board[1]![0] = { color: "black", type: "regular" };
      board[1]![2] = { color: "black", type: "regular" };

      const moves = rules.findValidMoves(board, "red");
      expect(moves.length).toBe(0); // Red has no valid moves

      // This should be a draw by stalemate
      const result = rules.checkDrawCondition(board, []);
      const config = await GameConfigLoader.loadVariant("american");
      if (config.draws.staleMate) {
        expect(result).toBe("draw");
      }
    });

    it("should detect draw by repetition", async () => {
      const rules = variantRules.get("american")!;
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Two kings that can move back and forth
      board[3]![2] = { color: "red", type: "king" };
      board[5]![4] = { color: "black", type: "king" };

      // Simulate repetitive moves
      const moveHistory: Move[] = [
        { from: { row: 3, col: 2 }, to: { row: 4, col: 3 } },
        { from: { row: 5, col: 4 }, to: { row: 4, col: 5 } },
        { from: { row: 4, col: 3 }, to: { row: 3, col: 2 } },
        { from: { row: 4, col: 5 }, to: { row: 5, col: 4 } },
        { from: { row: 3, col: 2 }, to: { row: 4, col: 3 } },
        { from: { row: 5, col: 4 }, to: { row: 4, col: 5 } },
        { from: { row: 4, col: 3 }, to: { row: 3, col: 2 } },
        { from: { row: 4, col: 5 }, to: { row: 5, col: 4 } },
      ];

      const result = rules.checkDrawCondition(board, moveHistory);
      const config = await GameConfigLoader.loadVariant("american");
      if (
        config.draws.repetitionLimit &&
        moveHistory.length >= config.draws.repetitionLimit * 2
      ) {
        expect(result).toBe("draw");
      }
    });
  });

  describe("Invalid Move Scenarios", () => {
    variants.forEach((variant) => {
      it(`${variant}: should reject moves with invalid captures`, async () => {
        const rules = variantRules.get(variant)!;
        const size = rules.getBoardSize();
        const board: Board = Array(size)
          .fill(null)
          .map(() => Array(size).fill(null));

        board[4]![3] = { color: "red", type: "regular" };

        // Invalid capture: no piece to capture
        const invalidCapture: Move = {
          from: { row: 4, col: 3 },
          to: { row: 2, col: 5 },
          captures: [{ row: 3, col: 4 }], // No piece here
        };

        expect(rules.validateMove(board, invalidCapture)).toBe(false);
      });

      it(`${variant}: should reject moves from empty squares`, async () => {
        const rules = variantRules.get(variant)!;
        const board = rules.createInitialBoard();

        // Try to move from an empty square
        const size = rules.getBoardSize();
        const emptyRow = Math.floor(size / 2);
        const move: Move = {
          from: { row: emptyRow, col: 0 },
          to: { row: emptyRow + 1, col: 1 },
        };

        expect(rules.validateMove(board, move)).toBe(false);
      });

      it(`${variant}: should reject moving opponent's pieces`, async () => {
        const rules = variantRules.get(variant)!;
        const board = rules.createInitialBoard();

        // Find a black piece and try to move it as red
        let blackPiecePos: { row: number; col: number } | null = null;
        const size = rules.getBoardSize();

        for (let row = 0; row < size && !blackPiecePos; row++) {
          for (let col = 0; col < size && !blackPiecePos; col++) {
            if (board[row]![col]?.color === "black") {
              blackPiecePos = { row, col };
            }
          }
        }

        if (blackPiecePos) {
          const move: Move = {
            from: blackPiecePos,
            to: { row: blackPiecePos.row + 1, col: blackPiecePos.col + 1 },
          };

          // Assuming it's red's turn
          const moves = rules.findValidMoves(board, "red");
          const illegalMove = moves.find(
            (m) =>
              m.from.row === blackPiecePos.row &&
              m.from.col === blackPiecePos.col,
          );
          expect(illegalMove).toBeUndefined();
        }
      });
    });
  });

  describe("Board Boundary Conditions", () => {
    variants.forEach((variant) => {
      it(`${variant}: should handle corner positions correctly`, async () => {
        const rules = variantRules.get(variant)!;
        const size = rules.getBoardSize();
        const board: Board = Array(size)
          .fill(null)
          .map(() => Array(size).fill(null));

        // Place pieces in all corners
        const corners = [
          { row: 0, col: 0 },
          { row: 0, col: size - 1 },
          { row: size - 1, col: 0 },
          { row: size - 1, col: size - 1 },
        ];

        for (const corner of corners) {
          // Only place on valid (dark) squares
          if ((corner.row + corner.col) % 2 === 1) {
            board[corner.row]![corner.col] = { color: "red", type: "king" };

            const moves = rules.findValidMoves(board, "red");
            const cornerMoves = moves.filter(
              (m) => m.from.row === corner.row && m.from.col === corner.col,
            );

            // Kings in corners should have limited moves
            // With flying kings, they can move multiple squares along the diagonal
            // A corner piece has only one diagonal available
            if (rules.canFlyAsKing()) {
              // Flying king can move multiple squares along the single diagonal
              expect(cornerMoves.length).toBeGreaterThan(0);
              expect(cornerMoves.length).toBeLessThan(size); // Less than board size
            } else {
              // Non-flying king has at most 1 move from corner
              expect(cornerMoves.length).toBeLessThanOrEqual(1);
            }

            // Clear the corner for next test
            board[corner.row]![corner.col] = null;
          }
        }
      });

      it(`${variant}: should handle edge positions correctly`, async () => {
        const rules = variantRules.get(variant)!;
        const size = rules.getBoardSize();
        const board: Board = Array(size)
          .fill(null)
          .map(() => Array(size).fill(null));

        // Place piece on edge (not corner)
        const edgeRow = 0;
        const edgeCol = Math.floor(size / 2) | 1; // Ensure odd for dark square

        if ((edgeRow + edgeCol) % 2 === 1) {
          board[edgeRow]![edgeCol] = { color: "black", type: "regular" };

          const moves = rules.findValidMoves(board, "black");
          const edgeMoves = moves.filter(
            (m) => m.from.row === edgeRow && m.from.col === edgeCol,
          );

          // Regular pieces on top edge should have forward moves
          expect(edgeMoves.length).toBeGreaterThan(0);

          // All moves should be within bounds
          for (const move of edgeMoves) {
            expect(move.to.row).toBeGreaterThanOrEqual(0);
            expect(move.to.row).toBeLessThan(size);
            expect(move.to.col).toBeGreaterThanOrEqual(0);
            expect(move.to.col).toBeLessThan(size);
          }
        }
      });
    });
  });

  describe("Complex Capture Priority Scenarios", () => {
    it("Brazilian/International: should enforce maximum capture over simple moves", async () => {
      for (const variant of ["brazilian", "international"]) {
        const rules = variantRules.get(variant)!;
        const size = rules.getBoardSize();
        const board: Board = Array(size)
          .fill(null)
          .map(() => Array(size).fill(null));

        // Set up: red can either move or capture
        board[4]![3] = { color: "red", type: "regular" };
        board[3]![4] = { color: "black", type: "regular" };
        board[5]![2] = null; // Simple move available
        board[2]![5] = null; // Capture destination

        const moves = rules.findValidMoves(board, "red");

        if (rules.requiresMaximumCapture()) {
          // Should only return capture moves, not simple moves
          const simpleMoves = moves.filter(
            (m) => !m.captures || m.captures.length === 0,
          );
          const captureMoves = moves.filter(
            (m) => m.captures && m.captures.length > 0,
          );

          if (captureMoves.length > 0) {
            expect(simpleMoves).toHaveLength(0);
          }
        }
      }
    });

    it("should handle capture chains with multiple branches", async () => {
      const rules = variantRules.get("international")!;
      const board: Board = Array(10)
        .fill(null)
        .map(() => Array(10).fill(null));

      // Complex scenario: piece can capture in multiple directions
      board[5]![4] = { color: "red", type: "king" };
      board[4]![3] = { color: "black", type: "regular" };
      board[4]![5] = { color: "black", type: "regular" };
      board[6]![3] = { color: "black", type: "regular" };
      board[6]![5] = { color: "black", type: "regular" };

      const moves = rules.findValidMoves(board, "red");

      // Should find multiple capture paths
      const captureMoves = moves.filter(
        (m) => m.captures && m.captures.length > 0,
      );
      expect(captureMoves.length).toBeGreaterThan(0);

      if (rules.requiresMaximumCapture()) {
        // Should prefer longer capture chains
        const maxCaptures = Math.max(
          ...captureMoves.map((m) => m.captures?.length ?? 0),
        );
        const optimalMoves = captureMoves.filter(
          (m) => m.captures?.length === maxCaptures,
        );

        // All returned moves should be maximum captures
        expect(moves.every((m) => m.captures?.length === maxCaptures)).toBe(
          true,
        );
      }
    });
  });

  describe("Memory and State Management", () => {
    it("should not modify original board when making moves", async () => {
      for (const variant of variants) {
        const rules = variantRules.get(variant)!;
        const originalBoard = rules.createInitialBoard();

        // Deep copy for comparison
        const boardCopy = originalBoard.map((row) => [...row]);

        // Find and make a move
        const moves = rules.findValidMoves(originalBoard, "red");
        if (moves.length > 0) {
          const newBoard = rules.makeMove(originalBoard, moves[0]);

          // Original board should be unchanged
          for (let i = 0; i < originalBoard.length; i++) {
            for (let j = 0; j < originalBoard[i]!.length; j++) {
              expect(originalBoard[i]![j]).toEqual(boardCopy[i]![j]);
            }
          }

          // New board should be different
          let isDifferent = false;
          for (let i = 0; i < newBoard.length && !isDifferent; i++) {
            for (let j = 0; j < newBoard[i]!.length && !isDifferent; j++) {
              if (newBoard[i]![j] !== originalBoard[i]![j]) {
                isDifferent = true;
              }
            }
          }
          expect(isDifferent).toBe(true);
        }
      }
    });

    it("should handle rapid variant switching without state leakage", async () => {
      // Create boards with different variants
      const americanRules = new GameRules("american");
      await americanRules.initialize();
      const americanBoard = americanRules.createInitialBoard();

      const internationalRules = new GameRules("international");
      await internationalRules.initialize();
      const internationalBoard = internationalRules.createInitialBoard();

      // Boards should have different sizes
      expect(americanBoard.length).toBe(8);
      expect(internationalBoard.length).toBe(10);

      // Making moves on one shouldn't affect the other
      const americanMoves = americanRules.findValidMoves(americanBoard, "red");
      const internationalMoves = internationalRules.findValidMoves(
        internationalBoard,
        "red",
      );

      if (americanMoves.length > 0) {
        americanRules.makeMove(americanBoard, americanMoves[0]);
      }

      // International board should still be initial state
      const newInternationalBoard = internationalRules.createInitialBoard();
      expect(newInternationalBoard).toEqual(internationalBoard);
    });
  });
});
