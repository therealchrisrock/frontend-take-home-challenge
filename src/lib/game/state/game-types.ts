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
import type { GameSyncState } from "~/lib/game/sync/game-sync-reducer";
import type { OptimisticUpdate } from "~/lib/optimistic-updates";

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

  // Sync state (for online multiplayer)
  syncState?: GameSyncState;

  // Misc
  gameStartTime: Date;
}

// Minimal GameSyncState type for backwards compatibility
// Real-time sync now handled by EventContext
export interface GameSyncState {
  connection: {
    status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
    error: string | null;
    reconnectAttempts: number;
    lastHeartbeat: Date | null;
  };
  moveQueue: {
    offline: Move[];
    retry: Move[];
    pending: Move[];
  };
  optimisticUpdates: any[];
  pendingCount: number;
  conflict: any;
  syncErrors: any[];
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
  | { type: "ACCEPT_DRAW" }
  
  // Sync-related actions for online multiplayer
  | { type: "SYNC_STATE_UPDATE"; payload: Partial<GameSyncState> }
  | { 
      type: "OPTIMISTIC_MOVE_PREVIEW"; 
      payload: { 
        move: Move; 
        updateId: string;
        previewBoard: BoardType;
      } 
    }
  | { type: "OPTIMISTIC_MOVE_ROLLBACK"; payload: { updateId: string } }
  | { 
      type: "SERVER_STATE_OVERRIDE"; 
      payload: { 
        board: BoardType; 
        moveCount: number; 
        currentPlayer: PieceColor;
        moves?: Move[];
        winner?: "red" | "black" | "draw" | null;
        lastMove?: Move;
      } 
    }
  | { type: "SYNC_DRAW_REQUEST"; payload: { requestedBy: PieceColor } }
  | { type: "SYNC_DRAW_ACCEPTED"; payload: { acceptedBy: PieceColor } }
  | { type: "SYNC_DRAW_DECLINED"; payload: { declinedBy: PieceColor } }
  | { 
      type: "CONFLICT_RESOLUTION"; 
      payload: { 
        strategy: 'optimistic' | 'server-wins'; 
        conflictData: {
          serverBoard: BoardType;
          localBoard: BoardType;
          serverMoveCount: number;
          localMoveCount: number;
        };
      } 
    }
;
