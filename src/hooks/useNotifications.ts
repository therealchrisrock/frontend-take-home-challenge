import { useNotifications as useNotificationContext } from "~/contexts/notification-context";

/**
 * Hook that provides notification state and actions.
 * 
 * Features:
 * - Real-time notifications via SSE
 * - Automatic reconnection with exponential backoff
 * - Single-tab enforcement (prevents multiple connections)
 * - Toast notifications for new friend requests
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
export const useNotifications = useNotificationContext;