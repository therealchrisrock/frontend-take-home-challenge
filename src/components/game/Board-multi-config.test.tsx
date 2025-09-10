import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from './Board';
import type { BoardVariant } from '~/lib/variants';
import { createInitialBoard } from '~/lib/game-logic';
import type { Board as BoardType } from '~/lib/game-logic';

describe('Board Component - Multiple Configurations', () => {
  const mockOnSquareClick = vi.fn();
  const mockOnDragStart = vi.fn();
  const mockOnDragEnd = vi.fn();
  const mockOnDrop = vi.fn();

  const variants: BoardVariant[] = ['american', 'international', 'canadian'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.each(variants)('Board rendering - %s', (variant) => {
    const board = createInitialBoard();
    const size = 8; // Board component currently only supports 8x8, regardless of variant
    
    const defaultProps = {
      board,
      selectedPosition: null,
      draggingPosition: null,
      validMoves: [],
      mustCapturePositions: [],
      currentPlayer: 'red' as const,
      size,
      onSquareClick: mockOnSquareClick,
      onDragStart: mockOnDragStart,
      onDragEnd: mockOnDragEnd,
      onDrop: mockOnDrop,
    };

    it(`should render ${size * size} squares for ${variant}`, () => {
      render(<Board {...defaultProps} />);
      
      const squares = document.querySelectorAll('.aspect-square');
      expect(squares).toHaveLength(size * size);
    });

    it(`should have correct grid layout for ${size}x${size} board`, () => {
      render(<Board {...defaultProps} />);
      
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      
      // Check if the grid style is applied
      const style = window.getComputedStyle(gridContainer!);
      expect(style.gridTemplateColumns).toContain(`repeat(${size}`);
    });

    it(`should render correct number of pieces for ${variant}`, () => {
      render(<Board {...defaultProps} />);
      
      const pieceRows = Math.floor(size / 2) - 1;
      const expectedPiecesPerSide = Math.floor(size * pieceRows / 2);
      const totalExpectedPieces = expectedPiecesPerSide * 2;
      
      // Count draggable pieces (current player) and non-draggable (opponent)
      const allPieces = document.querySelectorAll('[draggable]');
      expect(allPieces).toHaveLength(totalExpectedPieces);
      
      // Count red pieces (draggable when currentPlayer is 'red')
      const draggablePieces = document.querySelectorAll('[draggable="true"]');
      expect(draggablePieces).toHaveLength(expectedPiecesPerSide);
    });

    it(`should position pieces correctly on ${size}x${size} board`, () => {
      render(<Board {...defaultProps} />);
      
      // Check that pieces are only on dark squares
      const squares = document.querySelectorAll('.aspect-square');
      squares.forEach((square, index) => {
        const row = Math.floor(index / size);
        const col = index % size;
        const isDark = (row + col) % 2 === 1;
        
        const hasPiece = square.querySelector('[draggable]');
        if (hasPiece) {
          // Pieces should only be on dark squares
          expect(isDark).toBe(true);
          
          // Pieces should be in correct rows
          const pieceRows = Math.floor(size / 2) - 1;
          const inTopRows = row < pieceRows;
          const inBottomRows = row >= size - pieceRows;
          expect(inTopRows || inBottomRows).toBe(true);
        }
      });
    });
  });

  describe('Board interactions with different configs', () => {
    it.each(variants)('should handle clicks on %s board', async (variant) => {
      const board = createInitialBoard();
      const size = 8; // Board component currently only supports 8x8
      
      const props = {
        board,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        mustCapturePositions: [],
        currentPlayer: 'red' as const,
        size,
        onSquareClick: mockOnSquareClick,
        onDragStart: mockOnDragStart,
        onDragEnd: mockOnDragEnd,
        onDrop: mockOnDrop,
      };
      
      render(<Board {...props} />);
      
      const squares = document.querySelectorAll('.aspect-square');
      
      // Click on different positions based on board size
      const testPositions = [
        0, // First square
        size - 1, // Last square in first row
        size * size - 1, // Last square
        Math.floor(size * size / 2), // Middle square
      ];
      
      for (const pos of testPositions) {
        if (squares[pos]) {
          await userEvent.click(squares[pos]);
          
          const expectedRow = Math.floor(pos / size);
          const expectedCol = pos % size;
          
          expect(mockOnSquareClick).toHaveBeenCalledWith(
            { row: expectedRow, col: expectedCol }
          );
        }
      }
    });

    it.each(variants)('should handle drag and drop on %s board', (variant) => {
      const board = createInitialBoard();
      const size = 8; // Board component currently only supports 8x8
      
      // Test drag and drop functionality
      
      const props = {
        board,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        mustCapturePositions: [],
        currentPlayer: 'red' as const,
        size,
        onSquareClick: mockOnSquareClick,
        onDragStart: mockOnDragStart,
        onDragEnd: mockOnDragEnd,
        onDrop: mockOnDrop,
      };
      
      render(<Board {...props} />);
      
      const pieces = document.querySelectorAll('[draggable="true"]');
      expect(pieces.length).toBeGreaterThan(0);
      
      if (pieces[0]) {
        const mockDataTransfer = {
          effectAllowed: '',
          setData: vi.fn(),
        };
        
        fireEvent.dragStart(pieces[0], {
          dataTransfer: mockDataTransfer,
        });
        
        expect(mockOnDragStart).toHaveBeenCalled();
        
        fireEvent.dragEnd(pieces[0]);
        expect(mockOnDragEnd).toHaveBeenCalled();
      }
    });
  });

  describe('Board display features', () => {
    it.each(variants)('should show valid moves on %s board', (variant) => {
      const board = createInitialBoard();
      const size = 8; // Board component currently only supports 8x8
      
      const midRow = Math.floor(size / 2);
      const midCol = Math.floor(size / 2);
      
      const props = {
        board,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [
          { from: { row: midRow, col: midCol }, to: { row: midRow - 1, col: midCol - 1 } },
          { from: { row: midRow, col: midCol }, to: { row: midRow - 1, col: midCol + 1 } },
        ],
        mustCapturePositions: [],
        currentPlayer: 'red' as const,
        size,
        onSquareClick: mockOnSquareClick,
        onDragStart: mockOnDragStart,
        onDragEnd: mockOnDragEnd,
        onDrop: mockOnDrop,
      };
      
      render(<Board {...props} />);
      
      // Check for move indicators
      const indicators = document.querySelectorAll('.animate-pulse');
      expect(indicators).toHaveLength(2);
    });

    it.each(variants)('should highlight selected square on %s board', (variant) => {
      const board = createInitialBoard();
      const size = 8; // Board component currently only supports 8x8
      
      const selectedPos = {
        row: Math.floor(size / 2),
        col: Math.floor(size / 2)
      };
      
      const props = {
        board,
        selectedPosition: selectedPos,
        draggingPosition: null,
        validMoves: [],
        mustCapturePositions: [],
        currentPlayer: 'red' as const,
        size,
        onSquareClick: mockOnSquareClick,
        onDragStart: mockOnDragStart,
        onDragEnd: mockOnDragEnd,
        onDrop: mockOnDrop,
      };
      
      render(<Board {...props} />);
      
      const squares = document.querySelectorAll('.aspect-square');
      const selectedIndex = selectedPos.row * size + selectedPos.col;
      const selectedSquare = squares[selectedIndex];
      
      // Check for selection styling (box shadow in this case)
      const style = window.getComputedStyle(selectedSquare!);
      expect(style.boxShadow).toContain('inset');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle empty board for all configs', () => {
      variants.forEach(variant => {
        const size = 8; // Board component currently only supports 8x8
        const createEmptyBoard = (size: number): BoardType => {
          return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
        };
        const emptyBoard = createEmptyBoard(size);
        
        const props = {
          board: emptyBoard,
          selectedPosition: null,
          draggingPosition: null,
          validMoves: [],
          mustCapturePositions: [],
          currentPlayer: 'red' as const,
          size,
          onSquareClick: mockOnSquareClick,
          onDragStart: mockOnDragStart,
          onDragEnd: mockOnDragEnd,
          onDrop: mockOnDrop,
        };
        
        const { container } = render(<Board {...props} />);
        
        // Should render without errors
        expect(container).toBeInTheDocument();
        
        // Should have all squares but no pieces
        const squares = container.querySelectorAll('.aspect-square');
        expect(squares).toHaveLength(size * size);
        
        const pieces = container.querySelectorAll('[draggable]');
        expect(pieces).toHaveLength(0);
      });
    });

    it('should handle maximum piece configurations', () => {
      variants.forEach(variant => {
        const size = 8; // Board component currently only supports 8x8
        const createMaxBoard = (size: number): BoardType => {
          return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
        };
        const maxBoard = createMaxBoard(size);
        
        // Fill all dark squares with pieces
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            if ((row + col) % 2 === 1) {
              maxBoard[row]![col] = { 
                color: row < size / 2 ? 'black' : 'red', 
                type: 'regular' 
              };
            }
          }
        }
        
        const props = {
          board: maxBoard,
          selectedPosition: null,
          draggingPosition: null,
          validMoves: [],
          mustCapturePositions: [],
          currentPlayer: 'red' as const,
          size,
          onSquareClick: mockOnSquareClick,
          onDragStart: mockOnDragStart,
          onDragEnd: mockOnDragEnd,
          onDrop: mockOnDrop,
        };
        
        const { container } = render(<Board {...props} />);
        
        // Should handle maximum pieces without errors
        const pieces = container.querySelectorAll('[draggable]');
        const maxPossiblePieces = Math.floor(size * size / 2);
        expect(pieces).toHaveLength(maxPossiblePieces);
      });
    });
  });
});