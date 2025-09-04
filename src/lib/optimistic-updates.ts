import type { Move, Board } from '~/lib/game-logic';
import { makeMove } from '~/lib/game-logic';

export type OptimisticUpdateId = string;

export interface OptimisticUpdate {
  id: OptimisticUpdateId;
  move: Move;
  timestamp: Date;
  applied: boolean;
  rollbackState?: {
    board: Board;
    currentPlayer: 'red' | 'black';
    moveCount: number;
  };
}

export interface OptimisticUpdateState {
  updates: Map<OptimisticUpdateId, OptimisticUpdate>;
  pendingCount: number;
  lastUpdateTime: Date | null;
}

export class OptimisticUpdateManager {
  private state: OptimisticUpdateState = {
    updates: new Map(),
    pendingCount: 0,
    lastUpdateTime: null
  };

  private listeners: Set<(state: OptimisticUpdateState) => void> = new Set();

  // Create a new optimistic update
  createUpdate(
    move: Move, 
    currentBoard: Board, 
    currentPlayer: 'red' | 'black',
    moveCount: number
  ): OptimisticUpdate {
    const id = this.generateUpdateId();
    const update: OptimisticUpdate = {
      id,
      move,
      timestamp: new Date(),
      applied: false,
      rollbackState: {
        board: structuredClone(currentBoard),
        currentPlayer,
        moveCount
      }
    };

    this.state.updates.set(id, update);
    this.state.pendingCount++;
    this.state.lastUpdateTime = new Date();

    this.notifyListeners();
    return update;
  }

  // Apply an optimistic update to the board
  applyUpdate(updateId: OptimisticUpdateId, board: Board): Board | null {
    const update = this.state.updates.get(updateId);
    if (!update || update.applied) return null;

    try {
      const newBoard = makeMove(board, update.move);
      update.applied = true;
      this.notifyListeners();
      return newBoard;
    } catch (error) {
      console.error('Failed to apply optimistic update:', error);
      this.removeUpdate(updateId);
      return null;
    }
  }

  // Confirm an optimistic update (remove it from pending)
  confirmUpdate(updateId: OptimisticUpdateId): void {
    const update = this.state.updates.get(updateId);
    if (update) {
      this.state.updates.delete(updateId);
      if (!update.applied) {
        this.state.pendingCount--;
      }
      this.notifyListeners();
    }
  }

  // Rollback an optimistic update
  rollbackUpdate(updateId: OptimisticUpdateId): {
    board: Board;
    currentPlayer: 'red' | 'black';
    moveCount: number;
  } | null {
    const update = this.state.updates.get(updateId);
    if (!update?.rollbackState) return null;

    this.state.updates.delete(updateId);
    if (!update.applied) {
      this.state.pendingCount--;
    }

    this.notifyListeners();
    return update.rollbackState;
  }

  // Remove an update without rollback
  removeUpdate(updateId: OptimisticUpdateId): void {
    const update = this.state.updates.get(updateId);
    if (update) {
      this.state.updates.delete(updateId);
      if (!update.applied) {
        this.state.pendingCount--;
      }
      this.notifyListeners();
    }
  }

  // Get all pending updates
  getPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.state.updates.values())
      .filter(update => !update.applied)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Get update by ID
  getUpdate(updateId: OptimisticUpdateId): OptimisticUpdate | undefined {
    return this.state.updates.get(updateId);
  }

  // Clear all updates (typically on successful server sync)
  clearAllUpdates(): void {
    this.state.updates.clear();
    this.state.pendingCount = 0;
    this.notifyListeners();
  }

  // Rollback all pending updates and return the original state
  rollbackAll(): {
    board: Board;
    currentPlayer: 'red' | 'black';
    moveCount: number;
  } | null {
    const updates = Array.from(this.state.updates.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (updates.length === 0) return null;

    // Get the earliest rollback state
    const earliestUpdate = updates[0];
    if (!earliestUpdate?.rollbackState) return null;

    this.clearAllUpdates();
    return earliestUpdate.rollbackState;
  }

  // Check if there are any pending updates
  hasPendingUpdates(): boolean {
    return this.state.pendingCount > 0;
  }

  // Get current state (readonly)
  getState(): Readonly<OptimisticUpdateState> {
    return {
      updates: new Map(this.state.updates),
      pendingCount: this.state.pendingCount,
      lastUpdateTime: this.state.lastUpdateTime
    };
  }

  // Subscribe to state changes
  subscribe(listener: (state: OptimisticUpdateState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private generateUpdateId(): OptimisticUpdateId {
    return `opt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in optimistic update listener:', error);
      }
    });
  }

  // Utility method to apply a chain of optimistic updates to a base board
  applyUpdateChain(baseBoard: Board, updateIds: OptimisticUpdateId[]): Board {
    return updateIds.reduce((board, updateId) => {
      const update = this.state.updates.get(updateId);
      if (update && !update.applied) {
        try {
          return makeMove(board, update.move);
        } catch (error) {
          console.warn(`Failed to apply update ${updateId} in chain:`, error);
          return board;
        }
      }
      return board;
    }, structuredClone(baseBoard));
  }

  // Check for conflicts between optimistic updates and server state
  detectConflicts(serverBoard: Board, serverMoveCount: number): OptimisticUpdateId[] {
    const conflicts: OptimisticUpdateId[] = [];
    
    for (const [updateId, update] of this.state.updates) {
      if (!update.rollbackState) continue;
      
      // Simple conflict detection: if server move count has advanced beyond our rollback point
      if (serverMoveCount > update.rollbackState.moveCount) {
        conflicts.push(updateId);
      }
    }
    
    return conflicts;
  }
}