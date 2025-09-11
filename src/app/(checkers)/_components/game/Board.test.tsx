import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "~/test/test-utils";
import { Board } from "./Board";
import type { Board as BoardType } from "~/lib/game/logic";

describe("Board Component", () => {
  const mockOnSquareClick = vi.fn();
  const mockOnDragStart = vi.fn();
  const mockOnDragEnd = vi.fn();
  const mockOnDrop = vi.fn();

  const createTestBoard = (): BoardType => {
    const board: BoardType = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => null),
    );
    board[0]![1] = { color: "black", type: "regular" };
    board[5]![2] = { color: "red", type: "regular" };
    return board;
  };

  const defaultProps = {
    board: createTestBoard(),
    selectedPosition: null,
    draggingPosition: null,
    validMoves: [],
    mustCapturePositions: [],
    currentPlayer: "red" as const,
    onSquareClick: mockOnSquareClick,
    onDragStart: mockOnDragStart,
    onDragEnd: mockOnDragEnd,
    onDrop: mockOnDrop,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render 64 squares", () => {
    renderWithProviders(<Board {...defaultProps} />);

    // Squares are divs with the aspect-square class
    const squares = document.querySelectorAll(".aspect-square");
    expect(squares).toHaveLength(64);
  });

  it("should render pieces at correct positions", () => {
    // Test board already created in defaultProps
    renderWithProviders(<Board {...defaultProps} />);

    // Check for draggable pieces (only current player's pieces are draggable)
    const draggablePieces = document.querySelectorAll('[draggable="true"]');
    // Only red piece should be draggable when currentPlayer is 'red'
    expect(draggablePieces).toHaveLength(1);
  });

  it("should highlight selected square", () => {
    const props = {
      ...defaultProps,
      selectedPosition: { row: 5, col: 2 },
    };

    renderWithProviders(<Board {...props} />);

    // Check if the selected square has boxShadow style for selection
    const squares = document.querySelectorAll(".aspect-square");
    const selectedSquare = squares[5 * 8 + 2]; // row 5, col 2
    const style = selectedSquare?.getAttribute('style');
    expect(style).toContain('box-shadow');
    expect(style).toContain('--board-selected-ring');
  });

  it("should highlight valid move squares", () => {
    const props = {
      ...defaultProps,
      validMoves: [
        { from: { row: 5, col: 2 }, to: { row: 4, col: 1 } },
        { from: { row: 5, col: 2 }, to: { row: 4, col: 3 } },
      ],
    };

    renderWithProviders(<Board {...props} />);

    // Check for highlighted valid move squares (looking for the pulse animation)
    const indicators = document.querySelectorAll(".animate-pulse");
    expect(indicators).toHaveLength(2);
  });

  it("should highlight capture move squares", () => {
    const props = {
      ...defaultProps,
      validMoves: [
        {
          from: { row: 5, col: 2 },
          to: { row: 3, col: 4 },
          captures: [{ row: 4, col: 3 }],
        },
      ],
    };

    renderWithProviders(<Board {...props} />);

    // Capture moves are shown the same as regular moves
    const squares = document.querySelectorAll(".aspect-square");
    const targetSquare = squares[3 * 8 + 4];

    // Check that the square has a child element (the indicator)
    const indicator = targetSquare?.querySelector(".animate-pulse");
    expect(indicator).toBeTruthy();
  });

  it("should call onSquareClick when square is clicked", async () => {
    renderWithProviders(<Board {...defaultProps} />);

    const squares = document.querySelectorAll(".aspect-square");
    await userEvent.click(squares[0]!);

    expect(mockOnSquareClick).toHaveBeenCalledWith({ row: 0, col: 0 });
  });

  it("should handle drag start on pieces", () => {
    renderWithProviders(<Board {...defaultProps} />);

    const piece = document.querySelector('[draggable="true"]');
    if (piece) {
      const mockDataTransfer = {
        effectAllowed: "",
        setData: vi.fn(),
      };

      fireEvent.dragStart(piece, {
        dataTransfer: mockDataTransfer,
      });

      expect(mockOnDragStart).toHaveBeenCalled();
    }
  });

  it("should handle drag end", () => {
    renderWithProviders(<Board {...defaultProps} />);

    const piece = document.querySelector('[draggable="true"]');
    if (piece) {
      fireEvent.dragEnd(piece);
      expect(mockOnDragEnd).toHaveBeenCalled();
    }
  });

  it("should handle drop on valid squares", () => {
    const props = {
      ...defaultProps,
      validMoves: [{ from: { row: 5, col: 2 }, to: { row: 4, col: 3 } }],
    };

    renderWithProviders(<Board {...props} />);

    const squares = document.querySelectorAll(".aspect-square");
    const dropSquare = squares[4 * 8 + 3];

    fireEvent.drop(dropSquare!);
    expect(mockOnDrop).toHaveBeenCalledWith({ row: 4, col: 3 });
  });

  it("should display correct square colors", () => {
    renderWithProviders(<Board {...defaultProps} />);

    const squares = document.querySelectorAll(".aspect-square");

    // Check alternating colors via CSS variables
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = squares[row * 8 + col];
        const isDark = (row + col) % 2 === 1;
        const style = square?.getAttribute('style') || '';

        if (isDark && square) {
          expect(style).toContain('--board-dark-from');
        } else if (square) {
          expect(style).toContain('--board-light-from');
        }
      }
    }
  });

  it("should render board with correct structure", () => {
    renderWithProviders(<Board {...defaultProps} />);

    // The Board component doesn't include row/column labels
    // It's just the 8x8 grid of squares
    const grid = document.querySelector(".grid-cols-8");
    expect(grid).toBeInTheDocument();

    // Should have border styling
    expect(grid?.className).toContain("border-4");
  });

  it("should render king pieces with crown icon", () => {
    const board = createTestBoard();
    board[2]![3] = { color: "red", type: "king" };

    const props = {
      ...defaultProps,
      board,
    };

    renderWithProviders(<Board {...props} />);

    // Check for crown icon (King pieces have Crown component)
    const crowns = document.querySelectorAll("svg"); // Crown is an SVG
    expect(crowns.length).toBeGreaterThan(0);
  });

  it("should not allow dragging opponent pieces", () => {
    renderWithProviders(<Board {...defaultProps} />);

    // Find black piece (opponent when current player is red)
    const pieces = document.querySelectorAll("[draggable]");
    const blackPiece = Array.from(pieces).find(
      (p) => p.getAttribute("draggable") === "false",
    );

    expect(blackPiece).toBeDefined();
  });

  it("should have correct board structure", () => {
    renderWithProviders(<Board {...defaultProps} />);

    // Check for the grid container
    const grid = document.querySelector(".grid-cols-8");
    expect(grid).toBeInTheDocument();

    // Check that we have 64 squares
    const squares = document.querySelectorAll(".aspect-square");
    expect(squares).toHaveLength(64);
  });
});
