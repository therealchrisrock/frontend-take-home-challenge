/**
 * Event Emitter Unit Tests
 * 
 * Tests the server-side event distribution system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { eventEmitter } from '../event-emitter';
import type { SSEEvent } from '~/types/sse-events';

describe('ServerEventEmitter', () => {
  beforeEach(() => {
    // Reset the emitter before each test
    eventEmitter.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('emitToUser', () => {
    it('should emit events to specific user channel', () => {
      const userId = 'user123';
      const mockCallback = vi.fn();
      const event: SSEEvent = {
        id: '1',
        type: 'NOTIFICATION_CREATED' as any,
        payload: { title: 'Test', message: 'Test message' },
        timestamp: Date.now(),
      };

      // Subscribe to user events
      const unsubscribe = eventEmitter.onUserEvent(userId, mockCallback);

      // Emit event to user
      eventEmitter.emitToUser(userId, event);

      // Verify callback was called with event
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          ...event,
          sequenceNumber: expect.any(Number),
        })
      );

      // Cleanup
      unsubscribe();
    });

    it('should not receive events after unsubscribe', () => {
      const userId = 'user123';
      const mockCallback = vi.fn();
      const event: SSEEvent = {
        id: '1',
        type: 'HEARTBEAT' as any,
        payload: { timestamp: Date.now() },
        timestamp: Date.now(),
      };

      // Subscribe and immediately unsubscribe
      const unsubscribe = eventEmitter.onUserEvent(userId, mockCallback);
      unsubscribe();

      // Emit event - should not trigger callback
      eventEmitter.emitToUser(userId, event);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('emitToChannel', () => {
    it('should emit events to channel subscribers', () => {
      const channel = 'game:123';
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();
      const event: SSEEvent = {
        id: '1',
        type: 'GAME_MOVE' as any,
        payload: { gameId: '123', move: {} },
        timestamp: Date.now(),
      };

      // Multiple subscribers to same channel
      const unsub1 = eventEmitter.onChannelEvent(channel, mockCallback1);
      const unsub2 = eventEmitter.onChannelEvent(channel, mockCallback2);

      // Emit to channel
      eventEmitter.emitToChannel(channel, event);

      // Both callbacks should receive the event
      expect(mockCallback1).toHaveBeenCalledTimes(1);
      expect(mockCallback2).toHaveBeenCalledTimes(1);

      // Cleanup
      unsub1();
      unsub2();
    });
  });

  describe('emitToUsers', () => {
    it('should emit events to multiple users', () => {
      const userIds = ['user1', 'user2', 'user3'];
      const callbacks = userIds.map(() => vi.fn());
      const event: SSEEvent = {
        id: '1',
        type: 'NOTIFICATION_CREATED' as any,
        payload: { message: 'Broadcast message' },
        timestamp: Date.now(),
      };

      // Subscribe each user
      const unsubscribes = userIds.map((userId, i) => 
        eventEmitter.onUserEvent(userId, callbacks[i]!)
      );

      // Emit to all users
      eventEmitter.emitToUsers(userIds, event);

      // All callbacks should be called
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledTimes(1);
      });

      // Cleanup
      unsubscribes.forEach(unsub => unsub());
    });
  });

  describe('onMultipleChannels', () => {
    it('should subscribe to multiple channels at once', () => {
      const channels = ['chat:1', 'chat:2', 'game:1'];
      const mockCallback = vi.fn();
      const event: SSEEvent = {
        id: '1',
        type: 'MESSAGE_RECEIVED' as any,
        payload: { content: 'Test' },
        timestamp: Date.now(),
      };

      // Subscribe to multiple channels
      const unsubscribe = eventEmitter.onMultipleChannels(channels, mockCallback);

      // Emit to each channel
      channels.forEach(channel => {
        eventEmitter.emitToChannel(channel, event);
      });

      // Callback should be called once per channel
      expect(mockCallback).toHaveBeenCalledTimes(channels.length);

      // Cleanup
      unsubscribe();

      // After unsubscribe, no more events should be received
      mockCallback.mockClear();
      channels.forEach(channel => {
        eventEmitter.emitToChannel(channel, event);
      });
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('hasListeners', () => {
    it('should correctly report listener presence', () => {
      const userId = 'user123';
      const channel = 'game:456';

      // Initially no listeners
      expect(eventEmitter.hasUserListeners(userId)).toBe(false);
      expect(eventEmitter.hasChannelListeners(channel)).toBe(false);

      // Add listeners
      const unsub1 = eventEmitter.onUserEvent(userId, () => {});
      const unsub2 = eventEmitter.onChannelEvent(channel, () => {});

      // Should have listeners
      expect(eventEmitter.hasUserListeners(userId)).toBe(true);
      expect(eventEmitter.hasChannelListeners(channel)).toBe(true);

      // Remove listeners
      unsub1();
      unsub2();

      // No more listeners
      expect(eventEmitter.hasUserListeners(userId)).toBe(false);
      expect(eventEmitter.hasChannelListeners(channel)).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const userIds = ['user1', 'user2'];
      const channels = ['game:1', 'chat:1'];

      // Add some listeners
      const unsubscribes = [
        ...userIds.map(id => eventEmitter.onUserEvent(id, () => {})),
        ...channels.map(ch => eventEmitter.onChannelEvent(ch, () => {})),
      ];

      const stats = eventEmitter.getStats();

      expect(stats.totalChannels).toBe(4); // 2 user channels + 2 other channels
      expect(stats.totalListeners).toBe(4);
      expect(stats.channels).toHaveLength(4);

      // Cleanup
      unsubscribes.forEach(unsub => unsub());
    });
  });

  describe('cleanup methods', () => {
    it('should cleanup user listeners', () => {
      const userId = 'user123';
      const mockCallback = vi.fn();

      // Add multiple listeners for same user
      eventEmitter.onUserEvent(userId, mockCallback);
      eventEmitter.onUserEvent(userId, () => {});

      expect(eventEmitter.hasUserListeners(userId)).toBe(true);

      // Cleanup user
      eventEmitter.cleanupUser(userId);

      expect(eventEmitter.hasUserListeners(userId)).toBe(false);
    });

    it('should cleanup channel listeners', () => {
      const channel = 'game:123';
      const mockCallback = vi.fn();

      // Add listeners
      eventEmitter.onChannelEvent(channel, mockCallback);
      eventEmitter.onChannelEvent(channel, () => {});

      expect(eventEmitter.hasChannelListeners(channel)).toBe(true);

      // Cleanup channel
      eventEmitter.cleanupChannel(channel);

      expect(eventEmitter.hasChannelListeners(channel)).toBe(false);
    });

    it('should reset all listeners', () => {
      // Add various listeners
      eventEmitter.onUserEvent('user1', () => {});
      eventEmitter.onChannelEvent('game:1', () => {});
      eventEmitter.onChannelEvent('chat:1', () => {});

      const statsBefore = eventEmitter.getStats();
      expect(statsBefore.totalListeners).toBeGreaterThan(0);

      // Reset
      eventEmitter.reset();

      const statsAfter = eventEmitter.getStats();
      expect(statsAfter.totalListeners).toBe(0);
      expect(statsAfter.totalChannels).toBe(0);
    });
  });

  describe('sequence numbers', () => {
    it('should add incrementing sequence numbers to events', () => {
      const userId = 'user123';
      const receivedEvents: SSEEvent[] = [];

      const unsubscribe = eventEmitter.onUserEvent(userId, (event) => {
        receivedEvents.push(event);
      });

      // Emit multiple events
      for (let i = 0; i < 3; i++) {
        eventEmitter.emitToUser(userId, {
          id: `${i}`,
          type: 'HEARTBEAT' as any,
          payload: {},
          timestamp: Date.now(),
        });
      }

      // Check sequence numbers are incrementing
      expect(receivedEvents).toHaveLength(3);
      expect(receivedEvents[0]!.sequenceNumber).toBeLessThan(
        receivedEvents[1]!.sequenceNumber!
      );
      expect(receivedEvents[1]!.sequenceNumber).toBeLessThan(
        receivedEvents[2]!.sequenceNumber!
      );

      unsubscribe();
    });
  });
});