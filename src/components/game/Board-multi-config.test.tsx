import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from './Board';
import { getBoardConfig, type BoardVariant } from '~/lib/board-config';
import { createInitialBoard } from '~/lib/game-logic';
import type { Board as BoardType, Position } from '~/lib/game-logic';

describe('Board Component - Multiple Configurations', () => {
  const mockOnSquareClick = vi.fn();
  const mockOnDragStart = vi.fn();
  const mockOnDragEnd = vi.fn();
  const mockOnDrop = vi.fn();

  const variants: BoardVariant[] = ['american', 'international', 'canadian'];

  describe.each(variants)('Board rendering - %s', (variant) => {
    const config = getBoardConfig(variant);
    const board = createInitialBoard(config);
    
    const defaultProps = {
      board,
      selectedPosition: null,
      draggingPosition: null,
      validMoves: [],
      mustCapturePositions: [],
      currentPlayer: 'red' as const,
      config,
      onSquareClick: mockOnSquareClick,
      onDragStart: mockOnDragStart,
      onDragEnd: mockOnDragEnd,
      onDrop: mockOnDrop,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it(`should render ${config.size * config.size} squares for ${config.name}`, () => {
      render(<Board {...defaultProps} />);
      
      const squares = document.querySelectorAll('.aspect-square');
      expect(squares).toHaveLength(config.size * config.size);
    });

    it(`should have correct grid layout for ${config.size}x${config.size} board`, () => {
      render(<Board {...defaultProps} />);
      
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      
      // Check if the grid style is applied
      const style = window.getComputedStyle(gridContainer as Element);
      expect(style.gridTemplateColumns).toContain(`repeat(${config.size}`);
    });

    it(`should render correct number of pieces for ${config.name}`, () => {
      render(<Board {...defaultProps} />);
      
      const expectedPiecesPerSide = Math.floor(config.size * config.pieceRows / 2);
      const totalExpectedPieces = expectedPiecesPerSide * 2;
      
      // Count draggable pieces (current player) and non-draggable (opponent)
      const allPieces = document.querySelectorAll('[draggable]');
      expect(allPieces).toHaveLength(totalExpectedPieces);
      
      // Count red pieces (draggable when currentPlayer is 'red')
      const draggablePieces = document.querySelectorAll('[draggable="true"]');
      expect(draggablePieces).toHaveLength(expectedPiecesPerSide);
    });

    it(`should position pieces correctly on ${config.size}x${config.size} board`, () => {
      render(<Board {...defaultProps} />);
      
      // Check that pieces are only on dark squares
      const squares = document.querySelectorAll('.aspect-square');
      squares.forEach((square, index) => {
        const row = Math.floor(index / config.size);
        const col = index % config.size;
        const isDark = (row + col) % 2 === 1;
        
        const hasPiece = square.querySelector('[draggable]');
        if (hasPiece) {
          // Pieces should only be on dark squares
          expect(isDark).toBe(true);
          
          // Pieces should be in correct rows
          const inTopRows = row < config.pieceRows;
          const inBottomRows = row >= config.size - config.pieceRows;
          expect(inTopRows || inBottomRows).toBe(true);
        }
      });
    });
  });

  describe('Board interactions with different configs', () => {
    it.each(variants)('should handle clicks on %s board', async (variant) => {
      const config = getBoardConfig(variant);
      const board = createInitialBoard(config);
      
      const props = {
        board,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        mustCapturePositions: [],
        currentPlayer: 'red' as const,
        config,
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
        config.size - 1, // Last square in first row
        config.size * config.size - 1, // Last square
        Math.floor(config.size * config.size / 2), // Middle square
      ];
      
      for (const pos of testPositions) {
        if (squares[pos]) {
          await userEvent.click(squares[pos] as Element);
          
          const expectedRow = Math.floor(pos / config.size);
          const expectedCol = pos % config.size;
          
          expect(mockOnSquareClick).toHaveBeenCalledWith(
            { row: expectedRow, col: expectedCol },
            expect.any(Object)
          );
        }
      }
    });

    it.each(variants)('should handle drag and drop on %s board', (variant) => {
      const config = getBoardConfig(variant);
      const board = createInitialBoard(config);
      
      // Place a red piece in a position where it can move
      const testRow = config.size - config.pieceRows;
      let pieceCol = -1;
      for (let col = 0; col < config.size; col++) {
        if (board[testRow][col]?.color === 'red') {
          pieceCol = col;
          break;
        }
      }
      
      const props = {
        board,
        selectedPosition: null,
        draggingPosition: null,
        validMoves: [],
        mustCapturePositions: [],
        currentPlayer: 'red' as const,
        config,
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
      const config = getBoardConfig(variant);
      const board = createInitialBoard(config);
      
      const midRow = Math.floor(config.size / 2);
      const midCol = Math.floor(config.size / 2);
      
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
        config,
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
      const config = getBoardConfig(variant);
      const board = createInitialBoard(config);
      
      const selectedPos = {
        row: Math.floor(config.size / 2),
        col: Math.floor(config.size / 2)
      };
      
      const props = {
        board,
        selectedPosition: selectedPos,
        draggingPosition: null,
        validMoves: [],
        mustCapturePositions: [],
        currentPlayer: 'red' as const,
        config,
        onSquareClick: mockOnSquareClick,
        onDragStart: mockOnDragStart,
        onDragEnd: mockOnDragEnd,
        onDrop: mockOnDrop,
      };
      
      render(<Board {...props} />);
      
      const squares = document.querySelectorAll('.aspect-square');
      const selectedIndex = selectedPos.row * config.size + selectedPos.col;
      const selectedSquare = squares[selectedIndex];
      
      // Check for selection styling (box shadow in this case)
      const style = window.getComputedStyle(selectedSquare as Element);
      expect(style.boxShadow).toContain('inset');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle empty board for all configs', () => {
      variants.forEach(variant => {
        const config = getBoardConfig(variant);
        const emptyBoard: BoardType = Array(config.size)
          .fill(null)
          .map(() => Array(config.size).fill(null));
        
        const props = {
          board: emptyBoard,
          selectedPosition: null,
          draggingPosition: null,
          validMoves: [],
          mustCapturePositions: [],
          currentPlayer: 'red' as const,
          config,
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
        expect(squares).toHaveLength(config.size * config.size);
        
        const pieces = container.querySelectorAll('[draggable]');
        expect(pieces).toHaveLength(0);
      });
    });

    it('should handle maximum piece configurations', () => {
      variants.forEach(variant => {
        const config = getBoardConfig(variant);
        const maxBoard: BoardType = Array(config.size)
          .fill(null)
          .map(() => Array(config.size).fill(null));
        
        // Fill all dark squares with pieces
        for (let row = 0; row < config.size; row++) {
          for (let col = 0; col < config.size; col++) {
            if ((row + col) % 2 === 1) {
              maxBoard[row][col] = { 
                color: row < config.size / 2 ? 'black' : 'red', 
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
          config,
          onSquareClick: mockOnSquareClick,
          onDragStart: mockOnDragStart,
          onDragEnd: mockOnDragEnd,
          onDrop: mockOnDrop,
        };
        
        const { container } = render(<Board {...props} />);
        
        // Should handle maximum pieces without errors
        const pieces = container.querySelectorAll('[draggable]');
        const maxPossiblePieces = Math.floor(config.size * config.size / 2);
        expect(pieces).toHaveLength(maxPossiblePieces);
      });
    });
  });
});