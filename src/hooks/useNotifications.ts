import { useMemo, useCallback } from 'react';
import { useEventContext } from '~/contexts/event-context';
import { api } from '~/trpc/react';

/**
 * Hook that provides notification state and actions.
 * 
 * Features:
 * - Real-time notifications via tRPC SSE subscription
 * - Automatic reconnection with exponential backoff
 * - Toast notifications for new notifications
 * - Optimistic updates for read/dismiss actions
 * - Integration with tRPC for server state
 * 
 * @example
 * ```tsx
 * function NotificationBell() {
 *   const { notifications, unreadCount, markAsRead } = useNotifications();
 *   
 *   return (
 *     <div className="relative">
 *       <Bell className="h-6 w-6" />
 *       {unreadCount > 0 && (
 *         <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1">
 *           {unreadCount}
 *         </span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotifications() {
  const context = useEventContext();
  const utils = api.useUtils();
  
  // Create a refetch function that can refresh notifications from the server
  const refetch = useCallback(async () => {
    // In a real-time system, this is mostly unnecessary but kept for compatibility
    // It can trigger a re-query of the initial notifications
    await utils.notification.getAll.invalidate();
    return { data: context.notifications, error: null };
  }, [utils, context.notifications]);
  
  // Create connection state object for compatibility with notification-bell
  const connectionState = useMemo(() => ({
    connected: context.connectionState === 'connected',
    reconnecting: context.connectionState === 'reconnecting',
    error: context.error,
  }), [context.connectionState, context.error]);
  
  return useMemo(() => ({
    notifications: context.notifications,
    unreadCount: context.unreadNotificationCount,
    markAsRead: context.markNotificationRead,
    markAllAsRead: context.markAllNotificationsRead,
    dismiss: context.deleteNotification,
    connectionState,
    refetch,
  }), [
    context.notifications,
    context.unreadNotificationCount,
    context.markNotificationRead,
    context.markAllNotificationsRead,
    context.deleteNotification,
    connectionState,
    refetch,
  ]);
}

/**
 * Get notifications by type
 */
export function useNotificationsByType(type: string) {
  const { notifications } = useNotifications();
  
  return useMemo(
    () => notifications.filter(n => n.type === type),
    [notifications, type]
  );
}

/**
 * Get unread notifications only
 */
export function useUnreadNotifications() {
  const { notifications } = useNotifications();
  
  return useMemo(
    () => notifications.filter(n => !n.read),
    [notifications]
  );
}