import { describe, it, expect, beforeEach } from "vitest";
import {
  gameSyncReducer,
  initialGameSyncState,
  gameSyncSelectors,
  gameSyncActions,
  type GameSyncState,
  type GameSyncAction,
} from "./game-sync-reducer";
import type { OptimisticUpdate } from "~/lib/optimistic-updates";

describe("gameSyncReducer", () => {
  let initialState: GameSyncState;

  beforeEach(() => {
    initialState = { ...initialGameSyncState };
  });

  describe("Connection Management", () => {
    it("should handle connection attempt", () => {
      const action: GameSyncAction = {
        type: "CONNECTION_ATTEMPT",
        payload: { gameId: "test-game-123" },
      };

      const result = gameSyncReducer(initialState, action);

      expect(result.connection.status).toBe("connecting");
      expect(result.connection.gameId).toBe("test-game-123");
      expect(result.connection.error).toBeNull();
    });

    it("should handle successful connection establishment", () => {
      const mockEventSource = {} as EventSource;
      const action: GameSyncAction = {
        type: "CONNECTION_ESTABLISHED",
        payload: { eventSource: mockEventSource, gameId: "test-game-123" },
      };

      const result = gameSyncReducer(initialState, action);

      expect(result.connection.status).toBe("connected");
      expect(result.connection.eventSource).toBe(mockEventSource);
      expect(result.connection.gameId).toBe("test-game-123");
      expect(result.connection.error).toBeNull();
      expect(result.connection.reconnectAttempts).toBe(0);
      expect(result.connection.lastConnected).toBeInstanceOf(Date);
    });

    it("should handle connection failure with retry attempts", () => {
      const action: GameSyncAction = {
        type: "CONNECTION_FAILED",
        payload: { error: "Connection timeout", attempt: 3 },
      };

      const result = gameSyncReducer(initialState, action);

      expect(result.connection.status).toBe("reconnecting");
      expect(result.connection.error).toBe("Connection timeout");
      expect(result.connection.reconnectAttempts).toBe(3);
    });

    it("should handle connection closure", () => {
      const connectedState = {
        ...initialState,
        connection: {
          ...initialState.connection,
          status: "connected" as const,
          eventSource: {} as EventSource,
        },
      };

      const action: GameSyncAction = {
        type: "CONNECTION_CLOSED",
        payload: { reason: "User disconnected" },
      };

      const result = gameSyncReducer(connectedState, action);

      expect(result.connection.status).toBe("disconnected");
      expect(result.connection.eventSource).toBeNull();
      expect(result.connection.error).toBe("User disconnected");
    });
  });

  describe("Optimistic Updates", () => {
    it("should create optimistic update", () => {
      const optimisticUpdate: OptimisticUpdate = {
        id: "opt_123",
        move: { from: { row: 0, col: 0 }, to: { row: 1, col: 1 } },
        timestamp: new Date(),
        applied: false,
        rollbackState: {
          board: [],
          currentPlayer: "red",
          moveCount: 5,
        },
      };

      const action: GameSyncAction = {
        type: "OPTIMISTIC_MOVE_CREATED",
        payload: optimisticUpdate,
      };

      const result = gameSyncReducer(initialState, action);

      expect(result.optimistic.pendingUpdates.has("opt_123")).toBe(true);
      expect(result.optimistic.pendingUpdates.get("opt_123")).toEqual(
        optimisticUpdate,
      );
      expect(result.optimistic.pendingCount).toBe(1);
      expect(result.optimistic.lastOptimisticMove).toBeInstanceOf(Date);
    });

    it("should confirm optimistic update", () => {
      const stateWithOptimistic = {
        ...initialState,
        optimistic: {
          ...initialState.optimistic,
          pendingUpdates: new Map([
            [
              "opt_123",
              {
                id: "opt_123",
                move: { from: { row: 0, col: 0 }, to: { row: 1, col: 1 } },
                timestamp: new Date(),
                applied: false,
              } as OptimisticUpdate,
            ],
          ]),
          pendingCount: 1,
        },
      };

      const action: GameSyncAction = {
        type: "OPTIMISTIC_MOVE_CONFIRMED",
        payload: { updateId: "opt_123" },
      };

      const result = gameSyncReducer(stateWithOptimistic, action);

      expect(result.optimistic.pendingUpdates.has("opt_123")).toBe(false);
      expect(result.optimistic.pendingCount).toBe(0);
    });

    it("should handle optimistic move conflict", () => {
      const conflictedMove = {
        id: "opt_123",
        move: { from: { row: 0, col: 0 }, to: { row: 1, col: 1 } },
        timestamp: new Date(),
        applied: false,
      } as OptimisticUpdate;

      const stateWithOptimistic = {
        ...initialState,
        optimistic: {
          ...initialState.optimistic,
          pendingUpdates: new Map([["opt_123", conflictedMove]]),
          pendingCount: 1,
        },
      };

      const action: GameSyncAction = {
        type: "OPTIMISTIC_MOVE_CONFLICTED",
        payload: { updateId: "opt_123", serverState: {} },
      };

      const result = gameSyncReducer(stateWithOptimistic, action);

      expect(result.optimistic.pendingUpdates.has("opt_123")).toBe(false);
      expect(result.optimistic.pendingCount).toBe(0);
      expect(result.moveQueue.retry).toContain(conflictedMove.move);
    });

    it("should handle rollback start and complete", () => {
      const rollbackStartAction: GameSyncAction = {
        type: "OPTIMISTIC_ROLLBACK_START",
        payload: { updateIds: ["opt_123", "opt_456"] },
      };

      const result1 = gameSyncReducer(initialState, rollbackStartAction);
      expect(result1.optimistic.rollbackInProgress).toBe(true);

      const rollbackCompleteAction: GameSyncAction = {
        type: "OPTIMISTIC_ROLLBACK_COMPLETE",
      };

      const result2 = gameSyncReducer(result1, rollbackCompleteAction);
      expect(result2.optimistic.rollbackInProgress).toBe(false);
    });
  });

  describe("Move Queue Management", () => {
    it("should queue offline moves", () => {
      const move = { from: { row: 0, col: 0 }, to: { row: 1, col: 1 } };
      const action: GameSyncAction = {
        type: "OFFLINE_MOVE_QUEUED",
        payload: move,
      };

      const result = gameSyncReducer(initialState, action);

      expect(result.moveQueue.offline).toContain(move);
      expect(result.moveQueue.offline.length).toBe(1);
    });

    it("should queue retry moves", () => {
      const move = { from: { row: 0, col: 0 }, to: { row: 1, col: 1 } };
      const action: GameSyncAction = {
        type: "RETRY_MOVE_QUEUED",
        payload: move,
      };

      const result = gameSyncReducer(initialState, action);

      expect(result.moveQueue.retry).toContain(move);
      expect(result.moveQueue.retry.length).toBe(1);
    });

    it("should handle move queue processing", () => {
      const move1 = { from: { row: 0, col: 0 }, to: { row: 1, col: 1 } };
      const move2 = { from: { row: 2, col: 2 }, to: { row: 3, col: 3 } };

      const stateWithQueue = {
        ...initialState,
        moveQueue: {
          ...initialState.moveQueue,
          offline: [move1, move2],
        },
      };

      const startAction: GameSyncAction = {
        type: "MOVE_QUEUE_PROCESSING_START",
        payload: { queueType: "offline" },
      };

      const result1 = gameSyncReducer(stateWithQueue, startAction);
      expect(result1.moveQueue.processing).toBe(true);

      const completeAction: GameSyncAction = {
        type: "MOVE_QUEUE_PROCESSING_COMPLETE",
        payload: { queueType: "offline", processedMoves: [move1] },
      };

      const result2 = gameSyncReducer(result1, completeAction);
      expect(result2.moveQueue.processing).toBe(false);
      expect(result2.moveQueue.offline).toEqual([move2]);
      expect(result2.moveQueue.lastProcessedAt).toBeInstanceOf(Date);
    });

    it("should clear move queues", () => {
      const stateWithQueue = {
        ...initialState,
        moveQueue: {
          ...initialState.moveQueue,
          offline: [{ from: { row: 0, col: 0 }, to: { row: 1, col: 1 } }],
          retry: [{ from: { row: 2, col: 2 }, to: { row: 3, col: 3 } }],
        },
      };

      const clearOfflineAction: GameSyncAction = {
        type: "CLEAR_MOVE_QUEUE",
        payload: { queueType: "offline" },
      };

      const result1 = gameSyncReducer(stateWithQueue, clearOfflineAction);
      expect(result1.moveQueue.offline).toEqual([]);
      expect(result1.moveQueue.retry.length).toBe(1);

      const clearRetryAction: GameSyncAction = {
        type: "CLEAR_MOVE_QUEUE",
        payload: { queueType: "retry" },
      };

      const result2 = gameSyncReducer(result1, clearRetryAction);
      expect(result2.moveQueue.retry).toEqual([]);
    });
  });

  describe("Sync Coordination", () => {
    it("should handle polling start and stop", () => {
      const startAction: GameSyncAction = { type: "SYNC_POLLING_START" };
      const result1 = gameSyncReducer(initialState, startAction);
      expect(result1.sync.isPolling).toBe(true);

      const stopAction: GameSyncAction = { type: "SYNC_POLLING_STOP" };
      const result2 = gameSyncReducer(result1, stopAction);
      expect(result2.sync.isPolling).toBe(false);
    });

    it("should handle server sync received", () => {
      const timestamp = new Date();
      const action: GameSyncAction = {
        type: "SERVER_SYNC_RECEIVED",
        payload: { timestamp, updateCount: 3 },
      };

      const result = gameSyncReducer(initialState, action);

      expect(result.sync.lastServerSync).toBe(timestamp);
      expect(result.sync.pendingServerUpdates).toBe(3);
    });

    it("should handle conflict detection and resolution", () => {
      const conflictAction: GameSyncAction = {
        type: "SYNC_CONFLICT_DETECTED",
        payload: {
          serverBoard: [],
          localBoard: [],
          moveCount: 5,
        },
      };

      const result1 = gameSyncReducer(initialState, conflictAction);
      expect(result1.sync.isProcessingConflict).toBe(true);

      const resolutionStartAction: GameSyncAction = {
        type: "CONFLICT_RESOLUTION_START",
        payload: { strategy: "server-wins" },
      };

      const result2 = gameSyncReducer(result1, resolutionStartAction);
      expect(result2.sync.conflictResolution).toBe("server-wins");
      expect(result2.sync.isProcessingConflict).toBe(true);

      const resolutionCompleteAction: GameSyncAction = {
        type: "CONFLICT_RESOLUTION_COMPLETE",
      };

      const result3 = gameSyncReducer(result2, resolutionCompleteAction);
      expect(result3.sync.isProcessingConflict).toBe(false);
    });
  });

  describe("SSE Message Handling", () => {
    it("should handle SSE messages", () => {
      const action: GameSyncAction = {
        type: "SSE_MESSAGE_RECEIVED",
        payload: { messageType: "GAME_MOVE", data: {} },
      };

      const result = gameSyncReducer(initialState, action);
      expect(result.sync.lastServerSync).toBeInstanceOf(Date);
    });

    it("should handle heartbeat", () => {
      const timestamp = new Date();
      const action: GameSyncAction = {
        type: "SSE_HEARTBEAT",
        payload: { timestamp },
      };

      const result = gameSyncReducer(initialState, action);
      expect(result.connection.lastConnected).toBe(timestamp);
    });
  });

  describe("State Reset", () => {
    it("should reset sync state", () => {
      const modifiedState = {
        ...initialState,
        connection: {
          ...initialState.connection,
          status: "connected" as const,
          gameId: "test-game",
        },
        optimistic: {
          ...initialState.optimistic,
          pendingCount: 5,
        },
      };

      const action: GameSyncAction = { type: "RESET_SYNC_STATE" };
      const result = gameSyncReducer(modifiedState, action);

      expect(result).toEqual(initialGameSyncState);
    });

    it("should force disconnect", () => {
      const connectedState = {
        ...initialState,
        connection: {
          ...initialState.connection,
          status: "connected" as const,
          eventSource: {} as EventSource,
        },
      };

      const action: GameSyncAction = { type: "FORCE_DISCONNECT" };
      const result = gameSyncReducer(connectedState, action);

      expect(result.connection.status).toBe("disconnected");
      expect(result.connection.eventSource).toBeNull();
      expect(result.connection.error).toBeNull();
    });
  });

  describe("Selectors", () => {
    it("should correctly identify connection states", () => {
      expect(gameSyncSelectors.isConnected(initialState)).toBe(false);
      expect(gameSyncSelectors.isConnecting(initialState)).toBe(false);
      expect(gameSyncSelectors.isReconnecting(initialState)).toBe(false);

      const connectingState = {
        ...initialState,
        connection: { ...initialState.connection, status: "connecting" as const },
      };
      expect(gameSyncSelectors.isConnecting(connectingState)).toBe(true);

      const connectedState = {
        ...initialState,
        connection: { ...initialState.connection, status: "connected" as const },
      };
      expect(gameSyncSelectors.isConnected(connectedState)).toBe(true);

      const reconnectingState = {
        ...initialState,
        connection: {
          ...initialState.connection,
          status: "reconnecting" as const,
        },
      };
      expect(gameSyncSelectors.isReconnecting(reconnectingState)).toBe(true);
    });

    it("should correctly identify optimistic updates and queued moves", () => {
      expect(gameSyncSelectors.hasOptimisticUpdates(initialState)).toBe(false);
      expect(gameSyncSelectors.hasQueuedMoves(initialState)).toBe(false);

      const stateWithUpdates = {
        ...initialState,
        optimistic: { ...initialState.optimistic, pendingCount: 2 },
        moveQueue: {
          ...initialState.moveQueue,
          offline: [{ from: { row: 0, col: 0 }, to: { row: 1, col: 1 } }],
        },
      };

      expect(gameSyncSelectors.hasOptimisticUpdates(stateWithUpdates)).toBe(true);
      expect(gameSyncSelectors.hasQueuedMoves(stateWithUpdates)).toBe(true);
    });

    it("should correctly identify when moves can be made", () => {
      expect(gameSyncSelectors.canMakeMove(initialState)).toBe(false);

      const readyState = {
        ...initialState,
        connection: { ...initialState.connection, status: "connected" as const },
        sync: { ...initialState.sync, isProcessingConflict: false },
        optimistic: { ...initialState.optimistic, rollbackInProgress: false },
      };

      expect(gameSyncSelectors.canMakeMove(readyState)).toBe(true);

      const conflictState = {
        ...readyState,
        sync: { ...readyState.sync, isProcessingConflict: true },
      };

      expect(gameSyncSelectors.canMakeMove(conflictState)).toBe(false);
    });
  });

  describe("Action Creators", () => {
    it("should create correct actions", () => {
      const connectionAction = gameSyncActions.attemptConnection("test-game");
      expect(connectionAction).toEqual({
        type: "CONNECTION_ATTEMPT",
        payload: { gameId: "test-game" },
      });

      const mockEventSource = {} as EventSource;
      const establishAction = gameSyncActions.establishConnection(
        mockEventSource,
        "test-game",
      );
      expect(establishAction).toEqual({
        type: "CONNECTION_ESTABLISHED",
        payload: { eventSource: mockEventSource, gameId: "test-game" },
      });

      const move = { from: { row: 0, col: 0 }, to: { row: 1, col: 1 } };
      const queueAction = gameSyncActions.queueOfflineMove(move);
      expect(queueAction).toEqual({
        type: "OFFLINE_MOVE_QUEUED",
        payload: move,
      });
    });
  });
});