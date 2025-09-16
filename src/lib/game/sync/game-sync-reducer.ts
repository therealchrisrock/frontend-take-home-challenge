import type { Move, Board, PieceColor } from "~/lib/game/logic";
import type { OptimisticUpdate } from "~/lib/optimistic-updates";

// Connection status types
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
export type ConflictResolutionStrategy = 'optimistic' | 'server-wins' | 'manual';

// Unified game sync state
export interface GameSyncState {
  // Connection Management
  connection: {
    status: ConnectionStatus;
    error: string | null;
    lastConnected: Date | null;
    reconnectAttempts: number;
    eventSource: EventSource | null;
    gameId: string | null;
  };
  
  // Sync Coordination  
  sync: {
    isPolling: boolean;
    lastServerSync: Date | null;
    pendingServerUpdates: number;
    conflictResolution: ConflictResolutionStrategy;
    isProcessingConflict: boolean;
  };
  
  // Optimistic Update Integration
  optimistic: {
    pendingUpdates: Map<string, OptimisticUpdate>;
    pendingCount: number;
    lastOptimisticMove: Date | null;
    rollbackInProgress: boolean;
  };
  
  // Move Queue (offline/retry)
  moveQueue: {
    offline: Move[];
    retry: Move[];
    processing: boolean;
    lastProcessedAt: Date | null;
  };
}

// Action types for the game sync reducer
export type GameSyncAction =
  // Connection Actions
  | { type: 'CONNECTION_ATTEMPT'; payload: { gameId: string } }
  | { type: 'CONNECTION_ESTABLISHED'; payload: { eventSource: EventSource; gameId: string } }
  | { type: 'CONNECTION_FAILED'; payload: { error: string; attempt: number } }
  | { type: 'CONNECTION_CLOSED'; payload: { reason?: string } }
  | { type: 'RESET_CONNECTION_ATTEMPTS' }
  
  // SSE Message Actions
  | { type: 'SSE_MESSAGE_RECEIVED'; payload: { messageType: string; data: any } }
  | { type: 'SSE_HEARTBEAT'; payload: { timestamp: Date } }
  
  // Optimistic Update Actions
  | { type: 'OPTIMISTIC_MOVE_CREATED'; payload: OptimisticUpdate }
  | { type: 'OPTIMISTIC_MOVE_CONFIRMED'; payload: { updateId: string } }
  | { type: 'OPTIMISTIC_MOVE_CONFLICTED'; payload: { updateId: string; serverState: any } }
  | { type: 'OPTIMISTIC_ROLLBACK_START'; payload: { updateIds: string[] } }
  | { type: 'OPTIMISTIC_ROLLBACK_COMPLETE' }
  | { type: 'CLEAR_OPTIMISTIC_UPDATES' }
  
  // Move Queue Actions
  | { type: 'OFFLINE_MOVE_QUEUED'; payload: Move }
  | { type: 'RETRY_MOVE_QUEUED'; payload: Move }
  | { type: 'MOVE_QUEUE_PROCESSING_START'; payload: { queueType: 'offline' | 'retry' } }
  | { type: 'MOVE_QUEUE_PROCESSING_COMPLETE'; payload: { queueType: 'offline' | 'retry'; processedMoves: Move[] } }
  | { type: 'MOVE_QUEUE_PROCESSING_FAILED'; payload: { queueType: 'offline' | 'retry'; failedMoves: Move[] } }
  | { type: 'CLEAR_MOVE_QUEUE'; payload: { queueType: 'offline' | 'retry' } }
  
  // Sync Coordination Actions
  | { type: 'SYNC_POLLING_START' }
  | { type: 'SYNC_POLLING_STOP' }
  | { type: 'SERVER_SYNC_RECEIVED'; payload: { timestamp: Date; updateCount: number } }
  | { type: 'SYNC_CONFLICT_DETECTED'; payload: { serverBoard: Board; localBoard: Board; moveCount: number } }
  | { type: 'CONFLICT_RESOLUTION_START'; payload: { strategy: ConflictResolutionStrategy } }
  | { type: 'CONFLICT_RESOLUTION_COMPLETE' }
  
  // State Reset Actions
  | { type: 'RESET_SYNC_STATE' }
  | { type: 'FORCE_DISCONNECT' };

// Initial state for the game sync reducer
export const initialGameSyncState: GameSyncState = {
  connection: {
    status: 'disconnected',
    error: null,
    lastConnected: null,
    reconnectAttempts: 0,
    eventSource: null,
    gameId: null,
  },
  sync: {
    isPolling: false,
    lastServerSync: null,
    pendingServerUpdates: 0,
    conflictResolution: 'optimistic',
    isProcessingConflict: false,
  },
  optimistic: {
    pendingUpdates: new Map(),
    pendingCount: 0,
    lastOptimisticMove: null,
    rollbackInProgress: false,
  },
  moveQueue: {
    offline: [],
    retry: [],
    processing: false,
    lastProcessedAt: null,
  },
};

// Game sync reducer function
export function gameSyncReducer(
  state: GameSyncState,
  action: GameSyncAction
): GameSyncState {
  switch (action.type) {
    // Connection Management
    case 'CONNECTION_ATTEMPT':
      return {
        ...state,
        connection: {
          ...state.connection,
          status: 'connecting',
          error: null,
          gameId: action.payload.gameId,
        },
      };

    case 'CONNECTION_ESTABLISHED':
      return {
        ...state,
        connection: {
          ...state.connection,
          status: 'connected',
          error: null,
          lastConnected: new Date(),
          reconnectAttempts: 0,
          eventSource: action.payload.eventSource,
          gameId: action.payload.gameId,
        },
      };

    case 'CONNECTION_FAILED':
      return {
        ...state,
        connection: {
          ...state.connection,
          status: 'reconnecting',
          error: action.payload.error,
          reconnectAttempts: action.payload.attempt,
        },
      };

    case 'CONNECTION_CLOSED':
      return {
        ...state,
        connection: {
          ...state.connection,
          status: 'disconnected',
          eventSource: null,
          error: action.payload.reason || null,
        },
      };

    case 'RESET_CONNECTION_ATTEMPTS':
      return {
        ...state,
        connection: {
          ...state.connection,
          reconnectAttempts: 0,
        },
      };

    // SSE Message Handling
    case 'SSE_MESSAGE_RECEIVED':
      // This will be handled by the calling component, but we can track message activity
      return {
        ...state,
        sync: {
          ...state.sync,
          lastServerSync: new Date(),
        },
      };

    case 'SSE_HEARTBEAT':
      return {
        ...state,
        connection: {
          ...state.connection,
          lastConnected: action.payload.timestamp,
        },
      };

    // Optimistic Updates
    case 'OPTIMISTIC_MOVE_CREATED': {
      const update = action.payload;
      const newPendingUpdates = new Map(state.optimistic.pendingUpdates);
      newPendingUpdates.set(update.id, update);

      return {
        ...state,
        optimistic: {
          ...state.optimistic,
          pendingUpdates: newPendingUpdates,
          pendingCount: state.optimistic.pendingCount + 1,
          lastOptimisticMove: new Date(),
        },
      };
    }

    case 'OPTIMISTIC_MOVE_CONFIRMED': {
      const newPendingUpdates = new Map(state.optimistic.pendingUpdates);
      newPendingUpdates.delete(action.payload.updateId);

      return {
        ...state,
        optimistic: {
          ...state.optimistic,
          pendingUpdates: newPendingUpdates,
          pendingCount: Math.max(0, state.optimistic.pendingCount - 1),
        },
      };
    }

    case 'OPTIMISTIC_MOVE_CONFLICTED': {
      const newPendingUpdates = new Map(state.optimistic.pendingUpdates);
      newPendingUpdates.delete(action.payload.updateId);

      // Move to retry queue if not already there
      const conflictedUpdate = state.optimistic.pendingUpdates.get(action.payload.updateId);
      const newRetryQueue = conflictedUpdate 
        ? [...state.moveQueue.retry, conflictedUpdate.move]
        : state.moveQueue.retry;

      return {
        ...state,
        optimistic: {
          ...state.optimistic,
          pendingUpdates: newPendingUpdates,
          pendingCount: Math.max(0, state.optimistic.pendingCount - 1),
        },
        moveQueue: {
          ...state.moveQueue,
          retry: newRetryQueue,
        },
      };
    }

    case 'OPTIMISTIC_ROLLBACK_START':
      return {
        ...state,
        optimistic: {
          ...state.optimistic,
          rollbackInProgress: true,
        },
      };

    case 'OPTIMISTIC_ROLLBACK_COMPLETE':
      return {
        ...state,
        optimistic: {
          ...state.optimistic,
          rollbackInProgress: false,
        },
      };

    case 'CLEAR_OPTIMISTIC_UPDATES':
      return {
        ...state,
        optimistic: {
          ...state.optimistic,
          pendingUpdates: new Map(),
          pendingCount: 0,
        },
      };

    // Move Queue Management
    case 'OFFLINE_MOVE_QUEUED':
      return {
        ...state,
        moveQueue: {
          ...state.moveQueue,
          offline: [...state.moveQueue.offline, action.payload],
        },
      };

    case 'RETRY_MOVE_QUEUED':
      return {
        ...state,
        moveQueue: {
          ...state.moveQueue,
          retry: [...state.moveQueue.retry, action.payload],
        },
      };

    case 'MOVE_QUEUE_PROCESSING_START':
      return {
        ...state,
        moveQueue: {
          ...state.moveQueue,
          processing: true,
        },
      };

    case 'MOVE_QUEUE_PROCESSING_COMPLETE': {
      const { queueType, processedMoves } = action.payload;
      const newQueue = queueType === 'offline' 
        ? state.moveQueue.offline.filter(move => !processedMoves.includes(move))
        : state.moveQueue.retry.filter(move => !processedMoves.includes(move));

      return {
        ...state,
        moveQueue: {
          ...state.moveQueue,
          [queueType]: newQueue,
          processing: false,
          lastProcessedAt: new Date(),
        },
      };
    }

    case 'MOVE_QUEUE_PROCESSING_FAILED': {
      const { queueType, failedMoves } = action.payload;
      
      return {
        ...state,
        moveQueue: {
          ...state.moveQueue,
          processing: false,
          // Keep failed moves in the queue for retry
        },
      };
    }

    case 'CLEAR_MOVE_QUEUE': {
      const { queueType } = action.payload;
      return {
        ...state,
        moveQueue: {
          ...state.moveQueue,
          [queueType]: [],
        },
      };
    }

    // Sync Coordination
    case 'SYNC_POLLING_START':
      return {
        ...state,
        sync: {
          ...state.sync,
          isPolling: true,
        },
      };

    case 'SYNC_POLLING_STOP':
      return {
        ...state,
        sync: {
          ...state.sync,
          isPolling: false,
        },
      };

    case 'SERVER_SYNC_RECEIVED':
      return {
        ...state,
        sync: {
          ...state.sync,
          lastServerSync: action.payload.timestamp,
          pendingServerUpdates: action.payload.updateCount,
        },
      };

    case 'SYNC_CONFLICT_DETECTED':
      return {
        ...state,
        sync: {
          ...state.sync,
          isProcessingConflict: true,
        },
      };

    case 'CONFLICT_RESOLUTION_START':
      return {
        ...state,
        sync: {
          ...state.sync,
          conflictResolution: action.payload.strategy,
          isProcessingConflict: true,
        },
      };

    case 'CONFLICT_RESOLUTION_COMPLETE':
      return {
        ...state,
        sync: {
          ...state.sync,
          isProcessingConflict: false,
        },
      };

    // State Reset
    case 'RESET_SYNC_STATE':
      return initialGameSyncState;

    case 'FORCE_DISCONNECT':
      return {
        ...state,
        connection: {
          ...state.connection,
          status: 'disconnected',
          eventSource: null,
          error: null,
        },
      };

    default:
      return state;
  }
}

// Utility selectors for the sync state
export const gameSyncSelectors = {
  isConnected: (state: GameSyncState) => state.connection.status === 'connected',
  isConnecting: (state: GameSyncState) => state.connection.status === 'connecting',
  isReconnecting: (state: GameSyncState) => state.connection.status === 'reconnecting',
  hasOptimisticUpdates: (state: GameSyncState) => state.optimistic.pendingCount > 0,
  hasQueuedMoves: (state: GameSyncState) => 
    state.moveQueue.offline.length > 0 || state.moveQueue.retry.length > 0,
  isProcessingQueue: (state: GameSyncState) => state.moveQueue.processing,
  isInConflictResolution: (state: GameSyncState) => state.sync.isProcessingConflict,
  canMakeMove: (state: GameSyncState) => 
    state.connection.status === 'connected' && 
    !state.sync.isProcessingConflict && 
    !state.optimistic.rollbackInProgress,
};

// Action creators for common operations
export const gameSyncActions = {
  attemptConnection: (gameId: string): GameSyncAction => ({
    type: 'CONNECTION_ATTEMPT',
    payload: { gameId },
  }),
  
  establishConnection: (eventSource: EventSource, gameId: string): GameSyncAction => ({
    type: 'CONNECTION_ESTABLISHED',
    payload: { eventSource, gameId },
  }),
  
  createOptimisticUpdate: (update: OptimisticUpdate): GameSyncAction => ({
    type: 'OPTIMISTIC_MOVE_CREATED',
    payload: update,
  }),
  
  queueOfflineMove: (move: Move): GameSyncAction => ({
    type: 'OFFLINE_MOVE_QUEUED',
    payload: move,
  }),
  
  startConflictResolution: (strategy: ConflictResolutionStrategy): GameSyncAction => ({
    type: 'CONFLICT_RESOLUTION_START',
    payload: { strategy },
  }),
};