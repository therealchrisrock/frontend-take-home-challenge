export interface BoardColors {
  lightSquare: {
    from: string;
    to: string;
  };
  darkSquare: {
    from: string;
    to: string;
  };
  border: string;
  selectedRing: string;
  highlightedRing: string;
  possibleMove: string;
  possibleMoveGlow: string;
}

export interface PieceColors {
  red: {
    base: string;
    gradient: {
      from: string;
      to: string;
    };
    border: string;
    crown: string;
  };
  black: {
    base: string;
    gradient: {
      from: string;
      to: string;
    };
    border: string;
    crown: string;
  };
}

export interface UIColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  ring: string;
}

export interface Skin {
  id: string;
  name: string;
  description: string;
  category: 'classic' | 'modern' | 'seasonal' | 'premium' | 'special';
  board: BoardColors;
  pieces: PieceColors;
  ui: UIColors;
  preview: string;
  locked: boolean;
  unlockCondition?: {
    type: 'wins' | 'games' | 'streak' | 'purchase' | 'achievement' | 'code';
    value: number | string;
    description: string;
  };
}

export interface SkinUnlockProgress {
  skinId: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: Date;
}