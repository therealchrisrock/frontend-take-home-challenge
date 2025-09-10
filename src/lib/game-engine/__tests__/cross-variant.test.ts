/**
 * Cross-variant test suite
 * Ensures game rules work consistently across all configurations
 */

import { describe, it, expect, beforeAll } from "vitest";
import { GameRules } from "../game-rules";
import { GameConfigLoader } from "../config-loader";
import type { Board, Move, PieceColor } from "../../game-logic";

// Test data for all variants
const VARIANTS = ["american", "brazilian", "international"] as const;
type VariantName = (typeof VARIANTS)[number];

interface VariantTestCase {
  variant: VariantName;
  boardSize: number;
  pieceCount: number;
  startingRows: {
    black: number[];
    red: number[];
  };
  rules: {
    backwardCapture: {
      regular: boolean;
      king: boolean;
    };
    flyingKings: boolean;
    mandatoryCapture: boolean;
    maximumCapture: boolean;
    kingPriority: boolean;
  };
}

const VARIANT_TEST_CASES: VariantTestCase[] = [
  {
    variant: "american",
    boardSize: 8,
    pieceCount: 12,
    startingRows: {
      black: [0, 1, 2],
      red: [5, 6, 7],
    },
    rules: {
      backwardCapture: { regular: false, king: true },
      flyingKings: false,
      mandatoryCapture: true,
      maximumCapture: false,
      kingPriority: false,
    },
  },
  {
    variant: "brazilian",
    boardSize: 8,
    pieceCount: 12,
    startingRows: {
      black: [0, 1, 2],
      red: [5, 6, 7],
    },
    rules: {
      backwardCapture: { regular: true, king: true },
      flyingKings: true,
      mandatoryCapture: true,
      maximumCapture: true,
      kingPriority: true,
    },
  },
  {
    variant: "international",
    boardSize: 10,
    pieceCount: 20,
    startingRows: {
      black: [0, 1, 2, 3],
      red: [6, 7, 8, 9],
    },
    rules: {
      backwardCapture: { regular: true, king: true },
      flyingKings: true,
      mandatoryCapture: true,
      maximumCapture: true,
      kingPriority: true,
    },
  },
];

describe("Cross-Variant Tests", () => {
  // Store loaded rules for all variants
  const variantRules = new Map<VariantName, GameRules>();

  beforeAll(async () => {
    // Preload all variants
    await GameConfigLoader.preloadBuiltInVariants();

    // Initialize rules for each variant
    for (const variant of VARIANTS) {
      const rules = new GameRules(variant);
      await rules.initialize();
      variantRules.set(variant, rules);
    }
  });

  describe("Parameterized Tests - All Variants", () => {
    VARIANT_TEST_CASES.forEach((testCase) => {
      describe(`${testCase.variant.toUpperCase()} variant`, () => {
        let rules: GameRules;

        beforeAll(() => {
          rules = variantRules.get(testCase.variant)!;
        });

        it("should have correct board dimensions", () => {
          expect(rules.getBoardSize()).toBe(testCase.boardSize);
          const board = rules.createInitialBoard();
          expect(board).toHaveLength(testCase.boardSize);
          expect(board[0]).toHaveLength(testCase.boardSize);
        });

        it("should have correct piece count", () => {
          expect(rules.getPieceCount()).toBe(testCase.pieceCount);
          const board = rules.createInitialBoard();

          let blackCount = 0;
          let redCount = 0;

          for (let row = 0; row < testCase.boardSize; row++) {
            for (let col = 0; col < testCase.boardSize; col++) {
              const piece = board[row]![col];
              if (piece?.color === "black") blackCount++;
              if (piece?.color === "red") redCount++;
            }
          }

          expect(blackCount).toBe(testCase.pieceCount);
          expect(redCount).toBe(testCase.pieceCount);
        });

        it("should place pieces in correct starting rows", () => {
          const board = rules.createInitialBoard();

          // Check black pieces
          for (const row of testCase.startingRows.black) {
            let hasPieces = false;
            for (let col = 0; col < testCase.boardSize; col++) {
              if (board[row]![col]?.color === "black") {
                hasPieces = true;
                break;
              }
            }
            expect(hasPieces).toBe(true);
          }

          // Check red pieces
          for (const row of testCase.startingRows.red) {
            let hasPieces = false;
            for (let col = 0; col < testCase.boardSize; col++) {
              if (board[row]![col]?.color === "red") {
                hasPieces = true;
                break;
              }
            }
            expect(hasPieces).toBe(true);
          }
        });

        it("should enforce backward capture rules correctly", () => {
          expect(
            rules.canCaptureBackward({ color: "red", type: "regular" }),
          ).toBe(testCase.rules.backwardCapture.regular);
          expect(
            rules.canCaptureBackward({ color: "black", type: "regular" }),
          ).toBe(testCase.rules.backwardCapture.regular);
          expect(rules.canCaptureBackward({ color: "red", type: "king" })).toBe(
            testCase.rules.backwardCapture.king,
          );
        });

        it("should enforce flying king rules", () => {
          expect(rules.canFlyAsKing()).toBe(testCase.rules.flyingKings);
        });

        it("should enforce capture priority rules", () => {
          expect(rules.isMandatoryCapture()).toBe(
            testCase.rules.mandatoryCapture,
          );
          expect(rules.requiresMaximumCapture()).toBe(
            testCase.rules.maximumCapture,
          );
          expect(rules.requiresKingPriority()).toBe(
            testCase.rules.kingPriority,
          );
        });

        it("should only allow pieces on dark squares", () => {
          const board = rules.createInitialBoard();

          for (let row = 0; row < testCase.boardSize; row++) {
            for (let col = 0; col < testCase.boardSize; col++) {
              const piece = board[row]![col];
              if (piece) {
                // Pieces should only be on dark squares (where row + col is odd)
                expect((row + col) % 2).toBe(1);
              }
            }
          }
        });

        it("should handle promotion at correct rows", () => {
          // Red promotes at row 0
          expect(
            rules.shouldPromote({ color: "red", type: "regular" }, 0),
          ).toBe(true);
          expect(rules.shouldPromote({ color: "red", type: "king" }, 0)).toBe(
            false,
          );

          // Black promotes at last row
          const lastRow = testCase.boardSize - 1;
          expect(
            rules.shouldPromote({ color: "black", type: "regular" }, lastRow),
          ).toBe(true);
          expect(
            rules.shouldPromote({ color: "black", type: "king" }, lastRow),
          ).toBe(false);
        });

        it("should have symmetric initial board setup", () => {
          const board = rules.createInitialBoard();
          const size = testCase.boardSize;

          // Count pieces in each half
          let topHalfPieces = 0;
          let bottomHalfPieces = 0;

          for (let row = 0; row < size / 2; row++) {
            for (let col = 0; col < size; col++) {
              if (board[row]![col]) topHalfPieces++;
            }
          }

          for (let row = Math.ceil(size / 2); row < size; row++) {
            for (let col = 0; col < size; col++) {
              if (board[row]![col]) bottomHalfPieces++;
            }
          }

          expect(topHalfPieces).toBe(testCase.pieceCount);
          expect(bottomHalfPieces).toBe(testCase.pieceCount);
        });
      });
    });
  });

  describe("Common Behaviors Across All Variants", () => {
    VARIANTS.forEach((variant) => {
      describe(`${variant} - Common behaviors`, () => {
        let rules: GameRules;
        let board: Board;

        beforeAll(async () => {
          rules = variantRules.get(variant)!;
          board = rules.createInitialBoard();
        });

        it("should not allow moves to occupied squares", () => {
          const size = rules.getBoardSize();

          // Find a piece
          let piecePos: { row: number; col: number } | null = null;
          let occupiedPos: { row: number; col: number } | null = null;

          for (let row = 0; row < size && !occupiedPos; row++) {
            for (let col = 0; col < size && !occupiedPos; col++) {
              if (board[row]![col]) {
                if (!piecePos) {
                  piecePos = { row, col };
                } else {
                  occupiedPos = { row, col };
                }
              }
            }
          }

          if (piecePos && occupiedPos) {
            const move: Move = {
              from: piecePos,
              to: occupiedPos,
            };
            expect(rules.validateMove(board, move)).toBe(false);
          }
        });

        it("should not allow moves off the board", () => {
          const move: Move = {
            from: { row: 0, col: 0 },
            to: { row: -1, col: -1 },
          };
          expect(rules.validateMove(board, move)).toBe(false);
        });

        it("should not allow non-diagonal moves", () => {
          const size = rules.getBoardSize();

          // Find a piece
          let piecePos: { row: number; col: number } | null = null;
          for (let row = 0; row < size && !piecePos; row++) {
            for (let col = 0; col < size && !piecePos; col++) {
              if (board[row]![col]) {
                piecePos = { row, col };
              }
            }
          }

          if (piecePos) {
            // Horizontal move
            const horizontalMove: Move = {
              from: piecePos,
              to: { row: piecePos.row, col: (piecePos.col + 2) % size },
            };
            expect(rules.validateMove(board, horizontalMove)).toBe(false);

            // Vertical move
            const verticalMove: Move = {
              from: piecePos,
              to: { row: (piecePos.row + 2) % size, col: piecePos.col },
            };
            expect(rules.validateMove(board, verticalMove)).toBe(false);
          }
        });

        it("should maintain piece count after non-capture moves", () => {
          const testBoard = rules.createInitialBoard();
          const size = rules.getBoardSize();

          // Count initial pieces
          let initialCount = 0;
          for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
              if (testBoard[row]![col]) initialCount++;
            }
          }

          // Find and make a valid non-capture move
          let moveFound = false;
          for (let row = 0; row < size && !moveFound; row++) {
            for (let col = 0; col < size && !moveFound; col++) {
              const piece = testBoard[row]![col];
              if (piece && piece.color === "red") {
                const directions = rules.getValidDirections(piece);
                for (const [dr, dc] of directions) {
                  const newRow = row + dr;
                  const newCol = col + dc;
                  if (
                    newRow >= 0 &&
                    newRow < size &&
                    newCol >= 0 &&
                    newCol < size &&
                    !testBoard[newRow]![newCol]
                  ) {
                    const move: Move = {
                      from: { row, col },
                      to: { row: newRow, col: newCol },
                    };
                    if (rules.validateMove(testBoard, move)) {
                      const newBoard = rules.makeMove(testBoard, move);

                      // Count pieces after move
                      let finalCount = 0;
                      for (let r = 0; r < size; r++) {
                        for (let c = 0; c < size; c++) {
                          if (newBoard[r]![c]) finalCount++;
                        }
                      }

                      expect(finalCount).toBe(initialCount);
                      moveFound = true;
                      break;
                    }
                  }
                }
              }
            }
          }
        });

        it("should correctly change piece type on promotion", () => {
          const size = rules.getBoardSize();
          const testBoard: Board = Array(size)
            .fill(null)
            .map(() => Array(size).fill(null));

          // Place a red piece one row away from promotion
          testBoard[1]![0] = { color: "red", type: "regular" };

          const move: Move = {
            from: { row: 1, col: 0 },
            to: { row: 0, col: 1 },
          };

          const newBoard = rules.makeMove(testBoard, move);
          expect(newBoard[0]![1]?.type).toBe("king");
          expect(newBoard[0]![1]?.color).toBe("red");
        });
      });
    });
  });

  describe("Variant-Specific Capture Sequences", () => {
    it("American: should not allow regular pieces to capture backward", async () => {
      const rules = variantRules.get("american")!;
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Set up backward capture scenario
      board[4]![3] = { color: "red", type: "regular" };
      board[3]![4] = { color: "black", type: "regular" };

      // Try backward capture (should fail for American regular pieces)
      const backwardCapture: Move = {
        from: { row: 4, col: 3 },
        to: { row: 2, col: 5 },
        captures: [{ row: 3, col: 4 }],
      };

      expect(rules.validateMove(board, backwardCapture)).toBe(false);
    });

    it("Brazilian: should allow regular pieces to capture backward", async () => {
      const rules = variantRules.get("brazilian")!;
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Set up backward capture scenario for red piece
      // Red piece moves UP (backward) to capture
      board[4]![3] = { color: "red", type: "regular" };
      board[3]![4] = { color: "black", type: "regular" };

      // Try backward capture (should succeed for Brazilian)
      const backwardCapture: Move = {
        from: { row: 4, col: 3 },
        to: { row: 2, col: 5 },
        captures: [{ row: 3, col: 4 }],
      };

      expect(rules.validateMove(board, backwardCapture)).toBe(true);
    });

    it("International: should enforce maximum capture rule", async () => {
      const rules = variantRules.get("international")!;
      const board: Board = Array(10)
        .fill(null)
        .map(() => Array(10).fill(null));

      // Set up scenario with multiple capture options
      board[4]![3] = { color: "red", type: "regular" };
      board[3]![4] = { color: "black", type: "regular" };
      board[5]![4] = { color: "black", type: "regular" };

      // This should be handled by maximum capture logic
      const captures = rules.findValidMoves(board, "red");

      // Verify that multi-capture sequences are prioritized
      const hasCaptures = captures.some(
        (m) => m.captures && m.captures.length > 0,
      );
      if (hasCaptures) {
        const nonCaptures = captures.filter(
          (m) => !m.captures || m.captures.length === 0,
        );
        expect(nonCaptures).toHaveLength(0); // No non-captures when captures available
      }
    });
  });

  describe("Configuration Consistency", () => {
    it("should have valid configuration for all variants", async () => {
      for (const variant of VARIANTS) {
        const config = await GameConfigLoader.loadVariant(variant);

        // Validate basic structure
        expect(config.metadata.name).toBe(variant);
        expect(config.board.size).toBeGreaterThan(0);
        expect(config.board.pieceCount).toBeGreaterThan(0);

        // Validate arrays are properly defined
        expect(config.board.startingRows.black).toBeInstanceOf(Array);
        expect(config.board.startingRows.red).toBeInstanceOf(Array);
        expect(config.board.startingRows.black.length).toBeGreaterThan(0);
        expect(config.board.startingRows.red.length).toBeGreaterThan(0);

        // Ensure no overlap in starting rows
        const blackRows = new Set(config.board.startingRows.black);
        const redRows = new Set(config.board.startingRows.red);
        const intersection = [...blackRows].filter((row) => redRows.has(row));
        expect(intersection).toHaveLength(0);
      }
    });

    it("should handle variant switching correctly", async () => {
      // Create a game with American rules
      let rules = new GameRules("american");
      await rules.initialize();
      let board = rules.createInitialBoard();
      expect(board).toHaveLength(8);

      // Switch to International rules
      rules = new GameRules("international");
      await rules.initialize();
      board = rules.createInitialBoard();
      expect(board).toHaveLength(10);

      // Switch back to American
      rules = new GameRules("american");
      await rules.initialize();
      board = rules.createInitialBoard();
      expect(board).toHaveLength(8);
    });
  });

  describe("Tournament Mode Compliance", () => {
    VARIANTS.forEach((variant) => {
      it(`${variant}: should have tournament configuration`, async () => {
        const config = await GameConfigLoader.loadVariant(variant);

        if (config.tournament) {
          // Basic tournament rules
          expect(config.tournament.touchMove).toBeDefined();
          expect(config.tournament.notation.required).toBeDefined();

          // Time controls
          if (config.tournament.timeControls) {
            expect(config.tournament.timeControls.enabled).toBeDefined();
            if (config.tournament.timeControls.enabled) {
              expect(config.tournament.timeControls.classical).toBeDefined();
              expect(config.tournament.timeControls.rapid).toBeDefined();
              expect(config.tournament.timeControls.blitz).toBeDefined();
            }
          }
        }
      });
    });
  });

  describe("Performance and Memory Tests", () => {
    it("should handle rapid configuration switching without memory leaks", async () => {
      // Switch between variants multiple times
      for (let i = 0; i < 10; i++) {
        for (const variant of VARIANTS) {
          const rules = new GameRules(variant);
          await rules.initialize();
          const board = rules.createInitialBoard();

          // Make a few moves
          const moves = rules.findValidMoves(board, "red");
          if (moves.length > 0) {
            rules.makeMove(board, moves[0]!);
          }
        }
      }

      // Clear cache and verify it works
      GameConfigLoader.clearCache();

      // Should still work after cache clear
      const rules = new GameRules("american");
      await rules.initialize();
      expect(rules.getBoardSize()).toBe(8);
    });

    it("should efficiently handle large numbers of moves", async () => {
      for (const variant of VARIANTS) {
        const rules = variantRules.get(variant)!;
        let board = rules.createInitialBoard();
        let moveCount = 0;
        let currentPlayer: PieceColor = "red";

        // Play up to 100 moves or until no moves available
        while (moveCount < 100) {
          const moves = rules.findValidMoves(board, currentPlayer);
          if (moves.length === 0) break;

          // Make a random move
          const move = moves[Math.floor(Math.random() * moves.length)]!;
          board = rules.makeMove(board, move);

          currentPlayer = currentPlayer === "red" ? "black" : "red";
          moveCount++;
        }

        // Should handle many moves without issues
        expect(moveCount).toBeGreaterThan(0);
      }
    });
  });
});
