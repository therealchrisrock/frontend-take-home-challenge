/**
 * Test suite for the configuration-driven game rules engine
 * Tests all draughts variants through configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameRules } from '../game-rules';
import { GameConfigLoader } from '../config-loader';
import { ConfigValidator } from '../rule-schema';
import type { VariantConfig } from '../rule-schema';

describe('Game Rules Engine', () => {
  describe('Configuration Loading', () => {
    it('should load all built-in variants', () => {
      const variants = GameConfigLoader.getBuiltInVariants();
      expect(variants).toContain('american');
      expect(variants).toContain('brazilian');
      expect(variants).toContain('international');
    });

    it('should load American variant configuration', async () => {
      const config = await GameConfigLoader.loadVariant('american');
      expect(config.metadata.name).toBe('american');
      expect(config.board.size).toBe(8);
      expect(config.board.pieceCount).toBe(12);
      expect(config.board.startingRows.black).toEqual([0, 1, 2]);
      expect(config.board.startingRows.red).toEqual([5, 6, 7]);
    });

    it('should load International variant configuration', async () => {
      const config = await GameConfigLoader.loadVariant('international');
      expect(config.metadata.name).toBe('international');
      expect(config.board.size).toBe(10);
      expect(config.board.pieceCount).toBe(20);
      expect(config.board.startingRows.black).toEqual([0, 1, 2, 3]);
      expect(config.board.startingRows.red).toEqual([6, 7, 8, 9]);
    });

    it('should validate configurations', async () => {
      const config = await GameConfigLoader.loadVariant('american');
      const validation = ConfigValidator.validateWithErrors(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('American Checkers', () => {
    let rules: GameRules;

    beforeEach(async () => {
      rules = new GameRules('american');
      await rules.initialize();
    });

    it('should create initial 8x8 board with 12 pieces per player', () => {
      const board = rules.createInitialBoard();
      expect(board).toHaveLength(8);
      expect(board[0]).toHaveLength(8);

      // Count pieces
      let blackPieces = 0;
      let redPieces = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row]![col];
          if (piece) {
            if (piece.color === 'black') blackPieces++;
            else redPieces++;
          }
        }
      }
      expect(blackPieces).toBe(12);
      expect(redPieces).toBe(12);
    });

    it('should have correct movement directions for regular pieces', () => {
      const redDirections = rules.getValidDirections({ color: 'red', type: 'regular' });
      expect(redDirections).toEqual([[-1, -1], [-1, 1]]);

      const blackDirections = rules.getValidDirections({ color: 'black', type: 'regular' });
      expect(blackDirections).toEqual([[1, -1], [1, 1]]);
    });

    it('should have correct movement directions for kings', () => {
      const kingDirections = rules.getValidDirections({ color: 'red', type: 'king' });
      expect(kingDirections).toEqual([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    });

    it('should allow backward captures only for kings', () => {
      expect(rules.canCaptureBackward({ color: 'red', type: 'regular' })).toBe(false);
      expect(rules.canCaptureBackward({ color: 'red', type: 'king' })).toBe(true);
    });

    it('should allow flying kings', () => {
      expect(rules.canFlyAsKing()).toBe(true);
    });

    it('should require mandatory captures but not maximum', () => {
      expect(rules.isMandatoryCapture()).toBe(true);
      expect(rules.requiresMaximumCapture()).toBe(false);
    });

    it('should handle promotion correctly', () => {
      expect(rules.shouldPromote({ color: 'red', type: 'regular' }, 0)).toBe(true);
      expect(rules.shouldPromote({ color: 'black', type: 'regular' }, 7)).toBe(true);
      expect(rules.shouldPromote({ color: 'red', type: 'king' }, 0)).toBe(false);
    });

    it('should validate moves correctly', () => {
      const board = rules.createInitialBoard();
      
      // Valid forward move for red piece
      const validMove = {
        from: { row: 5, col: 0 },
        to: { row: 4, col: 1 }
      };
      expect(rules.validateMove(board, validMove)).toBe(true);

      // Invalid backward move for regular red piece
      const invalidMove = {
        from: { row: 5, col: 0 },
        to: { row: 6, col: 1 }
      };
      expect(rules.validateMove(board, invalidMove)).toBe(false);
    });

    it('should apply moves and promote pieces', () => {
      const board = rules.createInitialBoard();
      
      // Create a scenario where red piece can promote
      board[1]![2] = { color: 'red', type: 'regular' };
      board[0]![1] = null; // Clear destination
      
      const move = {
        from: { row: 1, col: 2 },
        to: { row: 0, col: 1 }
      };

      const newBoard = rules.makeMove(board, move);
      expect(newBoard[0]![1]).toEqual({ color: 'red', type: 'king' });
      expect(newBoard[1]![2]).toBeNull();
    });
  });

  describe('Brazilian Draughts', () => {
    let rules: GameRules;

    beforeEach(async () => {
      rules = new GameRules('brazilian');
      await rules.initialize();
    });

    it('should allow backward captures for all pieces', () => {
      expect(rules.canCaptureBackward({ color: 'red', type: 'regular' })).toBe(true);
      expect(rules.canCaptureBackward({ color: 'black', type: 'regular' })).toBe(true);
      expect(rules.canCaptureBackward({ color: 'red', type: 'king' })).toBe(true);
    });

    it('should require maximum capture and king priority', () => {
      expect(rules.requiresMaximumCapture()).toBe(true);
      expect(rules.requiresKingPriority()).toBe(true);
    });

    it('should have same 8x8 board setup as American', () => {
      const board = rules.createInitialBoard();
      expect(board).toHaveLength(8);
      expect(rules.getBoardSize()).toBe(8);
      expect(rules.getPieceCount()).toBe(12);
    });
  });

  describe('International Draughts', () => {
    let rules: GameRules;

    beforeEach(async () => {
      rules = new GameRules('international');
      await rules.initialize();
    });

    it('should create 10x10 board with 20 pieces per player', () => {
      const board = rules.createInitialBoard();
      expect(board).toHaveLength(10);
      expect(board[0]).toHaveLength(10);
      expect(rules.getBoardSize()).toBe(10);
      expect(rules.getPieceCount()).toBe(20);
    });

    it('should place pieces on correct starting rows', () => {
      const board = rules.createInitialBoard();
      
      // Count pieces by color
      let blackPieces = 0;
      let redPieces = 0;
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          const piece = board[row]![col];
          if (piece) {
            if (piece.color === 'black') blackPieces++;
            else redPieces++;
          }
        }
      }
      expect(blackPieces).toBe(20);
      expect(redPieces).toBe(20);
    });

    it('should allow backward captures for all pieces', () => {
      expect(rules.canCaptureBackward({ color: 'red', type: 'regular' })).toBe(true);
      expect(rules.canCaptureBackward({ color: 'black', type: 'regular' })).toBe(true);
    });

    it('should require maximum capture and king priority', () => {
      expect(rules.requiresMaximumCapture()).toBe(true);
      expect(rules.requiresKingPriority()).toBe(true);
    });
  });

  describe('Custom Variants', () => {
    it('should register and use custom variant configurations', async () => {
      const customConfig = await GameConfigLoader.loadVariant('american');
      customConfig.metadata.name = 'custom';
      customConfig.metadata.displayName = 'Custom Test Variant';
      customConfig.movement.regularPieces.canCaptureBackward = true;

      GameConfigLoader.registerCustomVariant('custom', customConfig);
      
      const rules = new GameRules('custom');
      await rules.initialize();
      
      expect(rules.displayName).toBe('Custom Test Variant');
      expect(rules.canCaptureBackward({ color: 'red', type: 'regular' })).toBe(true);
    });

    it('should validate custom configurations', () => {
      const validConfig = {
        metadata: {
          name: 'test',
          displayName: 'Test Variant',
          description: 'A test variant',
          popularity: 'rare'
        },
        board: {
          size: 8,
          pieceCount: 12,
          startingRows: { black: [0, 1, 2], red: [5, 6, 7] }
        },
        movement: {
          regularPieces: {
            directions: { red: 'forward', black: 'forward' },
            canCaptureBackward: false
          },
          kings: {
            canFly: true,
            canCaptureBackward: true
          }
        },
        capture: {
          mandatory: true,
          requireMaximum: false,
          kingPriority: false,
          chainCaptures: true,
          captureDirection: { regular: 'all', king: 'all' },
          promotion: { duringCapture: false, stopsCaptureChain: true }
        },
        promotion: { toOppositeEnd: true, immediateEffect: true },
        draws: {
          fortyMoveRule: false,
          twentyFiveMoveRule: false,
          repetitionLimit: 3,
          insufficientMaterial: true,
          staleMate: true
        },
        schemaVersion: '1.0.0'
      } as VariantConfig;

      const validation = ConfigValidator.validateWithErrors(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Draw Conditions', () => {
    let rules: GameRules;

    beforeEach(async () => {
      rules = new GameRules('american');
      await rules.initialize();
    });

    it('should detect insufficient material', () => {
      // Create board with only two kings
      const board = Array(8).fill(null).map(() => Array(8).fill(null));
      board[0]![1] = { color: 'red', type: 'king' };
      board[7]![0] = { color: 'black', type: 'king' };

      const result = rules.checkDrawCondition(board, []);
      expect(result).toBe('draw');
    });
  });

  describe('Tournament Features', () => {
    it('should load tournament-specific configurations', async () => {
      const config = await GameConfigLoader.loadVariant('american');
      
      if (config.tournament) {
        expect(config.tournament.touchMove).toBe(true);
        expect(config.tournament.notation.required).toBe(true);
        expect(config.tournament.timeControls?.enabled).toBe(true);
      }
    });

    it('should have different time controls per variant', async () => {
      const americanConfig = await GameConfigLoader.loadVariant('american');
      const internationalConfig = await GameConfigLoader.loadVariant('international');
      
      if (americanConfig.tournament?.timeControls && internationalConfig.tournament?.timeControls) {
        expect(americanConfig.tournament.timeControls.classical.baseTime).toBe(60);
        expect(internationalConfig.tournament.timeControls.classical.baseTime).toBe(120);
      }
    });
  });
});