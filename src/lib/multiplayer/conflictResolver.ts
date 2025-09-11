import type { GameMove, GameState } from "../game/state/game-types";
import { multiplayerStorage } from "./indexedDbStorage";

export type ConflictResolutionStrategy = "server_authority" | "client_prediction" | "merge_state";

export interface ConflictResolutionResult {
  resolvedState: GameState;
  strategy: ConflictResolutionStrategy;
  rollbackRequired: boolean;
  conflictingMoves: GameMove[];
  mergedMoves: GameMove[];
}

export interface StateConflict {
  gameId: string;
  serverState: GameState;
  localState: GameState;
  serverSequenceNumber: number;
  localSequenceNumber: number;
  queuedMoves: GameMove[];
}

export interface ConflictEvent {
  type: "conflict_detected" | "conflict_resolved" | "rollback_required" | "merge_completed";
  gameId: string;
  data: {
    conflict?: StateConflict;
    resolution?: ConflictResolutionResult;
    timestamp: number;
  };
}

type ConflictEventListener = (event: ConflictEvent) => void;

export class ConflictResolver {
  private eventListeners = new Set<ConflictEventListener>();
  private resolutionInProgress = new Set<string>();

  constructor(private defaultStrategy: ConflictResolutionStrategy = "server_authority") {}

  async resolveConflict(
    conflict: StateConflict,
    strategy?: ConflictResolutionStrategy
  ): Promise<ConflictResolutionResult> {
    const resolveStrategy = strategy || this.defaultStrategy;
    const { gameId } = conflict;

    if (this.resolutionInProgress.has(gameId)) {
      throw new Error(`Conflict resolution already in progress for game ${gameId}`);
    }

    this.resolutionInProgress.add(gameId);

    this.emitEvent({
      type: "conflict_detected",
      gameId,
      data: {
        conflict,
        timestamp: Date.now(),
      },
    });

    try {
      let result: ConflictResolutionResult;

      switch (resolveStrategy) {
        case "server_authority":
          result = await this.resolveWithServerAuthority(conflict);
          break;
        case "client_prediction":
          result = await this.resolveWithClientPrediction(conflict);
          break;
        case "merge_state":
          result = await this.resolveWithStateMerge(conflict);
          break;
        default:
          throw new Error(`Unknown conflict resolution strategy: ${resolveStrategy}`);
      }

      this.emitEvent({
        type: "conflict_resolved",
        gameId,
        data: {
          resolution: result,
          timestamp: Date.now(),
        },
      });

      return result;
    } finally {
      this.resolutionInProgress.delete(gameId);
    }
  }

  private async resolveWithServerAuthority(conflict: StateConflict): Promise<ConflictResolutionResult> {
    const { serverState, localState, queuedMoves } = conflict;

    // Server state takes precedence
    const resolvedState = { ...serverState };
    
    // Determine which local moves are no longer valid
    const conflictingMoves = this.findConflictingMoves(serverState, localState, queuedMoves);
    
    // Clear conflicting moves from queue
    await this.clearConflictingMoves(conflict.gameId, conflictingMoves);

    return {
      resolvedState,
      strategy: "server_authority",
      rollbackRequired: true,
      conflictingMoves,
      mergedMoves: [],
    };
  }

  private async resolveWithClientPrediction(conflict: StateConflict): Promise<ConflictResolutionResult> {
    const { serverState, localState, queuedMoves, serverSequenceNumber } = conflict;

    // Apply queued moves to server state for client prediction
    let predictedState = { ...serverState };
    const validMoves: GameMove[] = [];
    const conflictingMoves: GameMove[] = [];

    for (const move of queuedMoves) {
      try {
        // Validate if move is still applicable to current server state
        if (await this.isMoveValid(predictedState, move)) {
          predictedState = await this.applyMove(predictedState, move);
          validMoves.push(move);
        } else {
          conflictingMoves.push(move);
        }
      } catch (error) {
        console.error("Error applying predicted move:", error);
        conflictingMoves.push(move);
      }
    }

    // Clear conflicting moves from queue
    await this.clearConflictingMoves(conflict.gameId, conflictingMoves);

    return {
      resolvedState: predictedState,
      strategy: "client_prediction",
      rollbackRequired: false,
      conflictingMoves,
      mergedMoves: validMoves,
    };
  }

  private async resolveWithStateMerge(conflict: StateConflict): Promise<ConflictResolutionResult> {
    const { serverState, localState, queuedMoves } = conflict;

    // Start with server state as base
    let mergedState = { ...serverState };
    const mergedMoves: GameMove[] = [];
    const conflictingMoves: GameMove[] = [];

    // Try to merge non-conflicting aspects of local state
    try {
      // For checkers, we can merge things like:
      // - Time remaining (if local time is more recent)
      // - Move history that doesn't conflict with server
      // - Player statistics
      
      if (localState.timeControl && serverState.timeControl) {
        // Merge time control if local has more recent updates
        if (this.isLocalTimeMoreRecent(localState, serverState)) {
          mergedState.timeControl = localState.timeControl;
        }
      }

      // Try to apply queued moves that don't conflict
      for (const move of queuedMoves) {
        if (await this.isMoveValid(mergedState, move)) {
          mergedState = await this.applyMove(mergedState, move);
          mergedMoves.push(move);
        } else {
          conflictingMoves.push(move);
        }
      }

      // Clear conflicting moves from queue
      await this.clearConflictingMoves(conflict.gameId, conflictingMoves);

    } catch (error) {
      console.error("State merge failed, falling back to server authority:", error);
      // Fallback to server authority if merge fails
      return this.resolveWithServerAuthority(conflict);
    }

    return {
      resolvedState: mergedState,
      strategy: "merge_state",
      rollbackRequired: conflictingMoves.length > 0,
      conflictingMoves,
      mergedMoves,
    };
  }

  private findConflictingMoves(
    serverState: GameState,
    localState: GameState,
    queuedMoves: GameMove[]
  ): GameMove[] {
    const conflicting: GameMove[] = [];

    // Compare board positions to detect conflicts
    if (this.boardStatesConflict(serverState.board, localState.board)) {
      // If board states conflict, all queued moves are potentially invalid
      return [...queuedMoves];
    }

    // Check individual moves for validity against server state
    for (const move of queuedMoves) {
      if (!this.isMoveValidSync(serverState, move)) {
        conflicting.push(move);
      }
    }

    return conflicting;
  }

  private boardStatesConflict(serverBoard: any, localBoard: any): boolean {
    // Simple board comparison for conflict detection
    if (!serverBoard || !localBoard) return true;
    
    // For checkers, compare piece positions
    if (Array.isArray(serverBoard) && Array.isArray(localBoard)) {
      if (serverBoard.length !== localBoard.length) return true;
      
      for (let i = 0; i < serverBoard.length; i++) {
        if (JSON.stringify(serverBoard[i]) !== JSON.stringify(localBoard[i])) {
          return true;
        }
      }
    }

    return false;
  }

  private async isMoveValid(state: GameState, move: GameMove): Promise<boolean> {
    // Implement move validation logic specific to checkers
    // This would typically use the game engine's validation functions
    try {
      // Basic validation checks
      if (!move.from || !move.to) return false;
      
      // Check if piece exists at source position
      const piece = this.getPieceAtPosition(state.board, move.from);
      if (!piece) return false;
      
      // Check if it's the correct player's turn
      if (piece.color !== state.currentPlayer) return false;
      
      // Additional game-specific validation would go here
      return true;
    } catch (error) {
      console.error("Move validation error:", error);
      return false;
    }
  }

  private isMoveValidSync(state: GameState, move: GameMove): boolean {
    // Synchronous version of move validation for quick checks
    try {
      if (!move.from || !move.to) return false;
      
      const piece = this.getPieceAtPosition(state.board, move.from);
      if (!piece) return false;
      
      return piece.color === state.currentPlayer;
    } catch (error) {
      return false;
    }
  }

  private async applyMove(state: GameState, move: GameMove): Promise<GameState> {
    // Apply move to game state
    // This would use the game engine's move application logic
    const newState = { ...state };
    
    // Basic move application (simplified)
    if (Array.isArray(newState.board) && move.from && move.to) {
      const piece = this.getPieceAtPosition(newState.board, move.from);
      if (piece) {
        // Move piece
        this.setPieceAtPosition(newState.board, move.from, null);
        this.setPieceAtPosition(newState.board, move.to, piece);
        
        // Switch current player
        newState.currentPlayer = newState.currentPlayer === "red" ? "black" : "red";
      }
    }
    
    return newState;
  }

  private getPieceAtPosition(board: any, position: { row: number; col: number }): any {
    if (Array.isArray(board) && board[position.row]) {
      return board[position.row][position.col];
    }
    return null;
  }

  private setPieceAtPosition(board: any, position: { row: number; col: number }, piece: any): void {
    if (Array.isArray(board) && board[position.row]) {
      board[position.row][position.col] = piece;
    }
  }

  private isLocalTimeMoreRecent(localState: GameState, serverState: GameState): boolean {
    // Compare timestamps to determine which time control state is more recent
    const localTime = localState.lastMoveTime || 0;
    const serverTime = serverState.lastMoveTime || 0;
    
    return localTime > serverTime;
  }

  private async clearConflictingMoves(gameId: string, conflictingMoves: GameMove[]): Promise<void> {
    // Remove conflicting moves from the queue
    const queuedMoves = await multiplayerStorage.getQueuedMoves(gameId);
    
    for (const queuedMove of queuedMoves) {
      const isConflicting = conflictingMoves.some(conflictMove => 
        this.movesEqual(queuedMove.move, conflictMove)
      );
      
      if (isConflicting) {
        await multiplayerStorage.removeQueuedMove(queuedMove.id);
      }
    }
  }

  private movesEqual(move1: GameMove, move2: GameMove): boolean {
    return (
      move1.from?.row === move2.from?.row &&
      move1.from?.col === move2.from?.col &&
      move1.to?.row === move2.to?.row &&
      move1.to?.col === move2.to?.col
    );
  }

  // Public utility methods
  isResolutionInProgress(gameId: string): boolean {
    return this.resolutionInProgress.has(gameId);
  }

  async validateLocalState(gameId: string, localState: GameState): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Validate basic game state structure
      if (!localState.board) {
        issues.push("Missing board state");
      }

      if (!localState.currentPlayer) {
        issues.push("Missing current player");
      }

      // Check for impossible positions or states
      if (localState.moveCount < 0) {
        issues.push("Invalid move count");
      }

      // Additional validation logic would go here

      return {
        isValid: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        isValid: false,
        issues: ["State validation failed: " + (error instanceof Error ? error.message : "Unknown error")],
      };
    }
  }

  // Event system
  addEventListener(listener: ConflictEventListener): void {
    this.eventListeners.add(listener);
  }

  removeEventListener(listener: ConflictEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(event: ConflictEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Conflict event listener error:", error);
      }
    });
  }

  // Cleanup
  destroy(): void {
    this.eventListeners.clear();
    this.resolutionInProgress.clear();
  }
}