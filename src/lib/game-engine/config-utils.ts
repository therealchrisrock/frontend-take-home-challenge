/**
 * Utility functions for computed configuration values
 * These replace the pre-computed properties that were in ResolvedVariantConfig
 */

import type { VariantConfig } from './rule-schema';

/**
 * Get total board square count
 */
export function getBoardSquareCount(config: VariantConfig): number {
  return config.board.size * config.board.size;
}

/**
 * Get total starting pieces per player
 */
export function getTotalStartingPieces(config: VariantConfig): number {
  return config.board.startingRows.red.length * (config.board.size / 2);
}

/**
 * Get promotion rows for each color
 */
export function getPromotionRows(config: VariantConfig): { red: number[]; black: number[] } {
  return {
    red: config.promotion.customRows?.red || [0],
    black: config.promotion.customRows?.black || [config.board.size - 1]
  };
}

/**
 * Get all valid squares on the board (dark squares only for checkers)
 */
export function getValidStartingSquares(config: VariantConfig): { row: number; col: number }[] {
  const squares: { row: number; col: number }[] = [];
  for (let row = 0; row < config.board.size; row++) {
    for (let col = 0; col < config.board.size; col++) {
      if ((row + col) % 2 === 1) { // Dark squares
        squares.push({ row, col });
      }
    }
  }
  return squares;
}

/**
 * Check if a position is a promotion row for the given color
 */
export function isPromotionRow(config: VariantConfig, row: number, color: 'red' | 'black'): boolean {
  const promotionRows = getPromotionRows(config);
  return promotionRows[color].includes(row);
}

/**
 * Get the initial row range for a given color
 */
export function getStartingRows(config: VariantConfig, color: 'red' | 'black'): number[] {
  return config.board.startingRows[color];
}