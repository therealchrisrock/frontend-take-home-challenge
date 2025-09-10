import { describe, it, expect } from 'vitest';
import { GameConfigLoader } from './game-engine/config-loader';
import { getBoardGridStyleFromSize } from './board-style';
import { getBoardVariants, type BoardVariant } from './variants';

describe('Variant Rules Configuration System', () => {
  describe('getBoardConfig', () => {
    it('should return American checkers config by default', () => {
      const rules = GameConfigLoader.exportVariant('american')!;
      expect(rules.board.size).toBe(8);
      expect(Math.max(rules.board.startingRows.red.length, rules.board.startingRows.black.length)).toBe(3);
      expect(rules.metadata.displayName).toBe('American Checkers');
    });

    it('should return correct config for each variant', () => {
      const testCases: Array<[BoardVariant, number, number]> = [
        ['american', 8, 3],
        ['international', 10, 4],
        ['canadian', 12, 5],
        ['brazilian', 8, 3],
      ];

      testCases.forEach(([variant, expectedSize, expectedRows]) => {
        const rules = GameConfigLoader.exportVariant(variant)!;
        expect(rules.board.size).toBe(expectedSize);
        expect(Math.max(rules.board.startingRows.red.length, rules.board.startingRows.black.length)).toBe(expectedRows);
        expect((rules.promotion.customRows?.red?.[0]) ?? 0).toBe(0);
        expect((rules.promotion.customRows?.black?.[0]) ?? (rules.board.size - 1)).toBe(expectedSize - 1);
      });
    });

    it('should have proper descriptions', () => {
      expect(GameConfigLoader.getVariantMetadata('american')!.description).toContain('8×8');
      expect(GameConfigLoader.getVariantMetadata('international')!.description).toContain('10×10');
      expect(GameConfigLoader.getVariantMetadata('canadian')!.description).toContain('12×12');
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
      const style = getBoardGridStyleFromSize(8);
      expect(style['--board-size']).toBe('8');
      expect(style.gridTemplateColumns).toBe('repeat(8, minmax(0, 1fr))');
    });

    it('should generate correct CSS for 10x10 board', () => {
      const style = getBoardGridStyleFromSize(10);
      expect(style['--board-size']).toBe('10');
      expect(style.gridTemplateColumns).toBe('repeat(10, minmax(0, 1fr))');
    });

    it('should generate correct CSS for 12x12 board', () => {
      const style = getBoardGridStyleFromSize(12);
      expect(style['--board-size']).toBe('12');
      expect(style.gridTemplateColumns).toBe('repeat(12, minmax(0, 1fr))');
    });
  });

  // getMaxBoardSize tested elsewhere or with size-only helpers

  describe('Rules configs data integrity', () => {
    it('should have valid king rows for all configs', () => {
      getBoardVariants().forEach(variant => {
        const rules = GameConfigLoader.exportVariant(variant)!;
        const redKingRow = rules.promotion.customRows?.red?.[0] ?? 0;
        const blackKingRow = rules.promotion.customRows?.black?.[0] ?? (rules.board.size - 1);
        expect(redKingRow).toBe(0);
        expect(blackKingRow).toBe(rules.board.size - 1);
        expect(blackKingRow).toBeGreaterThan(redKingRow);
      });
    });

    it('should have piece rows less than half board size', () => {
      getBoardVariants().forEach(variant => {
        const rules = GameConfigLoader.exportVariant(variant)!;
        const pieceRows = Math.max(rules.board.startingRows.red.length, rules.board.startingRows.black.length);
        expect(pieceRows).toBeLessThan(rules.board.size / 2);
        expect(pieceRows * 2).toBeLessThan(rules.board.size);
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
        const rules = GameConfigLoader.exportVariant(variant)!;
        const pieceRows = Math.max(rules.board.startingRows.red.length, rules.board.startingRows.black.length);
        const piecesPerSide = Math.floor(rules.board.size * pieceRows / 2);
        expect(piecesPerSide).toBe(expectedPiecesPerSide);
      });
    });
  });
});