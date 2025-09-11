import type {
  Board as BoardType,
  Position,
  PieceColor,
  Move,
} from "~/lib/game/logic";
import type { BoardVariant } from "~/lib/game/variants";
import type { VariantConfig } from "~/lib/game-engine/rule-schema";
import type { TimeControl } from "~/lib/game/time-control-types";
import type { GamePlayers } from "~/lib/game/player-types";
import type { GameAnalysis } from "~/lib/types/move-analysis";
import type { AIDifficulty } from "~/lib/game/ai-engine";
import type { DrawState, DrawResult } from "~/lib/game/draw-detection";

export type GameMode = "ai" | "local" | "online";

export interface GameState {
  gameId?: string;
  boardVariant: BoardVariant;
  rules: VariantConfig;
  board: BoardType;
  currentPlayer: PieceColor;
  playerColor: PieceColor;
  selectedPosition: Position | null;
  draggingPosition: Position | null;
  validMoves: Move[];
  moveCount: number;
  moveHistory: Move[];
  boardHistory: BoardType[];
  currentMoveIndex: number; // -1 = initial
  isViewingHistory: boolean;
  winner: PieceColor | "draw" | null;
  drawState: DrawState;
  drawReason: DrawResult | null;

  // UI flags
  showWinnerDialog: boolean;
  showContinueDialog: boolean;
  showKeyboardHelp: boolean;
  showTimeControlDialog: boolean;
  showDrawDialog: boolean;
  drawRequestedBy: PieceColor | null;

  // Features
  timeControl: TimeControl | null;
  audioWarningsEnabled: boolean;

  // Modes/players
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  players: GamePlayers;
  isAIThinking: boolean;

  // Analysis
  isReviewMode: boolean;
  gameAnalysis: GameAnalysis | null;
  isAnalyzing: boolean;
  analyzeProgress: number;

  // Misc
  gameStartTime: Date;
}

export type GameAction =
  | { type: "SET_RULES"; payload: VariantConfig }
  | { type: "RESET"; payload: { initialBoard: BoardType } }
  | {
      type: "APPLY_MOVE";
      payload: {
        newBoard: BoardType;
        move: Move;
        winner: PieceColor | DrawResult | null;
      };
    }
  | { type: "SET_PLAYER_COLOR"; payload: "red" | "black" }
  | { type: "SET_SELECTED"; payload: Position | null }
  | { type: "SET_DRAGGING"; payload: Position | null }
  | { type: "SET_VALID_MOVES"; payload: Move[] }
  | { type: "NAVIGATE_TO_MOVE"; payload: number }
  | { type: "SET_WINNER"; payload: GameState["winner"] }
  | { type: "SET_MODE"; payload: GameMode }
  | { type: "SET_AI_DIFFICULTY"; payload: AIDifficulty }
  | { type: "SET_TIMECONTROL"; payload: TimeControl | null }
  | { type: "SET_AI_THINKING"; payload: boolean }
  | { type: "TOGGLE_REVIEW_MODE"; payload: boolean }
  | {
      type: "SET_ANALYSIS";
      payload: {
        analysis: GameAnalysis | null;
        isAnalyzing: boolean;
        progress?: number;
      };
    }
  | {
      type: "DIALOGS";
      payload: Partial<
        Pick<
          GameState,
          | "showWinnerDialog"
          | "showContinueDialog"
          | "showKeyboardHelp"
          | "showTimeControlDialog"
          | "showDrawDialog"
        >
      >;
    }
  | { type: "LOAD_SNAPSHOT"; payload: Partial<GameState> }
  | { type: "RESIGN"; payload: PieceColor }
  | { type: "REQUEST_DRAW" }
  | { type: "ACCEPT_DRAW" };
