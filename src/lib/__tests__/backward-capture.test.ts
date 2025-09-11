/**
 * Test to verify regular pieces cannot capture backward
 * This test was created to fix a bug where regular black pieces
 * were able to capture backward (up the board)
 */

import { describe, it, expect } from "vitest";
import { getCaptureMoves, type Board, type Piece } from "../game/logic";

describe("Backward Capture Prevention", () => {
  it("regular black pieces should NOT be able to capture backward (upward)", () => {
    const board: Board = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null)) as Board;

    // Place a black regular piece at position [3, 3]
    const blackPiece: Piece = { color: "black", type: "regular" };
    board[3]![3] = blackPiece;

    // Place a red piece above and to the right (backward capture position for black)
    board[2]![4] = { color: "red", type: "king" };

    // Place a red piece below and to the right (forward capture position for black)
    board[4]![4] = { color: "red", type: "regular" };

    // Get capture moves for the black piece
    const captures = getCaptureMoves(board, { row: 3, col: 3 }, blackPiece);

    // Black should only be able to capture forward (downward)
    // It should NOT be able to capture the piece at [2,4] (backward)
    const backwardCapture = captures.find((move) =>
      move.captures?.some((c) => c.row === 2 && c.col === 4),
    );
    const forwardCapture = captures.find((move) =>
      move.captures?.some((c) => c.row === 4 && c.col === 4),
    );

    expect(backwardCapture).toBeUndefined(); // Should NOT exist
    expect(forwardCapture).toBeDefined(); // Should exist
  });

  it("regular red pieces should NOT be able to capture backward (downward)", () => {
    const board: Board = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null)) as Board;

    // Place a red regular piece at position [4, 3]
    const redPiece: Piece = { color: "red", type: "regular" };
    board[4]![3] = redPiece;

    // Place a black piece below and to the right (backward capture for red)
    board[5]![4] = { color: "black", type: "regular" };

    // Place a black piece above and to the right (forward capture for red)
    board[3]![4] = { color: "black", type: "regular" };

    // Get capture moves for the red piece
    const captures = getCaptureMoves(board, { row: 4, col: 3 }, redPiece);

    // Red should only be able to capture forward (upward)
    // It should NOT be able to capture the piece at [5,4] (backward)
    const backwardCapture = captures.find((move) =>
      move.captures?.some((c) => c.row === 5 && c.col === 4),
    );
    const forwardCapture = captures.find((move) =>
      move.captures?.some((c) => c.row === 3 && c.col === 4),
    );

    expect(backwardCapture).toBeUndefined(); // Should NOT exist
    expect(forwardCapture).toBeDefined(); // Should exist
  });

  it("kings SHOULD be able to capture in all directions", () => {
    const board: Board = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null)) as Board;

    // Place a black king at position [4, 4]
    const blackKing: Piece = { color: "black", type: "king" };
    board[4]![4] = blackKing;

    // Place red pieces in all four diagonal directions
    board[3]![3] = { color: "red", type: "regular" }; // up-left
    board[3]![5] = { color: "red", type: "regular" }; // up-right
    board[5]![3] = { color: "red", type: "regular" }; // down-left
    board[5]![5] = { color: "red", type: "regular" }; // down-right

    // Get capture moves for the king
    const captures = getCaptureMoves(board, { row: 4, col: 4 }, blackKing);

    // King should be able to capture in all 4 directions
    expect(captures).toHaveLength(4);

    // Verify all four captures are possible
    const capturesUpLeft = captures.find((m) =>
      m.captures?.some((c) => c.row === 3 && c.col === 3),
    );
    const capturesUpRight = captures.find((m) =>
      m.captures?.some((c) => c.row === 3 && c.col === 5),
    );
    const capturesDownLeft = captures.find((m) =>
      m.captures?.some((c) => c.row === 5 && c.col === 3),
    );
    const capturesDownRight = captures.find((m) =>
      m.captures?.some((c) => c.row === 5 && c.col === 5),
    );

    expect(capturesUpLeft).toBeDefined();
    expect(capturesUpRight).toBeDefined();
    expect(capturesDownLeft).toBeDefined();
    expect(capturesDownRight).toBeDefined();
  });

  it("should prevent backward captures in actual game scenario", () => {
    const board: Board = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null)) as Board;

    // Recreate the reported bug scenario:
    // Black regular piece capturing a red king that's above it
    board[4]![2] = { color: "black", type: "regular" };
    board[3]![3] = { color: "red", type: "king" }; // This should NOT be capturable by regular black

    const blackPiece = board[4]![2];
    const captures = getCaptureMoves(board, { row: 4, col: 2 }, blackPiece);

    // The black regular piece should NOT be able to capture the red king above it
    expect(captures).toHaveLength(0);
  });
});
