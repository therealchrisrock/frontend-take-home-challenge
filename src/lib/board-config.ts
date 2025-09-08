export type BoardVariant = 'american' | 'international' | 'canadian' | 'brazilian';

export interface BoardConfig {
  /** Board size (NxN grid) */
  size: number;
  /** Number of rows filled with pieces per side */
  pieceRows: number;
  /** Row where red pieces are promoted to kings */
  redKingRow: number;
  /** Row where black pieces are promoted to kings */
  blackKingRow: number;
  /** Display name for the variant */
  name: string;
  /** Brief description */
  description: string;
  /** Whether kings can fly (move multiple squares) */
  flyingKings?: boolean;
  /** Whether regular pieces can capture backwards */
  allowBackwardCapture?: boolean;
  /** Whether captures are mandatory when available */
  mandatoryCapture?: boolean;
}

export const BOARD_CONFIGS: Record<BoardVariant, BoardConfig> = {
  american: {
    size: 8,
    pieceRows: 3,
    redKingRow: 0,
    blackKingRow: 7,
    name: 'American Checkers',
    description: 'Standard 8×8 board with 12 pieces per player',
    flyingKings: false,
    allowBackwardCapture: false,
    mandatoryCapture: true
  },
  international: {
    size: 10,
    pieceRows: 4,
    redKingRow: 0,
    blackKingRow: 9,
    name: 'International Draughts',
    description: '10×10 board with 20 pieces per player',
    flyingKings: true,
    allowBackwardCapture: true,
    mandatoryCapture: true
  },
  canadian: {
    size: 12,
    pieceRows: 5,
    redKingRow: 0,
    blackKingRow: 11,
    name: 'Canadian Checkers',
    description: '12×12 board with 30 pieces per player',
    flyingKings: true,
    allowBackwardCapture: true,
    mandatoryCapture: true
  },
  brazilian: {
    size: 8,
    pieceRows: 3,
    redKingRow: 0,
    blackKingRow: 7,
    name: 'Brazilian Draughts',
    description: '8×8 board with backward captures allowed',
    flyingKings: true,
    allowBackwardCapture: true,
    mandatoryCapture: true
  }
};

/**
 * Get board configuration for a given variant
 */
export function getBoardConfig(variant: BoardVariant = 'american'): BoardConfig {
  return BOARD_CONFIGS[variant];
}

/**
 * Get all available board variants
 */
export function getBoardVariants(): BoardVariant[] {
  return Object.keys(BOARD_CONFIGS) as BoardVariant[];
}

/**
 * Create CSS custom properties for dynamic grid sizing
 */
export function getBoardGridStyle(config: BoardConfig): React.CSSProperties {
  return {
    '--board-size': config.size.toString(),
    gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))`
  } as React.CSSProperties;
}

/**
 * Calculate maximum board size in pixels for responsive design
 */
export function getMaxBoardSize(config: BoardConfig): string {
  // Ensure square aspect ratio and reasonable sizing
  const baseSize = Math.min(600, 40 * config.size);
  return `min(100%, ${baseSize}px, calc(100vh - 2rem))`;
}