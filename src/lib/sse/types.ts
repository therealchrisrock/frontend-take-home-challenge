import type { NotificationType } from "@prisma/client";

export type UserId = string;
export type TabId = string;

export interface SSEMessage {
  type: "HEARTBEAT" | "CONNECTION_STATUS" | "NOTIFICATION_CREATED" | "presence"; // kept for friends-mini-drawer presence updates
  payload?: unknown;
  // Legacy field name used in some routes; keep optional for transition
  data?: unknown;
  timestamp?: string | number;
  userId?: string;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  relatedEntityId?: string;
  createdAt: Date;
}

export interface NotificationConnection {
  id: string;
  userId: UserId;
  tabId: TabId;
  controller: ReadableStreamDefaultController<Uint8Array>;
  lastSeen: Date;
  isActive: boolean;
}

export interface UserSession {
  userId: UserId;
  connections: Map<TabId, NotificationConnection>;
  activeTabId: TabId | null;
}

export interface HeartbeatMessage {
  type: "HEARTBEAT";
  payload: { timestamp: string };
}

export interface ConnectionStatusMessage {
  type: "CONNECTION_STATUS";
  payload: {
    connected: boolean;
    reconnecting: boolean;
    error?: string;
    lastConnected: string | null;
  };
}

export interface NotificationMessage {
  type: "NOTIFICATION_CREATED";
  payload: {
    id: string;
    type:
      | "FRIEND_REQUEST"
      | "FRIEND_REQUEST_ACCEPTED"
      | "FRIEND_REQUEST_DECLINED";
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    relatedEntityId?: string;
    createdAt: string;
  };
}

export interface ErrorMessage {
  type: "error";
  data: {
    message: string;
    timestamp: number;
  };
}
