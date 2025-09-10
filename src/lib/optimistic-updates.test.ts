import { describe, it, expect, beforeEach, vi } from "vitest";
import { OptimisticUpdateManager } from "./optimistic-updates";
import type { Move, Board } from "~/lib/game-logic";
import { createInitialBoard } from "~/lib/game-logic";

describe("OptimisticUpdateManager", () => {
  let manager: OptimisticUpdateManager;
  let testBoard: Board;
  let testMove: Move;

  beforeEach(() => {
    manager = new OptimisticUpdateManager();
    testBoard = createInitialBoard();
    testMove = {
      from: { row: 2, col: 1 },
      to: { row: 3, col: 2 },
    };
  });

  describe("createUpdate", () => {
    it("should create a new optimistic update", () => {
      const update = manager.createUpdate(testMove, testBoard, "red", 0);

      expect(update.id).toMatch(/^opt_\d+_/);
      expect(update.move).toEqual(testMove);
      expect(update.applied).toBe(false);
      expect(update.rollbackState).toBeDefined();
      expect(update.rollbackState!.currentPlayer).toBe("red");
      expect(update.rollbackState!.moveCount).toBe(0);
    });

    it("should increment pending count when creating updates", () => {
      expect(manager.getState().pendingCount).toBe(0);

      manager.createUpdate(testMove, testBoard, "red", 0);
      expect(manager.getState().pendingCount).toBe(1);

      manager.createUpdate(testMove, testBoard, "red", 1);
      expect(manager.getState().pendingCount).toBe(2);
    });

    it("should preserve board state in rollback", () => {
      const update = manager.createUpdate(testMove, testBoard, "red", 5);

      expect(update.rollbackState!.board).toEqual(testBoard);
      expect(update.rollbackState!.board).not.toBe(testBoard); // Should be a copy
    });
  });

  describe("confirmUpdate", () => {
    it("should remove confirmed update", () => {
      const update = manager.createUpdate(testMove, testBoard, "red", 0);
      expect(manager.getState().updates.size).toBe(1);

      manager.confirmUpdate(update.id);
      expect(manager.getState().updates.size).toBe(0);
      expect(manager.getState().pendingCount).toBe(0);
    });

    it("should handle confirming non-existent update", () => {
      expect(() => {
        manager.confirmUpdate("non-existent-id");
      }).not.toThrow();
    });
  });

  describe("rollbackUpdate", () => {
    it("should return rollback state and remove update", () => {
      const update = manager.createUpdate(testMove, testBoard, "red", 5);

      const rollbackState = manager.rollbackUpdate(update.id);

      expect(rollbackState).toBeDefined();
      expect(rollbackState!.board).toEqual(testBoard);
      expect(rollbackState!.currentPlayer).toBe("red");
      expect(rollbackState!.moveCount).toBe(5);
      expect(manager.getState().updates.size).toBe(0);
    });

    it("should return null for non-existent update", () => {
      const rollbackState = manager.rollbackUpdate("non-existent-id");
      expect(rollbackState).toBeNull();
    });
  });

  describe("getPendingUpdates", () => {
    it("should return pending updates in chronological order", () => {
      const update1 = manager.createUpdate(testMove, testBoard, "red", 0);

      // Wait a bit to ensure different timestamps
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      const update2 = manager.createUpdate(testMove, testBoard, "black", 1);

      vi.useRealTimers();

      const pendingUpdates = manager.getPendingUpdates();

      expect(pendingUpdates).toHaveLength(2);
      expect(pendingUpdates[0]!.id).toBe(update1.id);
      expect(pendingUpdates[1]!.id).toBe(update2.id);
    });

    it("should not return applied updates", () => {
      const update = manager.createUpdate(testMove, testBoard, "red", 0);
      manager.applyUpdate(update.id, testBoard);

      const pendingUpdates = manager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(0);
    });
  });

  describe("clearAllUpdates", () => {
    it("should remove all updates and reset count", () => {
      manager.createUpdate(testMove, testBoard, "red", 0);
      manager.createUpdate(testMove, testBoard, "black", 1);

      expect(manager.getState().pendingCount).toBe(2);

      manager.clearAllUpdates();

      expect(manager.getState().updates.size).toBe(0);
      expect(manager.getState().pendingCount).toBe(0);
    });
  });

  describe("rollbackAll", () => {
    it("should return earliest rollback state", () => {
      const update1 = manager.createUpdate(testMove, testBoard, "red", 5);

      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      const update2 = manager.createUpdate(testMove, testBoard, "black", 6);

      vi.useRealTimers();

      const rollbackState = manager.rollbackAll();

      expect(rollbackState).toBeDefined();
      expect(rollbackState!.moveCount).toBe(5); // Earlier move count
      expect(manager.getState().updates.size).toBe(0);
    });

    it("should return null if no updates exist", () => {
      const rollbackState = manager.rollbackAll();
      expect(rollbackState).toBeNull();
    });
  });

  describe("hasPendingUpdates", () => {
    it("should correctly report pending status", () => {
      expect(manager.hasPendingUpdates()).toBe(false);

      const update = manager.createUpdate(testMove, testBoard, "red", 0);
      expect(manager.hasPendingUpdates()).toBe(true);

      manager.applyUpdate(update.id, testBoard);
      expect(manager.hasPendingUpdates()).toBe(false);
    });
  });

  describe("event subscription", () => {
    it("should notify subscribers of state changes", () => {
      const mockListener = vi.fn();

      const unsubscribe = manager.subscribe(mockListener);

      manager.createUpdate(testMove, testBoard, "red", 0);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingCount: 1,
        }),
      );

      unsubscribe();

      // Should not be called after unsubscribe
      manager.createUpdate(testMove, testBoard, "black", 1);
      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it("should handle subscriber errors gracefully", () => {
      const faultyListener = vi.fn(() => {
        throw new Error("Listener error");
      });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      manager.subscribe(faultyListener);

      // Should not throw
      expect(() => {
        manager.createUpdate(testMove, testBoard, "red", 0);
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in optimistic update listener:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("detectConflicts", () => {
    it("should detect conflicts when server advances beyond optimistic updates", () => {
      const update1 = manager.createUpdate(testMove, testBoard, "red", 5);
      const update2 = manager.createUpdate(testMove, testBoard, "black", 5);

      const conflicts = manager.detectConflicts(testBoard, 7, 10);

      expect(conflicts).toEqual([update1.id, update2.id]);
    });

    it("should not detect conflicts when server is at same state", () => {
      manager.createUpdate(testMove, testBoard, "red", 5);

      const conflicts = manager.detectConflicts(testBoard, 5, 8);

      expect(conflicts).toHaveLength(0);
    });

    it("should handle updates without rollback state", () => {
      const update = manager.createUpdate(testMove, testBoard, "red", 5);

      // Remove rollback state to simulate edge case
      const storedUpdate = manager.getUpdate(update.id)!;
      delete storedUpdate.rollbackState;

      const conflicts = manager.detectConflicts(testBoard, 5, 8);

      expect(conflicts).toEqual([update.id]);
    });
  });
});
