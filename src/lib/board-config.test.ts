import { describe, it, expect } from 'vitest';
import {
  getBoardConfig,
  getBoardVariants,
  getBoardGridStyle,
  getMaxBoardSize,
  BOARD_CONFIGS,
  type BoardVariant,
} from './board-config';

describe('Board Configuration System', () => {
  describe('getBoardConfig', () => {
    it('should return American checkers config by default', () => {
      const config = getBoardConfig();
      expect(config.size).toBe(8);
      expect(config.pieceRows).toBe(3);
      expect(config.name).toBe('American Checkers');
    });

    it('should return correct config for each variant', () => {
      const testCases: Array<[BoardVariant, number, number]> = [
        ['american', 8, 3],
        ['international', 10, 4],
        ['canadian', 12, 5],
        ['brazilian', 8, 3],
      ];

      testCases.forEach(([variant, expectedSize, expectedRows]) => {
        const config = getBoardConfig(variant);
        expect(config.size).toBe(expectedSize);
        expect(config.pieceRows).toBe(expectedRows);
        expect(config.redKingRow).toBe(0);
        expect(config.blackKingRow).toBe(expectedSize - 1);
      });
    });

    it('should have proper descriptions', () => {
      expect(getBoardConfig('american').description).toContain('8×8');
      expect(getBoardConfig('international').description).toContain('10×10');
      expect(getBoardConfig('canadian').description).toContain('12×12');
    });
  });

  describe('getBoardVariants', () => {
    it('should return all available variants', () => {
      const variants = getBoardVariants();
      expect(variants).toContain('american');
      expect(variants).toContain('international');
      expect(variants).toContain('canadian');
      expect(variants).toContain('brazilian');
      expect(variants.length).toBe(4);
    });
  });

  describe('getBoardGridStyle', () => {
    it('should generate correct CSS for 8x8 board', () => {
      const config = getBoardConfig('american');
      const style = getBoardGridStyle(config);
      expect(style['--board-size']).toBe('8');
      expect(style.gridTemplateColumns).toBe('repeat(8, minmax(0, 1fr))');
    });

    it('should generate correct CSS for 10x10 board', () => {
      const config = getBoardConfig('international');
      const style = getBoardGridStyle(config);
      expect(style['--board-size']).toBe('10');
      expect(style.gridTemplateColumns).toBe('repeat(10, minmax(0, 1fr))');
    });

    it('should generate correct CSS for 12x12 board', () => {
      const config = getBoardConfig('canadian');
      const style = getBoardGridStyle(config);
      expect(style['--board-size']).toBe('12');
      expect(style.gridTemplateColumns).toBe('repeat(12, minmax(0, 1fr))');
    });
  });

  describe('getMaxBoardSize', () => {
    it('should scale appropriately for different board sizes', () => {
      const american = getBoardConfig('american');
      const international = getBoardConfig('international');
      const canadian = getBoardConfig('canadian');

      expect(getMaxBoardSize(american)).toContain('320px');
      expect(getMaxBoardSize(international)).toContain('400px');
      expect(getMaxBoardSize(canadian)).toContain('480px');
    });
  });

  describe('BOARD_CONFIGS data integrity', () => {
    it('should have valid king rows for all configs', () => {
      Object.values(BOARD_CONFIGS).forEach(config => {
        expect(config.redKingRow).toBe(0);
        expect(config.blackKingRow).toBe(config.size - 1);
        expect(config.blackKingRow).toBeGreaterThan(config.redKingRow);
      });
    });

    it('should have piece rows less than half board size', () => {
      Object.values(BOARD_CONFIGS).forEach(config => {
        expect(config.pieceRows).toBeLessThan(config.size / 2);
        // Ensure there's at least one empty row between sides
        expect(config.pieceRows * 2).toBeLessThan(config.size);
      });
    });

    it('should calculate correct piece counts', () => {
      const testCases: Array<[BoardVariant, number]> = [
        ['american', 12],      // 8×3/2 = 12
        ['international', 20], // 10×4/2 = 20
        ['canadian', 30],      // 12×5/2 = 30
        ['brazilian', 12],     // 8×3/2 = 12
      ];

      testCases.forEach(([variant, expectedPiecesPerSide]) => {
        const config = getBoardConfig(variant);
        const piecesPerSide = Math.floor(config.size * config.pieceRows / 2);
        expect(piecesPerSide).toBe(expectedPiecesPerSide);
      });
    });
  });
});