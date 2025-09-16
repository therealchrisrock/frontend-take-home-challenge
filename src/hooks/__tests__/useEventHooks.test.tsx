/**
 * Tests for Specialized Event Hooks
 * 
 * Tests all the specialized hooks that access EventContext
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNotifications } from '../useNotifications';
import { useMessages } from '../useMessages';
import { useGameState } from '../useGameState';
import { usePresence, useUserPresence } from '../usePresence';
import { useFriendRequests } from '../useFriendRequests';
import type { ReactNode } from 'react';

// Mock EventContext
const mockEventContext = {
  // Connection state
  connectionState: 'connected' as const,
  lastConnected: new Date(),
  error: undefined,
  
  // Notifications
  notifications: [
    {
      id: 'notif-1',
      type: 'FRIEND_REQUEST',
      title: 'Friend Request',
      message: 'John wants to be friends',
      read: false,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'notif-2',
      type: 'MESSAGE',
      title: 'New Message',
      message: 'You have a message',
      read: true,
      createdAt: '2024-01-02T00:00:00Z',
    },
  ],
  unreadNotificationCount: 1,
  
  // Messages
  messages: new Map([
    ['chat-1', [
      {
        id: 'msg-1',
        senderId: 'user-1',
        senderName: 'User 1',
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00Z',
        read: false,
      },
      {
        id: 'msg-2',
        senderId: 'user-2',
        senderName: 'User 2',
        content: 'Hi there',
        createdAt: '2024-01-01T00:01:00Z',
        read: true,
      },
    ]],
  ]),
  typingStatus: new Map([
    ['chat-1', new Set(['user-3'])],
  ]),
  unreadMessageCounts: new Map([
    ['chat-1', 1],
    ['chat-2', 3],
  ]),
  
  // Games
  activeGames: new Map([
    ['game-1', {
      id: 'game-1',
      state: { board: [] },
      currentPlayer: 'user-1',
      lastUpdate: Date.now(),
    }],
  ]),
  gameInvites: [
    {
      id: 'invite-1',
      inviterId: 'user-2',
      inviterName: 'Player 2',
      gameId: 'game-2',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  
  // Presence
  userPresence: new Map([
    ['user-1', 'online'],
    ['user-2', 'offline'],
    ['user-3', 'away'],
  ]),
  
  // Friend requests
  pendingFriendRequests: [
    {
      requestId: 'req-1',
      senderId: 'user-4',
      senderName: 'New Friend',
      senderUsername: 'newfriend',
      status: 'pending',
    },
  ],
  
  // Methods
  reconnect: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
  sendMessage: vi.fn(),
  setTyping: vi.fn(),
  markMessagesRead: vi.fn(),
  makeGameMove: vi.fn(),
  acceptGameInvite: vi.fn(),
  declineGameInvite: vi.fn(),
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
};

vi.mock('~/contexts/event-context', () => ({
  useEventContext: () => mockEventContext,
}));

// Test wrapper
const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return notifications and actions', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.markAsRead).toBe(mockEventContext.markNotificationRead);
    expect(result.current.markAllAsRead).toBe(mockEventContext.markAllNotificationsRead);
    expect(result.current.dismiss).toBe(mockEventContext.deleteNotification);
  });

  it('should filter notifications by type', () => {
    const { result } = renderHook(
      () => useNotificationsByType('FRIEND_REQUEST'),
      { wrapper }
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      id: 'notif-1',
      type: 'FRIEND_REQUEST',
    });
  });

  it('should return only unread notifications', () => {
    const { result } = renderHook(() => useUnreadNotifications(), { wrapper });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      id: 'notif-1',
      read: false,
    });
  });
});

describe('useMessages', () => {
  it('should return messages for specific chat', () => {
    const { result } = renderHook(() => useMessages('chat-1'), { wrapper });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.typingUsers).toEqual(['user-3']);
    expect(result.current.sendMessage).toBe(mockEventContext.sendMessage);
    expect(result.current.setTyping).toBe(mockEventContext.setTyping);
  });

  it('should return empty array when no chatId provided', () => {
    const { result } = renderHook(() => useMessages(), { wrapper });

    expect(result.current.messages).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.typingUsers).toEqual([]);
  });

  it('should calculate total unread counts', () => {
    const { result } = renderHook(() => useUnreadMessageCounts(), { wrapper });

    expect(result.current.totalUnread).toBe(4); // 1 + 3
    expect(result.current.counts.get('chat-1')).toBe(1);
    expect(result.current.counts.get('chat-2')).toBe(3);
  });
});

describe('useGameState', () => {
  it('should return game state for specific game', () => {
    const { result } = renderHook(() => useGameState('game-1'), { wrapper });

    expect(result.current.gameState).toMatchObject({
      id: 'game-1',
      currentPlayer: 'user-1',
    });
  });

  it('should return null when no gameId provided', () => {
    const { result } = renderHook(() => useGameState(), { wrapper });

    expect(result.current.gameState).toBeNull();
  });

  it('should provide makeMove function', async () => {
    const { result } = renderHook(() => useGameState('game-1'), { wrapper });

    await result.current.makeMove({ from: 0, to: 1 });

    expect(mockEventContext.makeGameMove).toHaveBeenCalledWith(
      'game-1',
      { from: 0, to: 1 }
    );
  });

  it('should return all active games', () => {
    const { result } = renderHook(() => useActiveGames(), { wrapper });

    expect(result.current.games).toHaveLength(1);
    expect(result.current.totalGames).toBe(1);
    expect(result.current.games[0]).toMatchObject({
      id: 'game-1',
      currentPlayer: 'user-1',
    });
  });

  it('should return game invites', () => {
    const { result } = renderHook(() => useGameInvites(), { wrapper });

    expect(result.current.invites).toHaveLength(1);
    expect(result.current.invites[0]).toMatchObject({
      id: 'invite-1',
      inviterName: 'Player 2',
    });
    expect(result.current.acceptInvite).toBe(mockEventContext.acceptGameInvite);
    expect(result.current.declineInvite).toBe(mockEventContext.declineGameInvite);
  });
});

describe('usePresence', () => {
  it('should return presence for specific users', () => {
    const { result } = renderHook(
      () => usePresence(['user-1', 'user-2']),
      { wrapper }
    );

    expect(result.current.get('user-1')).toBe('online');
    expect(result.current.get('user-2')).toBe('offline');
    expect(result.current.has('user-3')).toBe(false);
  });

  it('should return all presence when no users specified', () => {
    const { result } = renderHook(() => usePresence(), { wrapper });

    expect(result.current.size).toBe(3);
    expect(result.current.get('user-3')).toBe('away');
  });

  it('should return single user presence', () => {
    const { result } = renderHook(() => useUserPresence('user-1'), { wrapper });

    expect(result.current.status).toBe('online');
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isAway).toBe(false);
    expect(result.current.isOffline).toBe(false);
  });

  it('should default to offline for unknown user', () => {
    const { result } = renderHook(() => useUserPresence('unknown'), { wrapper });

    expect(result.current.status).toBe('offline');
    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('should return online users', () => {
    const { result } = renderHook(() => useOnlineUsers(), { wrapper });

    expect(result.current.onlineUsers).toEqual(['user-1']);
    expect(result.current.onlineCount).toBe(1);
  });
});

describe('useFriendRequests', () => {
  it('should return pending friend requests', () => {
    const { result } = renderHook(() => useFriendRequests(), { wrapper });

    expect(result.current.requests).toHaveLength(1);
    expect(result.current.count).toBe(1);
    expect(result.current.requests[0]).toMatchObject({
      requestId: 'req-1',
      senderName: 'New Friend',
    });
    expect(result.current.accept).toBe(mockEventContext.acceptFriendRequest);
    expect(result.current.decline).toBe(mockEventContext.declineFriendRequest);
  });

  it('should check for request from specific user', () => {
    const { result } = renderHook(
      () => useFriendRequestFrom('user-4'),
      { wrapper }
    );

    expect(result.current.hasPendingRequest).toBe(true);
    expect(result.current.request).toMatchObject({
      requestId: 'req-1',
      senderId: 'user-4',
    });
  });

  it('should return null for no request from user', () => {
    const { result } = renderHook(
      () => useFriendRequestFrom('user-99'),
      { wrapper }
    );

    expect(result.current.hasPendingRequest).toBe(false);
    expect(result.current.request).toBeNull();
  });
});

// Import helper functions for testing
import { useNotificationsByType, useUnreadNotifications } from '../useNotifications';
import { useUnreadMessageCounts, useTypingStatus } from '../useMessages';
import { useActiveGames, useGameInvites } from '../useGameState';
import { useOnlineUsers } from '../usePresence';
import { useFriendRequestFrom } from '../useFriendRequests';

describe('useTypingStatus', () => {
  it('should return typing status map', () => {
    const { result } = renderHook(() => useTypingStatus(), { wrapper });

    expect(result.current.get('chat-1')).toBeInstanceOf(Set);
    expect(Array.from(result.current.get('chat-1')!)).toEqual(['user-3']);
  });
});