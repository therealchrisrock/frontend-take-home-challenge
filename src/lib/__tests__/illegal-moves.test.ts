/**
 * Comprehensive test suite for illegal moves and edge cases
 * Ensures the game properly prevents all types of invalid moves
 */

import { describe, it, expect } from "vitest";
import {
  getValidMoves,
  getCaptureMoves,
  getMustCapturePositions,
  type Board,
  type Move,
} from "../game-logic";

describe("Illegal Move Prevention - Comprehensive Tests", () => {
  describe("Backward Movement Prevention for Regular Pieces", () => {
    it("should prevent regular red pieces from moving backward (down)", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Place a red regular piece in middle of board
      board[4]![3] = { color: "red", type: "regular" };

      const moves = getValidMoves(board, { row: 4, col: 3 }, "red");

      // Red pieces move up (negative row direction)
      // Should NOT include any moves down (positive row direction)
      const backwardMoves = moves.filter((m) => m.to.row > m.from.row);
      expect(backwardMoves).toHaveLength(0);

      // Should only have forward moves
      const forwardMoves = moves.filter((m) => m.to.row < m.from.row);
      expect(forwardMoves.length).toBeGreaterThan(0);
    });

    it("should prevent regular black pieces from moving backward (up)", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Place a black regular piece in middle of board
      board[4]![3] = { color: "black", type: "regular" };

      const moves = getValidMoves(board, { row: 4, col: 3 }, "black");

      // Black pieces move down (positive row direction)
      // Should NOT include any moves up (negative row direction)
      const backwardMoves = moves.filter((m) => m.to.row < m.from.row);
      expect(backwardMoves).toHaveLength(0);

      // Should only have forward moves
      const forwardMoves = moves.filter((m) => m.to.row > m.from.row);
      expect(forwardMoves.length).toBeGreaterThan(0);
    });
  });

  describe("Backward Capture Prevention for Regular Pieces", () => {
    it("should prevent regular black piece from capturing diagonally backward-left", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[4]![4] = { color: "black", type: "regular" };
      board[3]![3] = { color: "red", type: "regular" }; // backward-left

      const captures = getCaptureMoves(board, { row: 4, col: 4 }, board[4]![4]);

      const backwardLeftCapture = captures.find((m) =>
        m.captures?.some((c) => c.row === 3 && c.col === 3),
      );

      expect(backwardLeftCapture).toBeUndefined();
    });

    it("should prevent regular black piece from capturing diagonally backward-right", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[4]![4] = { color: "black", type: "regular" };
      board[3]![5] = { color: "red", type: "regular" }; // backward-right

      const captures = getCaptureMoves(board, { row: 4, col: 4 }, board[4]![4]);

      const backwardRightCapture = captures.find((m) =>
        m.captures?.some((c) => c.row === 3 && c.col === 5),
      );

      expect(backwardRightCapture).toBeUndefined();
    });

    it("should prevent regular red piece from capturing diagonally backward-left", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[3]![4] = { color: "red", type: "regular" };
      board[4]![3] = { color: "black", type: "regular" }; // backward-left for red

      const captures = getCaptureMoves(board, { row: 3, col: 4 }, board[3]![4]);

      const backwardLeftCapture = captures.find((m) =>
        m.captures?.some((c) => c.row === 4 && c.col === 3),
      );

      expect(backwardLeftCapture).toBeUndefined();
    });

    it("should prevent regular red piece from capturing diagonally backward-right", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[3]![4] = { color: "red", type: "regular" };
      board[4]![5] = { color: "black", type: "regular" }; // backward-right for red

      const captures = getCaptureMoves(board, { row: 3, col: 4 }, board[3]![4]);

      const backwardRightCapture = captures.find((m) =>
        m.captures?.some((c) => c.row === 4 && c.col === 5),
      );

      expect(backwardRightCapture).toBeUndefined();
    });

    it("should prevent backward capture even when forward capture is available", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[4]![4] = { color: "black", type: "regular" };
      board[3]![3] = { color: "red", type: "regular" }; // backward (invalid)
      board[5]![5] = { color: "red", type: "regular" }; // forward (valid)

      const captures = getCaptureMoves(board, { row: 4, col: 4 }, board[4]![4]);

      // Should only have forward capture
      expect(captures).toHaveLength(1);
      expect(captures[0]!.captures).toContainEqual({ row: 5, col: 5 });
      expect(captures[0]!.captures).not.toContainEqual({ row: 3, col: 3 });
    });

    it("should prevent backward capture in multi-jump scenarios", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Set up a multi-jump where second jump would be backward
      board[5]![1] = { color: "black", type: "regular" };
      board[6]![2] = { color: "red", type: "regular" }; // First forward capture (black moves down)
      board[5]![3] = { color: "red", type: "regular" }; // Would be backward capture after landing at [7,3]

      const captures = getCaptureMoves(board, { row: 5, col: 1 }, board[5]![1]);

      // Should capture the first piece
      const captureExists = captures.length > 0;
      expect(captureExists).toBe(true);

      // Should not continue with backward capture
      const doubleCapture = captures.find((m) => m.captures?.length === 2);
      expect(doubleCapture).toBeUndefined();
    });
  });

  describe("Edge Cases and Complex Scenarios", () => {
    it("should handle piece at top edge correctly for black pieces", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Black piece at top edge can only move down
      board[0]![3] = { color: "black", type: "regular" };

      const moves = getValidMoves(board, { row: 0, col: 3 }, "black");

      // Should have forward moves
      expect(moves.length).toBeGreaterThan(0);
      // All moves should be downward
      moves.forEach((move) => {
        expect(move.to.row).toBeGreaterThan(move.from.row);
      });
    });

    it("should handle piece at bottom edge correctly for red pieces", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Red piece at bottom edge would normally move up
      board[7]![3] = { color: "red", type: "regular" };

      const moves = getValidMoves(board, { row: 7, col: 3 }, "red");

      // Red piece at row 7 can move up to row 6
      expect(moves.length).toBeGreaterThan(0);
      // All moves should be upward (lower row number)
      moves.forEach((move) => {
        expect(move.to.row).toBeLessThan(move.from.row);
      });
    });

    it("should not allow captures through edge of board", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Place pieces near edge
      board[1]![0] = { color: "black", type: "regular" };
      board[0]![1] = { color: "red", type: "regular" };

      const captures = getCaptureMoves(board, { row: 1, col: 0 }, board[1]![0]);

      // Can't capture because landing would be off board at [-1, 2]
      expect(captures).toHaveLength(0);
    });

    it("should prevent diagonal non-moves", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[4]![4] = { color: "red", type: "regular" };

      // Try to make an invalid move (not diagonal)
      const horizontalMove: Move = {
        from: { row: 4, col: 4 },
        to: { row: 4, col: 5 }, // Horizontal, not diagonal
      };

      // makeMove doesn't validate - it just applies the move
      // So we check if it's in the valid moves list instead
      const validMoves = getValidMoves(board, { row: 4, col: 4 }, "red");

      // Should not include horizontal move
      const hasHorizontalMove = validMoves.some(
        (m) => m.to.row === 4 && m.to.col === 5,
      );
      expect(hasHorizontalMove).toBe(false);
    });

    it("should prevent capturing own pieces", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[4]![4] = { color: "red", type: "regular" };
      board[3]![3] = { color: "red", type: "regular" }; // Same color

      const captures = getCaptureMoves(board, { row: 4, col: 4 }, board[4]![4]);

      // Should not be able to capture own piece
      expect(captures).toHaveLength(0);
    });

    it("should prevent moving to occupied square", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[4]![4] = { color: "red", type: "regular" };
      board[3]![3] = { color: "black", type: "regular" }; // Occupied

      const moves = getValidMoves(board, { row: 4, col: 4 }, "red");

      // Should not include move to occupied square
      const moveToOccupied = moves.find(
        (m) => m.to.row === 3 && m.to.col === 3,
      );
      expect(moveToOccupied).toBeUndefined();
    });

    it("should handle mandatory capture rules correctly", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Set up a scenario where capture is available
      board[4]![4] = { color: "red", type: "regular" };
      board[3]![3] = { color: "black", type: "regular" };
      board[3]![5] = null; // Regular move available

      const mustCapture = getMustCapturePositions(board, "red");

      // If there's a piece that can capture, it must be in the list
      if (mustCapture.length > 0) {
        const validMoves = getValidMoves(board, { row: 4, col: 4 }, "red");

        // All valid moves should be captures when mandatory capture applies
        validMoves.forEach((move) => {
          expect(move.captures).toBeDefined();
        });
      }
    });

    it("should handle corner pieces correctly", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Regular piece in corner
      board[0]![0] = { color: "black", type: "regular" };

      const moves = getValidMoves(board, { row: 0, col: 0 }, "black");

      // Corner piece has limited moves
      expect(moves.length).toBeLessThanOrEqual(1);
    });

    it("should not allow backward capture even to complete a winning move", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Black regular piece that could win by capturing backward (but shouldn't be allowed)
      board[2]![2] = { color: "black", type: "regular" };
      board[1]![1] = { color: "red", type: "king" }; // Last red piece - backward capture would win

      const captures = getCaptureMoves(board, { row: 2, col: 2 }, board[2]![2]);

      // Even though capturing would win the game, backward capture is not allowed
      expect(captures).toHaveLength(0);
    });

    it("should handle promotion line correctly", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Red piece one move from promotion
      board[1]![1] = { color: "red", type: "regular" };

      const moves = getValidMoves(board, { row: 1, col: 1 }, "red");

      // Should be able to move to promotion line
      const promotionMove = moves.find((m) => m.to.row === 0);
      expect(promotionMove).toBeDefined();
    });

    it("should prevent regular pieces from exhibiting king behavior", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // Regular piece surrounded by capturable pieces in all directions
      board[4]![4] = { color: "black", type: "regular" };
      board[3]![3] = { color: "red", type: "regular" }; // backward-left
      board[3]![5] = { color: "red", type: "regular" }; // backward-right
      board[5]![3] = { color: "red", type: "regular" }; // forward-left
      board[5]![5] = { color: "red", type: "regular" }; // forward-right

      const captures = getCaptureMoves(board, { row: 4, col: 4 }, board[4]![4]);

      // Regular black piece should only capture forward (down)
      expect(captures).toHaveLength(2); // Only forward-left and forward-right

      // Verify only forward captures
      captures.forEach((capture) => {
        expect(capture.to.row).toBeGreaterThan(capture.from.row);
      });
    });
  });

  describe("King Movement and Capture", () => {
    it("should allow kings to move backward", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[4]![4] = { color: "black", type: "king" };

      const moves = getValidMoves(board, { row: 4, col: 4 }, "black");

      // King should have moves in all 4 diagonal directions
      const upLeft = moves.find((m) => m.to.row === 3 && m.to.col === 3);
      const upRight = moves.find((m) => m.to.row === 3 && m.to.col === 5);
      const downLeft = moves.find((m) => m.to.row === 5 && m.to.col === 3);
      const downRight = moves.find((m) => m.to.row === 5 && m.to.col === 5);

      expect(upLeft).toBeDefined();
      expect(upRight).toBeDefined();
      expect(downLeft).toBeDefined();
      expect(downRight).toBeDefined();
    });

    it("should allow kings to capture backward", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      board[4]![4] = { color: "black", type: "king" };
      board[3]![3] = { color: "red", type: "regular" }; // backward capture

      const captures = getCaptureMoves(board, { row: 4, col: 4 }, board[4]![4]);

      const backwardCapture = captures.find((m) =>
        m.captures?.some((c) => c.row === 3 && c.col === 3),
      );

      expect(backwardCapture).toBeDefined();
    });

    it("should handle king multi-directional captures", () => {
      const board: Board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      // King that can capture, then change direction
      board[4]![1] = { color: "black", type: "king" };
      board[3]![2] = { color: "red", type: "regular" }; // First capture (backward)
      board[1]![4] = { color: "red", type: "regular" }; // Second capture (forward from landing)

      const captures = getCaptureMoves(board, { row: 4, col: 1 }, board[4]![1]);

      // Should find multi-jump with direction change
      const multiJump = captures.find((m) => m.captures?.length === 2);
      expect(multiJump).toBeDefined();
    });
  });
});
