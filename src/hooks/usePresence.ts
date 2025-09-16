/**
 * usePresence Hook
 * 
 * Specialized hook for accessing user presence state from EventContext.
 * Provides filtered access to online status for specific users.
 */

import { useMemo } from 'react';
import { useEventContext } from '~/contexts/event-context';

/**
 * Get presence status for specific users
 */
export function usePresence(userIds?: string[]) {
  const context = useEventContext();
  
  const presenceMap = useMemo(() => {
    if (!userIds || userIds.length === 0) {
      return context.userPresence;
    }
    
    const filtered = new Map<string, string>();
    userIds.forEach(userId => {
      const status = context.userPresence.get(userId);
      if (status) {
        filtered.set(userId, status);
      }
    });
    return filtered;
  }, [context.userPresence, userIds]);
  
  return presenceMap;
}

/**
 * Get presence status for a single user
 */
export function useUserPresence(userId?: string) {
  const context = useEventContext();
  
  const status = useMemo(() => {
    if (!userId) return 'offline';
    return context.userPresence.get(userId) ?? 'offline';
  }, [context.userPresence, userId]);
  
  const isOnline = status === 'online';
  const isAway = status === 'away';
  const isOffline = status === 'offline';
  
  return {
    status,
    isOnline,
    isAway,
    isOffline,
  };
}

/**
 * Get all online users
 */
export function useOnlineUsers() {
  const context = useEventContext();
  
  const onlineUsers = useMemo(() => {
    const online: string[] = [];
    for (const [userId, status] of context.userPresence.entries()) {
      if (status === 'online') {
        online.push(userId);
      }
    }
    return online;
  }, [context.userPresence]);
  
  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
  };
}