export interface NotificationEvent {
  type: NotificationEventType;
  payload: unknown;
  timestamp: string;
  userId: string;
  notificationId?: string;
}

export type NotificationEventType =
  | "NOTIFICATION_CREATED"
  | "NOTIFICATION_READ"
  | "NOTIFICATION_DISMISSED"
  | "CONNECTION_STATUS"
  | "HEARTBEAT";

// Specific event payload types
export interface NotificationCreatedPayload {
  id: string;
  type: "FRIEND_REQUEST" | "FRIEND_REQUEST_ACCEPTED" | "FRIEND_REQUEST_DECLINED";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  relatedEntityId?: string;
  createdAt: string;
}

export interface ConnectionStatusPayload {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
  lastConnected: string | null;
}

export interface NotificationReadPayload {
  notificationId: string;
  readAt: string;
}

// Client-side notification state
export interface NotificationState {
  id: string;
  type: "FRIEND_REQUEST" | "FRIEND_REQUEST_ACCEPTED" | "FRIEND_REQUEST_DECLINED";
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  relatedEntityId?: string;
  createdAt: string;
  readAt?: string;
}

export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

export interface NotificationContextValue {
  notifications: NotificationState[];
  unreadCount: number;
  connectionState: ConnectionState;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}