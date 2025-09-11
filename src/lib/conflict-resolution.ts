import type { Move, Board } from "~/lib/game/logic";
import { makeMove, checkWinner } from "~/lib/game/logic";
import type { OptimisticUpdate } from "./optimistic-updates";

export type ConflictResolutionStrategy =
  | "first-write-wins"
  | "last-write-wins"
  | "merge"
  | "reject"
  | "user-choice";

export interface ConflictingMove {
  move: Move;
  tabId: string;
  timestamp: Date;
  optimisticUpdateId?: string;
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  winningMove?: Move;
  rejectedMoves: Move[];
  resolutionReason: string;
  requiresUserAction?: boolean;
}

export interface ConflictContext {
  gameId: string;
  currentBoard: Board;
  currentPlayer: "red" | "black";
  moveCount: number;
  gameVersion: number;
}

export class ConflictResolver {
  private readonly strategy: ConflictResolutionStrategy;

  constructor(strategy: ConflictResolutionStrategy = "first-write-wins") {
    this.strategy = strategy;
  }

  /**
   * Resolve conflicts between multiple simultaneous moves
   */
  async resolveMovesConflict(
    conflictingMoves: ConflictingMove[],
    context: ConflictContext,
  ): Promise<ConflictResolution> {
    if (conflictingMoves.length === 0) {
      throw new Error("No conflicting moves provided");
    }

    if (conflictingMoves.length === 1) {
      return {
        strategy: this.strategy,
        winningMove: conflictingMoves[0]!.move,
        rejectedMoves: [],
        resolutionReason: "No conflict - single move",
      };
    }

    switch (this.strategy) {
      case "first-write-wins":
        return this.resolveFirstWriteWins(conflictingMoves, context);

      case "last-write-wins":
        return this.resolveLastWriteWins(conflictingMoves, context);

      case "merge":
        return this.resolveMerge(conflictingMoves, context);

      case "reject":
        return this.resolveRejectAll(conflictingMoves, context);

      case "user-choice":
        return this.resolveUserChoice(conflictingMoves, context);

      default:
        throw new Error(
          `Unsupported resolution strategy: ${String(this.strategy)}`,
        );
    }
  }

  private resolveFirstWriteWins(
    conflictingMoves: ConflictingMove[],
    _context: ConflictContext,
  ): ConflictResolution {
    // Sort by timestamp - earliest wins
    const sortedMoves = conflictingMoves.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const [winningMove, ...rejectedMoves] = sortedMoves;

    return {
      strategy: "first-write-wins",
      winningMove: winningMove!.move,
      rejectedMoves: rejectedMoves.map((m) => m.move),
      resolutionReason: `First move wins (${winningMove!.timestamp.toISOString()})`,
    };
  }

  private resolveLastWriteWins(
    conflictingMoves: ConflictingMove[],
    _context: ConflictContext,
  ): ConflictResolution {
    // Sort by timestamp - latest wins
    const sortedMoves = conflictingMoves.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    const [winningMove, ...rejectedMoves] = sortedMoves;

    return {
      strategy: "last-write-wins",
      winningMove: winningMove!.move,
      rejectedMoves: rejectedMoves.map((m) => m.move),
      resolutionReason: `Last move wins (${winningMove!.timestamp.toISOString()})`,
    };
  }

  private async resolveMerge(
    conflictingMoves: ConflictingMove[],
    context: ConflictContext,
  ): Promise<ConflictResolution> {
    // Attempt to merge moves if they don't interfere with each other
    const validMoves: Move[] = [];
    const rejectedMoves: Move[] = [];
    let currentBoard = structuredClone(context.currentBoard);

    // Sort moves by timestamp for deterministic order
    const sortedMoves = conflictingMoves.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    for (const conflictingMove of sortedMoves) {
      try {
        // Check if move is still valid on the current board state
        if (
          this.isMoveStillValid(
            conflictingMove.move,
            currentBoard,
            context.currentPlayer,
          )
        ) {
          // Apply move to test board
          const testBoard = makeMove(currentBoard, conflictingMove.move);

          // Check for game-ending conditions
          const winner = checkWinner(testBoard);
          if (winner && validMoves.length > 0) {
            // Can't merge moves if one ends the game
            rejectedMoves.push(conflictingMove.move);
          } else {
            validMoves.push(conflictingMove.move);
            currentBoard = testBoard;
          }
        } else {
          rejectedMoves.push(conflictingMove.move);
        }
      } catch (error) {
        console.error("Error validating move for merge:", error);
        rejectedMoves.push(conflictingMove.move);
      }
    }

    if (validMoves.length === 0) {
      return {
        strategy: "merge",
        rejectedMoves: conflictingMoves.map((m) => m.move),
        resolutionReason: "No moves could be merged - all invalid",
      };
    }

    if (validMoves.length === 1) {
      return {
        strategy: "merge",
        winningMove: validMoves[0],
        rejectedMoves,
        resolutionReason:
          "Only one move could be applied after merge validation",
      };
    }

    // If multiple moves can be merged, we need a different approach
    // For simplicity, fall back to first-write-wins
    return this.resolveFirstWriteWins(conflictingMoves, context);
  }

  private resolveRejectAll(
    conflictingMoves: ConflictingMove[],
    _context: ConflictContext,
  ): ConflictResolution {
    return {
      strategy: "reject",
      rejectedMoves: conflictingMoves.map((m) => m.move),
      resolutionReason:
        "All conflicting moves rejected - manual resolution required",
    };
  }

  private resolveUserChoice(
    conflictingMoves: ConflictingMove[],
    _context: ConflictContext,
  ): ConflictResolution {
    return {
      strategy: "user-choice",
      rejectedMoves: conflictingMoves.map((m) => m.move),
      resolutionReason: "User choice required for conflict resolution",
      requiresUserAction: true,
    };
  }

  private isMoveStillValid(
    move: Move,
    board: Board,
    currentPlayer: "red" | "black",
  ): boolean {
    try {
      // Basic validation - check if piece still exists and move is structurally valid
      const piece = board[move.from.row]?.[move.from.col];
      if (!piece || piece.color !== currentPlayer) {
        return false;
      }

      const targetSquare = board[move.to.row]?.[move.to.col];
      if (targetSquare !== null) {
        return false; // Target square is occupied
      }

      // Additional validation could include checking captures are still valid, etc.
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect conflicts between optimistic updates and server state
   */
  detectOptimisticConflicts(
    optimisticUpdates: OptimisticUpdate[],
    serverBoard: Board,
    serverMoveCount: number,
    _serverVersion: number,
  ): {
    conflicts: string[];
    validUpdates: string[];
    resolutionNeeded: boolean;
  } {
    const conflicts: string[] = [];
    const validUpdates: string[] = [];

    for (const update of optimisticUpdates) {
      if (!update.rollbackState) {
        conflicts.push(update.id);
        continue;
      }

      // Check if server state has advanced beyond our optimistic update
      if (serverMoveCount > update.rollbackState.moveCount) {
        conflicts.push(update.id);
      } else if (serverMoveCount === update.rollbackState.moveCount) {
        // Same move count - check if board states match
        const boardsMatch = this.compareBoardStates(
          update.rollbackState.board,
          serverBoard,
        );

        if (!boardsMatch) {
          conflicts.push(update.id);
        } else {
          validUpdates.push(update.id);
        }
      } else {
        // Server is behind - this shouldn't happen in normal flow
        validUpdates.push(update.id);
      }
    }

    return {
      conflicts,
      validUpdates,
      resolutionNeeded: conflicts.length > 0,
    };
  }

  private compareBoardStates(board1: Board, board2: Board): boolean {
    if (board1.length !== board2.length) return false;

    for (let i = 0; i < board1.length; i++) {
      const row1 = board1[i];
      const row2 = board2[i];

      if (!row1 || !row2 || row1.length !== row2.length) return false;

      for (let j = 0; j < row1.length; j++) {
        const piece1 = row1[j];
        const piece2 = row2[j];

        if (piece1 === null && piece2 === null) continue;
        if (piece1 === null || piece2 === null) return false;

        if (piece1?.color !== piece2?.color || piece1?.type !== piece2?.type) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Create a conflict resolution report for logging
   */
  createResolutionReport(
    resolution: ConflictResolution,
    conflictingMoves: ConflictingMove[],
    context: ConflictContext,
  ): {
    gameId: string;
    conflictCount: number;
    resolutionStrategy: ConflictResolutionStrategy;
    winningMove?: Move;
    rejectedCount: number;
    timestamp: Date;
    context: ConflictContext;
  } {
    return {
      gameId: context.gameId,
      conflictCount: conflictingMoves.length,
      resolutionStrategy: resolution.strategy,
      winningMove: resolution.winningMove,
      rejectedCount: resolution.rejectedMoves.length,
      timestamp: new Date(),
      context,
    };
  }
}

// Default resolver instance
export const defaultConflictResolver = new ConflictResolver("first-write-wins");

// Utility function for quick conflict resolution
export async function resolveMovesConflict(
  conflictingMoves: ConflictingMove[],
  context: ConflictContext,
  strategy: ConflictResolutionStrategy = "first-write-wins",
): Promise<ConflictResolution> {
  const resolver = new ConflictResolver(strategy);
  return resolver.resolveMovesConflict(conflictingMoves, context);
}
