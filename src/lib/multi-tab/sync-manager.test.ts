import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultiTabSyncManager } from './sync-manager';
import type { SyncEvent } from './types';

// Mock EventSource
global.EventSource = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  readyState: EventSource.OPEN,
  onopen: null,
  onmessage: null,
  onerror: null,
})) as any;

// Mock fetch
global.fetch = vi.fn();

describe('MultiTabSyncManager', () => {
  let syncManager: MultiTabSyncManager;
  const testGameId = 'test-game-123';

  beforeEach(() => {
    syncManager = new MultiTabSyncManager(testGameId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (syncManager) {
      syncManager.disconnect();
    }
  });

  describe('constructor', () => {
    it('should create a sync manager with a unique tab ID', () => {
      expect(syncManager.getTabId).toMatch(/^tab_\d+_/);
      expect(syncManager.isConnected).toBe(false);
      expect(syncManager.isActiveTab).toBe(false);
    });

    it('should generate unique tab IDs for different instances', () => {
      const manager1 = new MultiTabSyncManager(testGameId);
      const manager2 = new MultiTabSyncManager(testGameId);
      
      expect(manager1.getTabId).not.toBe(manager2.getTabId);
      
      manager1.disconnect();
      manager2.disconnect();
    });
  });

  describe('state management', () => {
    it('should track connection state', () => {
      const state = syncManager.getState;
      
      expect(state.isConnected).toBe(false);
      expect(state.isActiveTab).toBe(false);
      expect(state.totalTabs).toBe(1);
      expect(state.connectionAttempts).toBe(0);
      expect(state.optimisticUpdates).toHaveLength(0);
    });

    it('should track optimistic updates', () => {
      const testMove = {
        from: { row: 2, col: 1 },
        to: { row: 3, col: 2 }
      };

      const update = syncManager.addOptimisticUpdate(testMove);
      
      expect(update.id).toMatch(/^opt_\d+_/);
      expect(update.move).toEqual(testMove);
      expect(update.applied).toBe(false);
      expect(syncManager.getState.optimisticUpdates).toHaveLength(1);
    });

    it('should remove optimistic updates', () => {
      const testMove = {
        from: { row: 2, col: 1 },
        to: { row: 3, col: 2 }
      };

      const update = syncManager.addOptimisticUpdate(testMove);
      expect(syncManager.getState.optimisticUpdates).toHaveLength(1);
      
      syncManager.removeOptimisticUpdate(update.id);
      expect(syncManager.getState.optimisticUpdates).toHaveLength(0);
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const mockListener = vi.fn();
      
      syncManager.addEventListener('MOVE_APPLIED', mockListener);
      
      // Simulate an event
      const testEvent: SyncEvent = {
        type: 'MOVE_APPLIED',
        payload: { test: 'data' },
        timestamp: new Date().toISOString(),
        gameId: testGameId
      };

      // Access private method for testing
      (syncManager as any).notifyEventListeners('MOVE_APPLIED', testEvent);
      
      expect(mockListener).toHaveBeenCalledWith(testEvent);
      
      syncManager.removeEventListener('MOVE_APPLIED', mockListener);
      
      // Should not be called after removal
      (syncManager as any).notifyEventListeners('MOVE_APPLIED', testEvent);
      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple listeners for the same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      syncManager.addEventListener('TAB_STATUS_UPDATE', listener1);
      syncManager.addEventListener('TAB_STATUS_UPDATE', listener2);
      
      const testEvent: SyncEvent = {
        type: 'TAB_STATUS_UPDATE',
        payload: { activeTabId: 'test-tab', totalTabs: 2 },
        timestamp: new Date().toISOString(),
        gameId: testGameId
      };

      (syncManager as any).notifyEventListeners('TAB_STATUS_UPDATE', testEvent);
      
      expect(listener1).toHaveBeenCalledWith(testEvent);
      expect(listener2).toHaveBeenCalledWith(testEvent);
    });
  });

  describe('connection handling', () => {
    it('should handle tab visibility changes', () => {
      // Test that visibility change handler is set up
      expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should handle beforeunload events', () => {
      // Test that beforeunload handler is set up
      expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
  });

  describe('error handling', () => {
    it('should handle event listener errors gracefully', () => {
      const faultyListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      syncManager.addEventListener('MOVE_APPLIED', faultyListener);
      
      const testEvent: SyncEvent = {
        type: 'MOVE_APPLIED',
        payload: { test: 'data' },
        timestamp: new Date().toISOString(),
        gameId: testGameId
      };

      // Should not throw
      expect(() => {
        (syncManager as any).notifyEventListeners('MOVE_APPLIED', testEvent);
      }).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in sync event listener:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on disconnect', () => {
      const mockEventSource = {
        close: vi.fn(),
        readyState: EventSource.OPEN
      };

      (syncManager as any).eventSource = mockEventSource;
      (syncManager as any).heartbeatInterval = setInterval(() => {}, 1000);
      (syncManager as any).reconnectTimeout = setTimeout(() => {}, 1000);
      
      syncManager.disconnect();
      
      expect(mockEventSource.close).toHaveBeenCalled();
      expect(syncManager.isConnected).toBe(false);
    });
  });
});