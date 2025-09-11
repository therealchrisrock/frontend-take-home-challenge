import type { NotificationType } from "@prisma/client";

export type UserId = string;
export type TabId = string;

export interface SSEMessage {
  type: 'notification' | 'heartbeat' | 'connection_established' | 'connection_closed' | 'error';
  data?: {
    notification?: NotificationData;
    tabId?: string;
    timestamp: number;
    message?: string;
  };
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
  type: 'heartbeat';
  data: {
    timestamp: number;
    tabId: string;
  };
}

export interface ConnectionStatusMessage {
  type: 'connection_established' | 'connection_closed';
  data: {
    tabId: string;
    timestamp: number;
    message?: string;
  };
}

export interface NotificationMessage {
  type: 'notification';
  data: {
    notification: NotificationData;
    timestamp: number;
  };
}

export interface ErrorMessage {
  type: 'error';
  data: {
    message: string;
    timestamp: number;
  };
}