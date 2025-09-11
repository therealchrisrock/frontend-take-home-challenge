import type { NotificationState } from "./types";

/**
 * Get notification icon based on notification type
 */
export function getNotificationIcon(type: NotificationState["type"]): string {
  switch (type) {
    case "FRIEND_REQUEST":
      return "👋";
    case "FRIEND_REQUEST_ACCEPTED":
      return "✅";
    case "FRIEND_REQUEST_DECLINED":
      return "❌";
    default:
      return "🔔";
  }
}

/**
 * Get notification priority for sorting (higher = more important)
 */
export function getNotificationPriority(type: NotificationState["type"]): number {
  switch (type) {
    case "FRIEND_REQUEST":
      return 3;
    case "FRIEND_REQUEST_ACCEPTED":
      return 2;
    case "FRIEND_REQUEST_DECLINED":
      return 1;
    default:
      return 0;
  }
}

/**
 * Sort notifications by priority and creation date
 */
export function sortNotifications(notifications: NotificationState[]): NotificationState[] {
  return notifications.sort((a, b) => {
    // First, sort by read status (unread first)
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }
    
    // Then by priority (higher priority first)
    const priorityDiff = getNotificationPriority(b.type) - getNotificationPriority(a.type);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Finally by creation date (newer first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Format notification metadata for display
 */
export function formatNotificationMetadata(
  metadata?: Record<string, unknown>
): Record<string, string> {
  if (!metadata) return {};
  
  const formatted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string") {
      formatted[key] = value;
    } else if (typeof value === "number") {
      formatted[key] = value.toString();
    } else if (typeof value === "boolean") {
      formatted[key] = value ? "Yes" : "No";
    } else if (value !== null && value !== undefined) {
      formatted[key] = JSON.stringify(value);
    }
  }
  
  return formatted;
}

/**
 * Get relative time string for notification
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return "Just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Truncate notification message to specified length
 */
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) {
    return message;
  }
  
  return message.substring(0, maxLength - 3).trim() + "...";
}

/**
 * Generate notification sound based on type
 */
export function getNotificationSound(type: NotificationState["type"]): string | null {
  // Return null for now - can be extended later with actual sound files
  switch (type) {
    case "FRIEND_REQUEST":
      return "notification-friend-request";
    case "FRIEND_REQUEST_ACCEPTED":
      return "notification-success";
    case "FRIEND_REQUEST_DECLINED":
      return "notification-info";
    default:
      return "notification-default";
  }
}

/**
 * Check if notification should be shown as toast
 */
export function shouldShowToast(type: NotificationState["type"]): boolean {
  // Show toast for all friend request related notifications
  return ["FRIEND_REQUEST", "FRIEND_REQUEST_ACCEPTED", "FRIEND_REQUEST_DECLINED"].includes(type);
}

/**
 * Get connection status message
 */
export function getConnectionStatusMessage(
  connected: boolean,
  reconnecting: boolean,
  error?: string
): string {
  if (connected) {
    return "Connected";
  } else if (reconnecting) {
    return "Reconnecting...";
  } else if (error) {
    return `Connection error: ${error}`;
  } else {
    return "Disconnected";
  }
}

/**
 * Calculate exponential backoff delay
 */
export function calculateReconnectDelay(
  attempts: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const multiplier = Math.min(Math.pow(2, attempts), maxDelay / baseDelay);
  return Math.min(baseDelay * multiplier, maxDelay);
}