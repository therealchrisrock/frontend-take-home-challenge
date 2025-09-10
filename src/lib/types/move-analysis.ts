import type { Move, PieceColor } from "../game-logic";

export type MoveCategory =
  | "brilliant"
  | "excellent"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type GamePhase = "opening" | "midgame" | "endgame";
export type ThreatLevel = "none" | "mild" | "severe" | "critical";

export interface MoveContext {
  // Factors for determining if a move is "brilliant" or "excellent"
  moveComplexity: number; // How deep in the tree is this move (calculation depth required)
  alternativesQuality: number[]; // Scores of other available moves
  positionVolatility: number; // How tactical/sharp the position is (0-100)
  materialBalance: number; // Current material count difference
  gamePhase: GamePhase;
  threatLevel: ThreatLevel;
  forcedMoveCount: number; // Number of forced moves in the sequence
  isOnlyGoodMove: boolean; // Whether this is the only move that maintains advantage
}

export interface MoveEvaluation {
  move: Move;
  moveIndex: number; // Index in the game's move history
  category: MoveCategory;
  score: number; // Raw evaluation score
  bestScore: number; // Score of the best move
  scoreDifferential: number; // Percentage difference from best (0-100)
  positionEvalBefore: number; // Position evaluation before move (-100 to +100)
  positionEvalAfter: number; // Position evaluation after move
  swingValue: number; // How much the evaluation changed
  context: MoveContext;
  explanation?: string; // Human-readable explanation
  alternativeMoves?: {
    // Top alternative moves for comparison
    move: Move;
    score: number;
    notation: string;
  }[];
}

export interface GameAnalysis {
  moves: MoveEvaluation[];
  turningPoints: number[]; // Move indices where advantage shifted significantly
  criticalMoments: number[]; // Move indices requiring precise play
  averageAccuracy: {
    red: number; // 0-100 percentage
    black: number;
  };
  moveQualityCount: {
    red: Record<MoveCategory, number>;
    black: Record<MoveCategory, number>;
  };
  brilliantMoves: number[]; // Indices of brilliant moves
  blunders: number[]; // Indices of blunders
  gameSharpness: number; // Overall tactical complexity (0-100)
  evaluationGraph: {
    // For visualization
    moveIndex: number;
    evaluation: number; // -100 to +100 (negative = black advantage)
  }[];
}

export interface AnalysisConfig {
  depth: number; // Analysis depth (1-10)
  timeLimit: number; // Max time per move in ms
  includeAlternatives: boolean; // Whether to include alternative moves
  detectBrilliant: boolean; // Whether to detect brilliant moves (expensive)
  useCache: boolean; // Whether to use cached analysis
}

export const MOVE_INDICATORS = {
  brilliant: {
    icon: "💎",
    color: "cyan",
    label: "Brilliant!",
    description:
      "A surprising, non-obvious move that significantly improves the position",
  },
  excellent: {
    icon: "⭐",
    color: "gold",
    label: "Excellent!",
    description: "The only good move in a critical position",
  },
  best: {
    icon: "✓",
    color: "green",
    label: "Best move",
    description: "The objectively best move",
  },
  good: {
    icon: "",
    color: "lightgreen",
    label: "Good",
    description: "A solid move, close to the best",
  },
  inaccuracy: {
    icon: "?!",
    color: "yellow",
    label: "Inaccuracy",
    description: "Suboptimal but not immediately losing",
  },
  mistake: {
    icon: "?",
    color: "orange",
    label: "Mistake",
    description: "Clear error that loses advantage",
  },
  blunder: {
    icon: "??",
    color: "red",
    label: "Blunder",
    description: "Severe error, potentially game-losing",
  },
} as const;

// Default analysis configuration
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  depth: 6,
  timeLimit: 2000,
  includeAlternatives: true,
  detectBrilliant: true,
  useCache: true,
};

// Thresholds for move categorization (in percentage worse than best)
export const MOVE_QUALITY_THRESHOLDS = {
  best: 5, // Within 5% of best = still "best"
  good: 15, // 5-15% worse = good
  inaccuracy: 30, // 15-30% worse = inaccuracy
  mistake: 50, // 30-50% worse = mistake
  // >50% worse = blunder
} as const;

// Evaluation display helpers
export function formatEvaluation(evaluation: number): string {
  if (Math.abs(evaluation) < 0.5) return "0.0";
  const sign = evaluation > 0 ? "+" : "";
  return `${sign}${evaluation.toFixed(1)}`;
}

export function getEvaluationBarWidth(evaluation: number): number {
  // Convert -100 to +100 range to 0-100 percentage
  return Math.max(0, Math.min(100, (evaluation + 100) / 2));
}

export function getPlayerAdvantage(evaluation: number): {
  player: PieceColor;
  advantage: number;
} {
  return {
    player: evaluation > 0 ? "red" : "black",
    advantage: Math.abs(evaluation),
  };
}
