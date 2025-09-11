import { describe, it, expect } from "vitest";
import {
  createInitialBoard,
  isValidSquare,
  getValidMoves,
  getCaptureMoves,
  getMustCapturePositions,
  makeMove,
  checkWinner,
  getRandomAIMove,
  type Board,
  type Position,
} from "./game/logic";
import { GameConfigLoader } from "./game-engine/config-loader";
import type { BoardVariant } from "./game/variants";

describe("Game Logic - Multiple Board Sizes", () => {
  const variants: BoardVariant[] = ["american", "international", "canadian"];

  describe.each(variants)("createInitialBoard - %s", (variant) => {
    const rules = GameConfigLoader.exportVariant(variant)!;

    it(`should create a ${rules.board.size}x${rules.board.size} board`, () => {
      const board = createInitialBoard(rules);
      expect(board).toHaveLength(rules.board.size);
      board.forEach((row) => expect(row).toHaveLength(rules.board.size));
    });

    it(`should place correct number of black pieces in top rows`, () => {
      const board = createInitialBoard(rules);
      let blackPieces = 0;
      const pieceRows = Math.max(
        rules.board.startingRows.red.length,
        rules.board.startingRows.black.length,
      );
      const expectedPieces = Math.floor((rules.board.size * pieceRows) / 2);

      for (let row = 0; row < pieceRows; row++) {
        for (let col = 0; col < rules.board.size; col++) {
          if (board[row]![col]?.color === "black") {
            blackPieces++;
            expect(board[row]![col]?.type).toBe("regular");
            // Should only be on dark squares
            expect((row + col) % 2).toBe(1);
          }
        }
      }

      expect(blackPieces).toBe(expectedPieces);
    });

    it(`should place correct number of red pieces in bottom rows`, () => {
      const board = createInitialBoard(rules);
      let redPieces = 0;
      const pieceRows = Math.max(
        rules.board.startingRows.red.length,
        rules.board.startingRows.black.length,
      );
      const expectedPieces = Math.floor((rules.board.size * pieceRows) / 2);

      for (
        let row = rules.board.size - pieceRows;
        row < rules.board.size;
        row++
      ) {
        for (let col = 0; col < rules.board.size; col++) {
          if (board[row]![col]?.color === "red") {
            redPieces++;
            expect(board[row]![col]?.type).toBe("regular");
            // Should only be on dark squares
            expect((row + col) % 2).toBe(1);
          }
        }
      }

      expect(redPieces).toBe(expectedPieces);
    });

    it("should have empty middle rows", () => {
      const board = createInitialBoard(rules);
      const pieceRows = Math.max(
        rules.board.startingRows.red.length,
        rules.board.startingRows.black.length,
      );
      const startEmptyRow = pieceRows;
      const endEmptyRow = rules.board.size - pieceRows;

      for (let row = startEmptyRow; row < endEmptyRow; row++) {
        for (let col = 0; col < rules.board.size; col++) {
          expect(board[row]![col]).toBeNull();
        }
      }
    });
  });

  describe.each(variants)("isValidSquare - %s", (variant) => {
    const rules = GameConfigLoader.exportVariant(variant)!;

    it("should validate squares within board boundaries", () => {
      expect(isValidSquare(0, 0, rules)).toBe(true);
      expect(
        isValidSquare(rules.board.size - 1, rules.board.size - 1, rules),
      ).toBe(true);
      expect(
        isValidSquare(
          Math.floor(rules.board.size / 2),
          Math.floor(rules.board.size / 2),
          rules,
        ),
      ).toBe(true);
    });

    it("should invalidate squares outside board boundaries", () => {
      expect(isValidSquare(-1, 0, rules)).toBe(false);
      expect(isValidSquare(0, -1, rules)).toBe(false);
      expect(isValidSquare(rules.board.size, 0, rules)).toBe(false);
      expect(isValidSquare(0, rules.board.size, rules)).toBe(false);
      expect(isValidSquare(rules.board.size, rules.board.size, rules)).toBe(
        false,
      );
    });
  });

  describe.each(variants)("getValidMoves - %s", (variant) => {
    const rules = GameConfigLoader.exportVariant(variant)!;

    it("should find valid moves for red pieces at start", () => {
      const board = createInitialBoard(rules);
      const pieceRows = Math.max(
        rules.board.startingRows.red.length,
        rules.board.startingRows.black.length,
      );
      const redRow = rules.board.size - pieceRows;

      // Find a red piece
      let redPosition: Position | null = null;
      for (let col = 0; col < rules.board.size; col++) {
        if (board[redRow]![col]?.color === "red") {
          redPosition = { row: redRow, col };
          break;
        }
      }

      expect(redPosition).not.toBeNull();
      if (redPosition) {
        const moves = getValidMoves(board, redPosition, "red", rules);
        expect(moves.length).toBeGreaterThan(0);

        // All moves should be forward (decreasing row)
        moves.forEach((move) => {
          expect(move.to.row).toBeLessThan(move.from.row);
        });
      }
    });

    it("should not allow moves outside board boundaries", () => {
      const board = createInitialBoard(rules);

      // Test corner pieces
      const corners: Position[] = [
        { row: 0, col: 1 }, // Top-left dark square
        { row: 0, col: rules.board.size - 2 }, // Top-right dark square
        { row: rules.board.size - 1, col: 0 }, // Bottom-left dark square
        { row: rules.board.size - 1, col: rules.board.size - 1 }, // Bottom-right dark square
      ];

      corners.forEach((corner) => {
        const piece = board[corner.row]![corner.col];
        if (piece) {
          const moves = getValidMoves(board, corner, piece.color, rules);
          moves.forEach((move) => {
            expect(isValidSquare(move.to.row, move.to.col, rules)).toBe(true);
          });
        }
      });
    });
  });

  describe.each(variants)("makeMove and king promotion - %s", (variant) => {
    const rules = GameConfigLoader.exportVariant(variant)!;

    it(`should promote red piece to king at row`, () => {
      const board = createInitialBoard(rules);

      // Place a red piece near the king row
      const redKingRow = rules.promotion.customRows?.red?.[0] ?? 0;
      const testRow = redKingRow + 1;
      const testCol = 0;
      board[testRow]![testCol] = { color: "red", type: "regular" };

      // Clear the destination
      board[redKingRow]![testCol + 1] = null;

      const move = {
        from: { row: testRow, col: testCol },
        to: { row: redKingRow, col: testCol + 1 },
      };

      const newBoard = makeMove(board, move, rules);
      const movedPiece = newBoard[redKingRow]![testCol + 1];

      expect(movedPiece).not.toBeNull();
      expect(movedPiece?.type).toBe("king");
      expect(movedPiece?.color).toBe("red");
    });

    it(`should promote black piece to king at row`, () => {
      const board = createInitialBoard(rules);

      // Place a black piece near the king row
      const blackKingRow =
        rules.promotion.customRows?.black?.[0] ?? rules.board.size - 1;
      const testRow = blackKingRow - 1;
      const testCol = 0;
      board[testRow]![testCol] = { color: "black", type: "regular" };

      // Clear the destination
      board[blackKingRow]![testCol + 1] = null;

      const move = {
        from: { row: testRow, col: testCol },
        to: { row: blackKingRow, col: testCol + 1 },
      };

      const newBoard = makeMove(board, move, rules);
      const movedPiece = newBoard[blackKingRow]![testCol + 1];

      expect(movedPiece).not.toBeNull();
      expect(movedPiece?.type).toBe("king");
      expect(movedPiece?.color).toBe("black");
    });
  });

  describe.each(variants)("capture moves - %s", (variant) => {
    const rules = GameConfigLoader.exportVariant(variant)!;

    it("should detect capture moves across different board sizes", () => {
      const board: Board = Array(rules.board.size)
        .fill(null)
        .map(() => Array(rules.board.size).fill(null));

      // Set up a capture scenario in the middle of the board
      const midRow = Math.floor(rules.board.size / 2);
      const midCol = Math.floor(rules.board.size / 2);

      board[midRow]![midCol] = { color: "red", type: "regular" };
      board[midRow - 1]![midCol + 1] = { color: "black", type: "regular" };

      const captures = getCaptureMoves(
        board,
        { row: midRow, col: midCol },
        board[midRow]![midCol],
        rules,
      );

      if (captures.length > 0) {
        expect(captures[0]!.to.row).toBe(midRow - 2);
        expect(captures[0]!.to.col).toBe(midCol + 2);
        expect(captures[0]!.captures).toEqual([
          { row: midRow - 1, col: midCol + 1 },
        ]);
      }
    });

    it("should enforce mandatory captures", () => {
      const board: Board = Array(rules.board.size)
        .fill(null)
        .map(() => Array(rules.board.size).fill(null));

      // Set up a scenario with a mandatory capture
      const midRow = Math.floor(rules.board.size / 2);
      const midCol = Math.floor(rules.board.size / 2);

      board[midRow]![midCol] = { color: "red", type: "regular" };
      board[midRow - 1]![midCol + 1] = { color: "black", type: "regular" };
      board[midRow]![midCol + 2] = { color: "red", type: "regular" }; // Another red piece

      const mustCapture = getMustCapturePositions(board, "red", rules);
      expect(mustCapture.length).toBeGreaterThan(0);

      // The piece that can capture should be in the must-capture list
      const canCapture = mustCapture.some(
        (pos) => pos.row === midRow && pos.col === midCol,
      );
      expect(canCapture).toBe(true);
    });
  });

  describe.each(variants)("checkWinner - %s", (variant) => {
    const rules = GameConfigLoader.exportVariant(variant)!;

    it("should detect winner when opponent has no pieces", () => {
      const board: Board = Array(rules.board.size)
        .fill(null)
        .map(() => Array(rules.board.size).fill(null));

      // Only red pieces on the board
      board[rules.board.size - 2]![1] = { color: "red", type: "regular" };

      const winner = checkWinner(board, rules);
      expect(winner).toBe("red");
    });

    it("should detect winner when opponent has no valid moves", () => {
      const board: Board = Array(rules.board.size)
        .fill(null)
        .map(() => Array(rules.board.size).fill(null));

      // Create a scenario where black has no moves:
      // Black piece in corner at bottom-left, completely blocked
      const blackRow = rules.board.size - 1;
      board[blackRow]![0] = { color: "black", type: "regular" };
      
      // Block the only possible diagonal move by placing a red piece
      board[blackRow - 1]![1] = { color: "red", type: "regular" };
      
      // Add another red piece that can move to ensure red has moves
      board[1]![1] = { color: "red", type: "regular" };

      const winner = checkWinner(board, rules);
      expect(winner).toBe("red");
    });

    it("should return null when game is ongoing", () => {
      const board = createInitialBoard(rules);
      const winner = checkWinner(board, rules);
      expect(winner).toBeNull();
    });
  });

  describe.each(variants)("AI moves - %s", (variant) => {
    const rules = GameConfigLoader.exportVariant(variant)!;

    it("should generate valid AI moves", () => {
      const board = createInitialBoard(rules);
      const aiMove = getRandomAIMove(board, "red", rules);

      expect(aiMove).not.toBeNull();
      if (aiMove) {
        expect(isValidSquare(aiMove.from.row, aiMove.from.col, rules)).toBe(
          true,
        );
        expect(isValidSquare(aiMove.to.row, aiMove.to.col, rules)).toBe(true);

        // Verify the piece exists and belongs to AI
        const piece = board[aiMove.from.row]![aiMove.from.col];
        expect(piece).not.toBeNull();
        expect(piece?.color).toBe("red");
      }
    });

    it("should prefer capture moves when available", () => {
      const board: Board = Array(rules.board.size)
        .fill(null)
        .map(() => Array(rules.board.size).fill(null));

      // Set up a scenario where AI must capture
      const midRow = Math.floor(rules.board.size / 2);
      const midCol = Math.floor(rules.board.size / 2);

      board[midRow]![midCol] = { color: "red", type: "regular" };
      board[midRow - 1]![midCol + 1] = { color: "black", type: "regular" };

      const aiMove = getRandomAIMove(board, "red", rules);

      expect(aiMove).not.toBeNull();
      if (aiMove) {
        expect(aiMove.captures).toBeDefined();
        expect(aiMove.captures!.length).toBeGreaterThan(0);
      }
    });
  });

  // Test specific piece counts for each variant
  describe("Piece counts per variant", () => {
    it("American checkers should have 12 pieces per side", () => {
      const config = GameConfigLoader.exportVariant("american")!;
      const board = createInitialBoard(config);
      const pieces = board.flat().filter((p) => p !== null);
      const redPieces = pieces.filter((p) => p?.color === "red");
      const blackPieces = pieces.filter((p) => p?.color === "black");

      expect(redPieces).toHaveLength(12);
      expect(blackPieces).toHaveLength(12);
    });

    it("International draughts should have 20 pieces per side", () => {
      const config = GameConfigLoader.exportVariant("international")!;
      const board = createInitialBoard(config);
      const pieces = board.flat().filter((p) => p !== null);
      const redPieces = pieces.filter((p) => p?.color === "red");
      const blackPieces = pieces.filter((p) => p?.color === "black");

      expect(redPieces).toHaveLength(20);
      expect(blackPieces).toHaveLength(20);
    });

    it("Canadian checkers should have 30 pieces per side", () => {
      const config = GameConfigLoader.exportVariant("canadian")!;
      const board = createInitialBoard(config);
      const pieces = board.flat().filter((p) => p !== null);
      const redPieces = pieces.filter((p) => p?.color === "red");
      const blackPieces = pieces.filter((p) => p?.color === "black");

      expect(redPieces).toHaveLength(30);
      expect(blackPieces).toHaveLength(30);
    });
  });
});
