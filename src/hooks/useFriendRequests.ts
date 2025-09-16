/**
 * useFriendRequests Hook
 * 
 * Specialized hook for accessing friend request state from EventContext.
 * Provides access to pending friend requests and related actions.
 */

import { useMemo } from 'react';
import { useEventContext } from '~/contexts/event-context';

/**
 * Get all pending friend requests
 */
export function useFriendRequests() {
  const context = useEventContext();
  
  return {
    requests: context.pendingFriendRequests,
    count: context.pendingFriendRequests.length,
    accept: context.acceptFriendRequest,
    decline: context.declineFriendRequest,
  };
}

/**
 * Check if a specific user has sent a friend request
 */
export function useFriendRequestFrom(userId?: string) {
  const { requests } = useFriendRequests();
  
  const request = useMemo(() => {
    if (!userId) return null;
    return requests.find(r => r.senderId === userId) ?? null;
  }, [requests, userId]);
  
  return {
    request,
    hasPendingRequest: !!request,
  };
}