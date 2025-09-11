import type { Board, Move, PieceColor } from "./game-logic";
import type { VariantConfig } from "./game-engine/rule-schema";

/**
 * Draw result with explanation
 */
export interface DrawResult {
  type: "draw";
  reason:
    | "threefold-repetition"
    | "forty-move-rule"
    | "twenty-five-move-rule"
    | "insufficient-material"
    | "stalemate";
  explanation: string;
}

/**
 * Game state for tracking draw conditions
 */
export interface DrawState {
  movesSinceCapture: number;
  movesSincePromotion: number;
  boardPositions: string[];
  positionCounts: Map<string, number>;
}

/**
 * Create an initial draw state
 */
export function createDrawState(): DrawState {
  return {
    movesSinceCapture: 0,
    movesSincePromotion: 0,
    boardPositions: [],
    positionCounts: new Map(),
  };
}

/**
 * Serialize board position for repetition detection
 */
export function serializeBoard(
  board: Board,
  currentPlayer: PieceColor,
): string {
  const rows = board
    .map((row) =>
      row
        .map((piece) => (piece ? `${piece.color[0]}${piece.type[0]}` : "--"))
        .join(""),
    )
    .join("|");
  return `${rows}:${currentPlayer}`;
}

/**
 * Update draw state after a move
 */
export function updateDrawState(
  state: DrawState,
  board: Board,
  move: Move,
  currentPlayer: PieceColor,
  wasPromotion: boolean,
): DrawState {
  const newState = { ...state };

  // Update counters for forty-move rule
  if (move.captures && move.captures.length > 0) {
    newState.movesSinceCapture = 0;
  } else {
    newState.movesSinceCapture++;
  }

  if (wasPromotion) {
    newState.movesSincePromotion = 0;
  } else {
    newState.movesSincePromotion++;
  }

  // Update position tracking for repetition
  const position = serializeBoard(board, currentPlayer);
  newState.boardPositions = [...state.boardPositions, position];

  // Update position counts
  newState.positionCounts = new Map(state.positionCounts);
  const count = newState.positionCounts.get(position) || 0;
  newState.positionCounts.set(position, count + 1);

  return newState;
}

/**
 * Check for threefold repetition
 */
export function checkThreefoldRepetition(
  state: DrawState,
  config: VariantConfig,
): boolean {
  if (!config.draws.repetitionLimit) return false;

  // Check if any position has occurred the repetition limit times
  for (const count of state.positionCounts.values()) {
    if (count >= config.draws.repetitionLimit) {
      return true;
    }
  }

  return false;
}

/**
 * Check for forty-move rule (no captures or promotions)
 */
export function checkFortyMoveRule(
  state: DrawState,
  config: VariantConfig,
): boolean {
  if (!config.draws.fortyMoveRule) return false;

  // In checkers, it's typically 40 moves by each player (80 plies)
  const moveLimit = 80;
  return (
    state.movesSinceCapture >= moveLimit &&
    state.movesSincePromotion >= moveLimit
  );
}

/**
 * Check for twenty-five move rule in king endgames
 */
export function checkTwentyFiveMoveRule(
  board: Board,
  state: DrawState,
  config: VariantConfig,
): boolean {
  if (!config.draws.twentyFiveMoveRule) return false;

  // Count pieces
  let redKings = 0,
    blackKings = 0;
  let redRegular = 0,
    blackRegular = 0;

  for (const row of board) {
    for (const piece of row) {
      if (piece) {
        if (piece.type === "king") {
          if (piece.color === "red") redKings++;
          else blackKings++;
        } else {
          if (piece.color === "red") redRegular++;
          else blackRegular++;
        }
      }
    }
  }

  // Check if it's a king endgame (only kings remain)
  const isKingEndgame =
    redRegular === 0 && blackRegular === 0 && redKings > 0 && blackKings > 0;

  if (!isKingEndgame) return false;

  // In king endgames, limit is typically 25 moves (50 plies)
  const moveLimit = 50;
  return state.movesSinceCapture >= moveLimit;
}

/**
 * Check for insufficient material to win
 */
export function checkInsufficientMaterial(
  board: Board,
  config: VariantConfig,
): boolean {
  if (!config.draws.insufficientMaterial) return false;

  // Count pieces
  let redKings = 0,
    blackKings = 0;
  let redRegular = 0,
    blackRegular = 0;

  for (const row of board) {
    for (const piece of row) {
      if (piece) {
        if (piece.type === "king") {
          if (piece.color === "red") redKings++;
          else blackKings++;
        } else {
          if (piece.color === "red") redRegular++;
          else blackRegular++;
        }
      }
    }
  }

  const redTotal = redKings + redRegular;
  const blackTotal = blackKings + blackRegular;

  // Draw conditions:
  // 1. One king vs one king
  if (
    redTotal === 1 &&
    blackTotal === 1 &&
    redKings === 1 &&
    blackKings === 1
  ) {
    return true;
  }

  // 2. Two kings vs one king (can't force a win in most variants)
  if (
    (redTotal === 2 &&
      blackTotal === 1 &&
      redKings === 2 &&
      blackKings === 1) ||
    (redTotal === 1 && blackTotal === 2 && redKings === 1 && blackKings === 2)
  ) {
    return true;
  }

  // 3. Three kings vs one king on larger boards (depends on variant)
  if (config.board.size >= 10) {
    if (
      (redTotal === 3 &&
        blackTotal === 1 &&
        redKings === 3 &&
        blackKings === 1) ||
      (redTotal === 1 && blackTotal === 3 && redKings === 1 && blackKings === 3)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check all draw conditions and return detailed result
 */
export function checkDrawConditions(
  board: Board,
  state: DrawState,
  config: VariantConfig,
): DrawResult | null {
  // Check threefold repetition
  if (checkThreefoldRepetition(state, config)) {
    return {
      type: "draw",
      reason: "threefold-repetition",
      explanation:
        "The same position has occurred three times. This results in a draw by threefold repetition.",
    };
  }

  // Check forty-move rule
  if (checkFortyMoveRule(state, config)) {
    return {
      type: "draw",
      reason: "forty-move-rule",
      explanation:
        "Neither player has captured a piece or promoted a checker in the last 40 moves. This results in a draw by the forty-move rule.",
    };
  }

  // Check twenty-five move rule for king endgames
  if (checkTwentyFiveMoveRule(board, state, config)) {
    return {
      type: "draw",
      reason: "twenty-five-move-rule",
      explanation:
        "In this king-only endgame, no captures have occurred in the last 25 moves. This results in a draw by the twenty-five-move rule.",
    };
  }

  // Check insufficient material
  if (checkInsufficientMaterial(board, config)) {
    const redKings = board
      .flat()
      .filter((p) => p?.color === "red" && p.type === "king").length;
    const blackKings = board
      .flat()
      .filter((p) => p?.color === "black" && p.type === "king").length;
    const total = redKings + blackKings;

    let explanation = "Neither player has sufficient pieces to force a win. ";
    if (total === 2) {
      explanation += "With only one king each, checkmate is impossible.";
    } else if (total === 3) {
      explanation += "Two kings cannot force a win against one king.";
    } else {
      explanation += "The remaining pieces cannot force a checkmate.";
    }

    return {
      type: "draw",
      reason: "insufficient-material",
      explanation,
    };
  }

  return null;
}
