/**
 * Events Router Tests
 * 
 * Tests the tRPC events router with SSE subscriptions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { observable } from '@trpc/server/observable';
import { createInnerTRPCContext } from '../../trpc';
import { eventsRouter } from '../events';
import { eventEmitter } from '../../../event-emitter';
import type { SSEEvent } from '~/types/sse-events';
import { SSEEventType } from '~/types/sse-events';

// Mock Prisma client
vi.mock('~/server/db', () => ({
  db: {
    game: {
      findMany: vi.fn(),
    },
    friendship: {
      findMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    block: {
      findFirst: vi.fn(),
    },
    chat: {
      findMany: vi.fn(),
    },
  },
}));

describe('eventsRouter', () => {
  const mockSession = {
    user: {
      id: 'test-user-123',
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      needsUsername: false,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  let ctx: ReturnType<typeof createInnerTRPCContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventEmitter.reset();
    
    // Create context with mock session
    ctx = createInnerTRPCContext({
      session: mockSession,
      headers: new Headers(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('onAllEvents subscription', () => {
    it('should emit initial connection status event', async () => {
      const events: SSEEvent[] = [];
      
      // Mock database queries
      const { db } = await import('~/server/db');
      vi.mocked(db.game.findMany).mockResolvedValue([]);
      vi.mocked(db.friendship.findMany).mockResolvedValue([]);
      vi.mocked(db.user.update).mockResolvedValue({} as any);

      // Create subscription
      const subscription = await eventsRouter
        .createCaller(ctx)
        .onAllEvents();

      // Subscribe to events
      const unsubscribe = subscription.subscribe((event) => {
        events.push(event);
      });

      // Wait for initial event
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should receive connection status
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: SSEEventType.CONNECTION_STATUS,
        payload: {
          connected: true,
          reconnecting: false,
          error: null,
          status: 'connected',
        },
      });

      unsubscribe();
    });

    it('should subscribe to user channel events', async () => {
      const events: SSEEvent[] = [];
      
      // Mock database queries
      const { db } = await import('~/server/db');
      vi.mocked(db.game.findMany).mockResolvedValue([]);
      vi.mocked(db.friendship.findMany).mockResolvedValue([]);
      vi.mocked(db.user.update).mockResolvedValue({} as any);

      // Create subscription
      const subscription = await eventsRouter
        .createCaller(ctx)
        .onAllEvents();

      const unsubscribe = subscription.subscribe((event) => {
        events.push(event);
      });

      // Wait for subscription to be set up
      await new Promise(resolve => setTimeout(resolve, 50));

      // Emit event to user channel
      const testEvent: SSEEvent = {
        id: 'test-1',
        type: SSEEventType.NOTIFICATION_CREATED,
        payload: {
          id: 'notif-1',
          type: 'FRIEND_REQUEST',
          title: 'Friend Request',
          message: 'You have a new friend request',
        },
        timestamp: Date.now(),
      };

      eventEmitter.emitToUser(mockSession.user.id, testEvent);

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should receive the notification event (plus initial connection)
      expect(events).toHaveLength(2);
      expect(events[1]).toMatchObject({
        type: SSEEventType.NOTIFICATION_CREATED,
        payload: testEvent.payload,
      });

      unsubscribe();
    });

    it('should subscribe to game channels', async () => {
      const events: SSEEvent[] = [];
      const mockGames = [
        { id: 'game-1' },
        { id: 'game-2' },
      ];

      // Mock database queries
      const { db } = await import('~/server/db');
      vi.mocked(db.game.findMany).mockResolvedValue(mockGames as any);
      vi.mocked(db.friendship.findMany).mockResolvedValue([]);
      vi.mocked(db.user.update).mockResolvedValue({} as any);

      // Create subscription
      const subscription = await eventsRouter
        .createCaller(ctx)
        .onAllEvents();

      const unsubscribe = subscription.subscribe((event) => {
        events.push(event);
      });

      // Wait for async game subscription
      await new Promise(resolve => setTimeout(resolve, 100));

      // Emit event to game channel
      const gameEvent: SSEEvent = {
        id: 'test-2',
        type: SSEEventType.GAME_MOVE,
        payload: {
          gameId: 'game-1',
          move: { from: 0, to: 1 },
        },
        timestamp: Date.now(),
      };

      eventEmitter.emit(`game:game-1`, gameEvent);

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should receive the game event
      const gameEvents = events.filter(e => e.type === SSEEventType.GAME_MOVE);
      expect(gameEvents).toHaveLength(1);
      expect(gameEvents[0]).toMatchObject({
        type: SSEEventType.GAME_MOVE,
        payload: gameEvent.payload,
      });

      unsubscribe();
    });

    it('should handle cleanup on unsubscribe', async () => {
      // Mock database queries
      const { db } = await import('~/server/db');
      vi.mocked(db.game.findMany).mockResolvedValue([]);
      vi.mocked(db.friendship.findMany).mockResolvedValue([]);
      vi.mocked(db.user.update).mockResolvedValue({} as any);

      // Create subscription
      const subscription = await eventsRouter
        .createCaller(ctx)
        .onAllEvents();

      const unsubscribe = subscription.subscribe(() => {});

      // Check that listeners exist
      expect(eventEmitter.hasUserListeners(mockSession.user.id)).toBe(true);

      // Unsubscribe
      unsubscribe();

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 50));

      // Listeners should be cleaned up
      expect(eventEmitter.hasUserListeners(mockSession.user.id)).toBe(false);
    });
  });

  describe('sendMessage mutation', () => {
    it('should create message and emit events', async () => {
      const receiverId = 'receiver-123';
      const content = 'Hello, world!';
      
      // Mock database operations
      const { db } = await import('~/server/db');
      vi.mocked(db.block.findFirst).mockResolvedValue(null);
      vi.mocked(db.message.create).mockResolvedValue({
        id: 'msg-1',
        senderId: mockSession.user.id,
        receiverId,
        content,
        createdAt: new Date(),
        sender: {
          id: mockSession.user.id,
          username: 'testuser',
          name: 'Test User',
          image: null,
        },
      } as any);
      vi.mocked(db.notification.create).mockResolvedValue({
        id: 'notif-1',
        userId: receiverId,
        type: 'MESSAGE',
        title: 'New Message',
        message: content,
        createdAt: new Date(),
      } as any);

      // Set up event listener for receiver
      const receivedEvents: SSEEvent[] = [];
      const unsubscribe = eventEmitter.onUserEvent(receiverId, (event) => {
        receivedEvents.push(event);
      });

      // Call mutation
      const result = await eventsRouter
        .createCaller(ctx)
        .sendMessage({ receiverId, content });

      // Should create message
      expect(result).toMatchObject({
        id: 'msg-1',
        content,
      });

      // Should emit events to receiver
      expect(receivedEvents).toHaveLength(2);
      
      // Message event
      expect(receivedEvents[0]).toMatchObject({
        type: SSEEventType.MESSAGE_RECEIVED,
        payload: expect.objectContaining({
          messageId: 'msg-1',
          content,
        }),
      });

      // Notification event
      expect(receivedEvents[1]).toMatchObject({
        type: SSEEventType.NOTIFICATION_CREATED,
        payload: expect.objectContaining({
          id: 'notif-1',
          type: 'MESSAGE',
        }),
      });

      unsubscribe();
    });

    it('should prevent self-messaging', async () => {
      await expect(
        eventsRouter
          .createCaller(ctx)
          .sendMessage({ 
            receiverId: mockSession.user.id, 
            content: 'Self message' 
          })
      ).rejects.toThrow('Cannot send message to yourself');
    });

    it('should check for blocks', async () => {
      const { db } = await import('~/server/db');
      vi.mocked(db.block.findFirst).mockResolvedValue({
        id: 'block-1',
        blockerId: 'user-123',
        blockedId: mockSession.user.id,
      } as any);

      await expect(
        eventsRouter
          .createCaller(ctx)
          .sendMessage({ 
            receiverId: 'user-123', 
            content: 'Test' 
          })
      ).rejects.toThrow('Cannot send message to this user');
    });
  });

  describe('setTyping mutation', () => {
    it('should emit typing events to chat channel', async () => {
      const chatId = 'chat-123';
      const receivedEvents: SSEEvent[] = [];

      // Subscribe to chat channel
      const unsubscribe = eventEmitter.onChannelEvent(`chat:${chatId}`, (event) => {
        receivedEvents.push(event);
      });

      // Start typing
      await eventsRouter
        .createCaller(ctx)
        .setTyping({ chatId, isTyping: true });

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toMatchObject({
        type: SSEEventType.TYPING_START,
        payload: expect.objectContaining({
          userId: mockSession.user.id,
          chatId,
          isTyping: true,
        }),
      });

      // Stop typing
      await eventsRouter
        .createCaller(ctx)
        .setTyping({ chatId, isTyping: false });

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[1]).toMatchObject({
        type: SSEEventType.TYPING_STOP,
        payload: expect.objectContaining({
          userId: mockSession.user.id,
          chatId,
          isTyping: false,
        }),
      });

      unsubscribe();
    });
  });

  describe('makeGameMove mutation', () => {
    it('should emit game move events', async () => {
      const gameId = 'game-456';
      const move = { from: 0, to: 1 };
      const player1Id = mockSession.user.id;
      const player2Id = 'player-2';

      // Mock database
      const { db } = await import('~/server/db');
      vi.mocked(db.game.findUnique).mockResolvedValue({
        id: gameId,
        player1Id,
        player2Id,
        player1: { id: player1Id },
        player2: { id: player2Id },
      } as any);

      // Set up listeners
      const gameEvents: SSEEvent[] = [];
      const player2Events: SSEEvent[] = [];

      const unsubGame = eventEmitter.onChannelEvent(`game:${gameId}`, (event) => {
        gameEvents.push(event);
      });
      const unsubPlayer2 = eventEmitter.onUserEvent(player2Id, (event) => {
        player2Events.push(event);
      });

      // Make move
      const result = await eventsRouter
        .createCaller(ctx)
        .makeGameMove({ gameId, move });

      expect(result).toMatchObject({
        success: true,
        nextPlayer: player2Id,
      });

      // Should emit to game channel
      expect(gameEvents).toHaveLength(1);
      expect(gameEvents[0]).toMatchObject({
        type: SSEEventType.GAME_MOVE,
        payload: expect.objectContaining({
          gameId,
          move,
          playerId: player1Id,
          playerRole: 'PLAYER_1',
          nextPlayer: player2Id,
        }),
      });

      // Should also emit to both players directly
      expect(player2Events).toHaveLength(1);
      expect(player2Events[0]).toMatchObject({
        type: SSEEventType.GAME_MOVE,
      });

      unsubGame();
      unsubPlayer2();
    });
  });

  describe('updatePresence mutation', () => {
    it('should update presence and notify friends', async () => {
      const friendId = 'friend-123';
      
      // Mock database
      const { db } = await import('~/server/db');
      vi.mocked(db.user.update).mockResolvedValue({} as any);
      vi.mocked(db.friendship.findMany).mockResolvedValue([
        {
          senderId: mockSession.user.id,
          receiverId: friendId,
        },
      ] as any);

      // Listen for friend's events
      const friendEvents: SSEEvent[] = [];
      const unsubscribe = eventEmitter.onUserEvent(friendId, (event) => {
        friendEvents.push(event);
      });

      // Update presence to online
      await eventsRouter
        .createCaller(ctx)
        .updatePresence({ status: 'online' });

      expect(friendEvents).toHaveLength(1);
      expect(friendEvents[0]).toMatchObject({
        type: SSEEventType.USER_ONLINE,
        payload: {
          userId: mockSession.user.id,
          online: true,
          status: 'online',
        },
      });

      // Update to offline
      await eventsRouter
        .createCaller(ctx)
        .updatePresence({ status: 'offline' });

      expect(friendEvents).toHaveLength(2);
      expect(friendEvents[1]).toMatchObject({
        type: SSEEventType.USER_OFFLINE,
        payload: {
          userId: mockSession.user.id,
          online: false,
          status: 'offline',
        },
      });

      unsubscribe();
    });
  });

  describe('getStats query', () => {
    it('should return event emitter statistics', async () => {
      // Add some listeners
      eventEmitter.onUserEvent('user1', () => {});
      eventEmitter.onChannelEvent('game:1', () => {});

      const stats = await eventsRouter
        .createCaller(ctx)
        .getStats();

      expect(stats).toMatchObject({
        totalChannels: expect.any(Number),
        totalListeners: expect.any(Number),
        channels: expect.any(Array),
      });

      expect(stats.totalListeners).toBeGreaterThanOrEqual(2);
    });
  });
});