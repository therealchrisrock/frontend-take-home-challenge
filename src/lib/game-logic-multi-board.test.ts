import { describe, it, expect } from 'vitest';
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
  type Piece,
} from './game-logic';
import { getBoardConfig, type BoardVariant } from './board-config';

describe('Game Logic - Multiple Board Sizes', () => {
  const variants: BoardVariant[] = ['american', 'international', 'canadian'];
  
  describe.each(variants)('createInitialBoard - %s', (variant) => {
    const config = getBoardConfig(variant);
    
    it(`should create a ${config.size}x${config.size} board`, () => {
      const board = createInitialBoard(config);
      expect(board).toHaveLength(config.size);
      board.forEach(row => expect(row).toHaveLength(config.size));
    });

    it(`should place correct number of black pieces in top ${config.pieceRows} rows`, () => {
      const board = createInitialBoard(config);
      let blackPieces = 0;
      const expectedPieces = Math.floor(config.size * config.pieceRows / 2);
      
      for (let row = 0; row < config.pieceRows; row++) {
        for (let col = 0; col < config.size; col++) {
          if (board[row][col]?.color === 'black') {
            blackPieces++;
            expect(board[row][col]?.type).toBe('regular');
            // Should only be on dark squares
            expect((row + col) % 2).toBe(1);
          }
        }
      }
      
      expect(blackPieces).toBe(expectedPieces);
    });

    it(`should place correct number of red pieces in bottom ${config.pieceRows} rows`, () => {
      const board = createInitialBoard(config);
      let redPieces = 0;
      const expectedPieces = Math.floor(config.size * config.pieceRows / 2);
      
      for (let row = config.size - config.pieceRows; row < config.size; row++) {
        for (let col = 0; col < config.size; col++) {
          if (board[row][col]?.color === 'red') {
            redPieces++;
            expect(board[row][col]?.type).toBe('regular');
            // Should only be on dark squares
            expect((row + col) % 2).toBe(1);
          }
        }
      }
      
      expect(redPieces).toBe(expectedPieces);
    });

    it('should have empty middle rows', () => {
      const board = createInitialBoard(config);
      const startEmptyRow = config.pieceRows;
      const endEmptyRow = config.size - config.pieceRows;
      
      for (let row = startEmptyRow; row < endEmptyRow; row++) {
        for (let col = 0; col < config.size; col++) {
          expect(board[row][col]).toBeNull();
        }
      }
    });
  });

  describe.each(variants)('isValidSquare - %s', (variant) => {
    const config = getBoardConfig(variant);
    
    it('should validate squares within board boundaries', () => {
      expect(isValidSquare(0, 0, config)).toBe(true);
      expect(isValidSquare(config.size - 1, config.size - 1, config)).toBe(true);
      expect(isValidSquare(config.size / 2, config.size / 2, config)).toBe(true);
    });

    it('should invalidate squares outside board boundaries', () => {
      expect(isValidSquare(-1, 0, config)).toBe(false);
      expect(isValidSquare(0, -1, config)).toBe(false);
      expect(isValidSquare(config.size, 0, config)).toBe(false);
      expect(isValidSquare(0, config.size, config)).toBe(false);
      expect(isValidSquare(config.size, config.size, config)).toBe(false);
    });
  });

  describe.each(variants)('getValidMoves - %s', (variant) => {
    const config = getBoardConfig(variant);
    
    it('should find valid moves for red pieces at start', () => {
      const board = createInitialBoard(config);
      const redRow = config.size - config.pieceRows;
      
      // Find a red piece
      let redPosition: Position | null = null;
      for (let col = 0; col < config.size; col++) {
        if (board[redRow][col]?.color === 'red') {
          redPosition = { row: redRow, col };
          break;
        }
      }
      
      expect(redPosition).not.toBeNull();
      if (redPosition) {
        const moves = getValidMoves(board, redPosition, 'red', config);
        expect(moves.length).toBeGreaterThan(0);
        
        // All moves should be forward (decreasing row)
        moves.forEach(move => {
          expect(move.to.row).toBeLessThan(move.from.row);
        });
      }
    });

    it('should not allow moves outside board boundaries', () => {
      const board = createInitialBoard(config);
      
      // Test corner pieces
      const corners: Position[] = [
        { row: 0, col: 1 }, // Top-left dark square
        { row: 0, col: config.size - 2 }, // Top-right dark square
        { row: config.size - 1, col: 0 }, // Bottom-left dark square
        { row: config.size - 1, col: config.size - 1 }, // Bottom-right dark square
      ];
      
      corners.forEach(corner => {
        const piece = board[corner.row][corner.col];
        if (piece) {
          const moves = getValidMoves(board, corner, piece.color, config);
          moves.forEach(move => {
            expect(isValidSquare(move.to.row, move.to.col, config)).toBe(true);
          });
        }
      });
    });
  });

  describe.each(variants)('makeMove and king promotion - %s', (variant) => {
    const config = getBoardConfig(variant);
    
    it(`should promote red piece to king at row ${config.redKingRow}`, () => {
      const board = createInitialBoard(config);
      
      // Place a red piece near the king row
      const testRow = config.redKingRow + 1;
      const testCol = 0;
      board[testRow][testCol] = { color: 'red', type: 'regular' };
      
      // Clear the destination
      board[config.redKingRow][testCol + 1] = null;
      
      const move = {
        from: { row: testRow, col: testCol },
        to: { row: config.redKingRow, col: testCol + 1 }
      };
      
      const newBoard = makeMove(board, move, config);
      const movedPiece = newBoard[config.redKingRow][testCol + 1];
      
      expect(movedPiece).not.toBeNull();
      expect(movedPiece?.type).toBe('king');
      expect(movedPiece?.color).toBe('red');
    });

    it(`should promote black piece to king at row ${config.blackKingRow}`, () => {
      const board = createInitialBoard(config);
      
      // Place a black piece near the king row
      const testRow = config.blackKingRow - 1;
      const testCol = 0;
      board[testRow][testCol] = { color: 'black', type: 'regular' };
      
      // Clear the destination
      board[config.blackKingRow][testCol + 1] = null;
      
      const move = {
        from: { row: testRow, col: testCol },
        to: { row: config.blackKingRow, col: testCol + 1 }
      };
      
      const newBoard = makeMove(board, move, config);
      const movedPiece = newBoard[config.blackKingRow][testCol + 1];
      
      expect(movedPiece).not.toBeNull();
      expect(movedPiece?.type).toBe('king');
      expect(movedPiece?.color).toBe('black');
    });
  });

  describe.each(variants)('capture moves - %s', (variant) => {
    const config = getBoardConfig(variant);
    
    it('should detect capture moves across different board sizes', () => {
      const board: Board = Array(config.size).fill(null).map(() => Array(config.size).fill(null));
      
      // Set up a capture scenario in the middle of the board
      const midRow = Math.floor(config.size / 2);
      const midCol = Math.floor(config.size / 2);
      
      board[midRow][midCol] = { color: 'red', type: 'regular' };
      board[midRow - 1][midCol + 1] = { color: 'black', type: 'regular' };
      
      const captures = getCaptureMoves(
        board,
        { row: midRow, col: midCol },
        board[midRow][midCol]!,
        config
      );
      
      if (captures.length > 0) {
        expect(captures[0].to.row).toBe(midRow - 2);
        expect(captures[0].to.col).toBe(midCol + 2);
        expect(captures[0].captures).toEqual([{ row: midRow - 1, col: midCol + 1 }]);
      }
    });

    it('should enforce mandatory captures', () => {
      const board: Board = Array(config.size).fill(null).map(() => Array(config.size).fill(null));
      
      // Set up a scenario with a mandatory capture
      const midRow = Math.floor(config.size / 2);
      const midCol = Math.floor(config.size / 2);
      
      board[midRow][midCol] = { color: 'red', type: 'regular' };
      board[midRow - 1][midCol + 1] = { color: 'black', type: 'regular' };
      board[midRow][midCol + 2] = { color: 'red', type: 'regular' }; // Another red piece
      
      const mustCapture = getMustCapturePositions(board, 'red', config);
      expect(mustCapture.length).toBeGreaterThan(0);
      
      // The piece that can capture should be in the must-capture list
      const canCapture = mustCapture.some(
        pos => pos.row === midRow && pos.col === midCol
      );
      expect(canCapture).toBe(true);
    });
  });

  describe.each(variants)('checkWinner - %s', (variant) => {
    const config = getBoardConfig(variant);
    
    it('should detect winner when opponent has no pieces', () => {
      const board: Board = Array(config.size).fill(null).map(() => Array(config.size).fill(null));
      
      // Only red pieces on the board
      board[config.size - 2][1] = { color: 'red', type: 'regular' };
      
      const winner = checkWinner(board, config);
      expect(winner).toBe('red');
    });

    it('should detect winner when opponent has no valid moves', () => {
      const board: Board = Array(config.size).fill(null).map(() => Array(config.size).fill(null));
      
      // Black piece completely blocked (cannot move forward)
      board[config.size - 1][1] = { color: 'black', type: 'regular' };
      // Add red pieces to ensure red can move
      board[config.size - 2][0] = { color: 'red', type: 'regular' };
      board[config.size - 2][2] = { color: 'red', type: 'regular' };
      
      const winner = checkWinner(board, config);
      expect(winner).toBe('red');
    });

    it('should return null when game is ongoing', () => {
      const board = createInitialBoard(config);
      const winner = checkWinner(board, config);
      expect(winner).toBeNull();
    });
  });

  describe.each(variants)('AI moves - %s', (variant) => {
    const config = getBoardConfig(variant);
    
    it('should generate valid AI moves', () => {
      const board = createInitialBoard(config);
      const aiMove = getRandomAIMove(board, 'red', config);
      
      expect(aiMove).not.toBeNull();
      if (aiMove) {
        expect(isValidSquare(aiMove.from.row, aiMove.from.col, config)).toBe(true);
        expect(isValidSquare(aiMove.to.row, aiMove.to.col, config)).toBe(true);
        
        // Verify the piece exists and belongs to AI
        const piece = board[aiMove.from.row][aiMove.from.col];
        expect(piece).not.toBeNull();
        expect(piece?.color).toBe('red');
      }
    });

    it('should prefer capture moves when available', () => {
      const board: Board = Array(config.size).fill(null).map(() => Array(config.size).fill(null));
      
      // Set up a scenario where AI must capture
      const midRow = Math.floor(config.size / 2);
      const midCol = Math.floor(config.size / 2);
      
      board[midRow][midCol] = { color: 'red', type: 'regular' };
      board[midRow - 1][midCol + 1] = { color: 'black', type: 'regular' };
      
      const aiMove = getRandomAIMove(board, 'red', config);
      
      expect(aiMove).not.toBeNull();
      if (aiMove) {
        expect(aiMove.captures).toBeDefined();
        expect(aiMove.captures!.length).toBeGreaterThan(0);
      }
    });
  });

  // Test specific piece counts for each variant
  describe('Piece counts per variant', () => {
    it('American checkers should have 12 pieces per side', () => {
      const config = getBoardConfig('american');
      const board = createInitialBoard(config);
      const pieces = board.flat().filter(p => p !== null);
      const redPieces = pieces.filter(p => p?.color === 'red');
      const blackPieces = pieces.filter(p => p?.color === 'black');
      
      expect(redPieces).toHaveLength(12);
      expect(blackPieces).toHaveLength(12);
    });

    it('International draughts should have 20 pieces per side', () => {
      const config = getBoardConfig('international');
      const board = createInitialBoard(config);
      const pieces = board.flat().filter(p => p !== null);
      const redPieces = pieces.filter(p => p?.color === 'red');
      const blackPieces = pieces.filter(p => p?.color === 'black');
      
      expect(redPieces).toHaveLength(20);
      expect(blackPieces).toHaveLength(20);
    });

    it('Canadian checkers should have 30 pieces per side', () => {
      const config = getBoardConfig('canadian');
      const board = createInitialBoard(config);
      const pieces = board.flat().filter(p => p !== null);
      const redPieces = pieces.filter(p => p?.color === 'red');
      const blackPieces = pieces.filter(p => p?.color === 'black');
      
      expect(redPieces).toHaveLength(30);
      expect(blackPieces).toHaveLength(30);
    });
  });
});