import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from './Board';
import type { Board as BoardType } from '~/lib/game-logic';

describe('Board Component', () => {
  const mockOnSquareClick = vi.fn();
  const mockOnDragStart = vi.fn();
  const mockOnDragEnd = vi.fn();
  const mockOnDrop = vi.fn();

  const createTestBoard = (): BoardType => {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    board[0][1] = { color: 'black', type: 'regular' };
    board[5][2] = { color: 'red', type: 'regular' };
    return board;
  };

  const defaultProps = {
    board: createTestBoard(),
    selectedPosition: null,
    draggingPosition: null,
    validMoves: [],
    mustCapturePositions: [],
    currentPlayer: 'red' as const,
    onSquareClick: mockOnSquareClick,
    onDragStart: mockOnDragStart,
    onDragEnd: mockOnDragEnd,
    onDrop: mockOnDrop,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render 64 squares', () => {
    render(<Board {...defaultProps} />);
    
    // Squares are divs with the aspect-square class
    const squares = document.querySelectorAll('.aspect-square');
    expect(squares).toHaveLength(64);
  });

  it('should render pieces at correct positions', () => {
    const testBoard = createTestBoard();
    // Count actual pieces
    let pieceCount = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (testBoard[row][col]) pieceCount++;
      }
    }
    
    render(<Board {...defaultProps} />);
    
    // Check for draggable pieces (only current player's pieces are draggable)
    const draggablePieces = document.querySelectorAll('[draggable="true"]');
    // Only red piece should be draggable when currentPlayer is 'red'
    expect(draggablePieces).toHaveLength(1);
  });

  it('should highlight selected square', () => {
    const props = {
      ...defaultProps,
      selectedPosition: { row: 5, col: 2 },
    };
    
    render(<Board {...props} />);
    
    // Check if the selected square has the selection class
    const squares = document.querySelectorAll('.aspect-square');
    const selectedSquare = squares[5 * 8 + 2]; // row 5, col 2
    expect(selectedSquare?.className).toContain('ring-4');
  });

  it('should highlight valid move squares', () => {
    const props = {
      ...defaultProps,
      validMoves: [
        { from: { row: 5, col: 2 }, to: { row: 4, col: 1 } },
        { from: { row: 5, col: 2 }, to: { row: 4, col: 3 } },
      ],
    };
    
    render(<Board {...props} />);
    
    // Check for highlighted valid move squares (looking for the green indicator)
    const indicators = document.querySelectorAll('.before\\:bg-green-400\\/50');
    expect(indicators).toHaveLength(2);
  });

  it('should highlight capture move squares', () => {
    const props = {
      ...defaultProps,
      validMoves: [
        { 
          from: { row: 5, col: 2 }, 
          to: { row: 3, col: 4 },
          captures: [{ row: 4, col: 3 }]
        },
      ],
    };
    
    render(<Board {...props} />);
    
    // Capture moves are shown the same as regular moves (green)
    const squares = document.querySelectorAll('.aspect-square');
    const targetSquare = squares[3 * 8 + 4];
    
    // Check that the square has a child element (the indicator)
    const indicator = targetSquare?.querySelector('.before\\:bg-green-400\\/50');
    expect(indicator).toBeTruthy();
  });

  it('should call onSquareClick when square is clicked', async () => {
    render(<Board {...defaultProps} />);
    
    const squares = document.querySelectorAll('.aspect-square');
    await userEvent.click(squares[0] as Element);
    
    expect(mockOnSquareClick).toHaveBeenCalledWith({ row: 0, col: 0 });
  });

  it('should handle drag start on pieces', () => {
    render(<Board {...defaultProps} />);
    
    const piece = document.querySelector('[draggable="true"]');
    if (piece) {
      const mockDataTransfer = {
        effectAllowed: '',
        setData: vi.fn(),
      };
      
      fireEvent.dragStart(piece, {
        dataTransfer: mockDataTransfer,
      });
      
      expect(mockOnDragStart).toHaveBeenCalled();
    }
  });

  it('should handle drag end', () => {
    render(<Board {...defaultProps} />);
    
    const piece = document.querySelector('[draggable="true"]');
    if (piece) {
      fireEvent.dragEnd(piece);
      expect(mockOnDragEnd).toHaveBeenCalled();
    }
  });

  it('should handle drop on valid squares', () => {
    const props = {
      ...defaultProps,
      validMoves: [
        { from: { row: 5, col: 2 }, to: { row: 4, col: 3 } },
      ],
    };
    
    render(<Board {...props} />);
    
    const squares = document.querySelectorAll('.aspect-square');
    const dropSquare = squares[4 * 8 + 3];
    
    fireEvent.drop(dropSquare as Element);
    expect(mockOnDrop).toHaveBeenCalledWith({ row: 4, col: 3 });
  });

  it('should display correct square colors', () => {
    render(<Board {...defaultProps} />);
    
    const squares = document.querySelectorAll('.aspect-square');
    
    // Check alternating colors
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = squares[row * 8 + col];
        const isDark = (row + col) % 2 === 1;
        
        if (isDark && square) {
          expect(square.className).toContain('from-amber-800');
        } else if (square) {
          expect(square.className).toContain('from-amber-100');
        }
      }
    }
  });

  it('should render board with correct structure', () => {
    render(<Board {...defaultProps} />);
    
    // The Board component doesn't include row/column labels
    // It's just the 8x8 grid of squares
    const grid = document.querySelector('.grid-cols-8');
    expect(grid).toBeInTheDocument();
    
    // Should have border styling
    expect(grid?.className).toContain('border-amber-950');
  });

  it('should render king pieces with crown icon', () => {
    const board = createTestBoard();
    board[2][3] = { color: 'red', type: 'king' };
    
    const props = {
      ...defaultProps,
      board,
    };
    
    render(<Board {...props} />);
    
    // Check for crown icon (King pieces have Crown component)
    const crowns = document.querySelectorAll('svg'); // Crown is an SVG
    expect(crowns.length).toBeGreaterThan(0);
  });

  it('should not allow dragging opponent pieces', () => {
    render(<Board {...defaultProps} />);
    
    // Find black piece (opponent when current player is red)
    const pieces = document.querySelectorAll('[draggable]');
    const blackPiece = Array.from(pieces).find(p => 
      p.getAttribute('draggable') === 'false'
    );
    
    expect(blackPiece).toBeDefined();
  });

  it('should have correct board structure', () => {
    render(<Board {...defaultProps} />);
    
    // Check for the grid container
    const grid = document.querySelector('.grid-cols-8');
    expect(grid).toBeInTheDocument();
    
    // Check that we have 64 squares
    const squares = document.querySelectorAll('.aspect-square');
    expect(squares).toHaveLength(64);
  });
});