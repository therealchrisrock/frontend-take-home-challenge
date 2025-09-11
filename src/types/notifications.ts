/**
 * Type definitions for the friend request notification system
 * 
 * This module defines TypeScript interfaces and types for notifications,
 * friend requests, and real-time messaging via Server-Sent Events (SSE).
 */

import type { FriendRequestStatus, NotificationType } from "@prisma/client";

// Re-export Prisma enums for consistency
export type { FriendRequestStatus, NotificationType } from "@prisma/client";

/**
 * User information interface for notifications and friend requests
 */
export interface UserInfo {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  avatarKey: string | null;
}

/**
 * Core notification data structure matching the Notification Prisma model
 */
export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  relatedEntityId?: string | null;
  createdAt: Date;
  userId: string;
}

/**
 * Extended friend request data with sender/receiver information
 */
export interface FriendRequestData {
  id: string;
  sender: UserInfo;
  receiver: UserInfo;
  status: FriendRequestStatus;
  message?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Metadata structures for different notification types
 */
export interface FriendRequestMetadata {
  friendRequestId: string;
  senderUsername: string;
  senderImage?: string | null;
}

export interface MessageMetadata {
  messageId: string;
  senderId: string;
  conversationId?: string;
  messagePreview: string;
}

export interface GameInviteMetadata {
  gameId: string;
  inviterId: string;
  gameMode: string;
  variant?: string;
}

export interface SystemMetadata {
  category: 'maintenance' | 'announcement' | 'update';
  severity: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

/**
 * Union type for type-safe metadata handling
 */
export type NotificationMetadata = 
  | FriendRequestMetadata
  | MessageMetadata
  | GameInviteMetadata
  | SystemMetadata;

/**
 * Server-Sent Events message structure for real-time notifications
 */
export interface SSEMessage {
  type: 'notification' | 'heartbeat' | 'connection_established' | 'error';
  data?: {
    notification?: NotificationData;
    tabId?: string;
    timestamp: number;
    error?: string;
  };
}

/**
 * Extended notification with parsed metadata and user information
 */
export interface EnrichedNotificationData extends NotificationData {
  parsedMetadata?: NotificationMetadata;
  user?: UserInfo;
}

/**
 * Notification with friend request details (for FRIEND_REQUEST type notifications)
 */
export interface FriendRequestNotificationData extends NotificationData {
  type: 'FRIEND_REQUEST';
  friendRequest: FriendRequestData;
  parsedMetadata: FriendRequestMetadata;
}

/**
 * Notification with message details (for MESSAGE type notifications)
 */
export interface MessageNotificationData extends NotificationData {
  type: 'MESSAGE';
  parsedMetadata: MessageMetadata;
}

/**
 * Notification with game invite details (for GAME_INVITE type notifications)
 */
export interface GameInviteNotificationData extends NotificationData {
  type: 'GAME_INVITE';
  parsedMetadata: GameInviteMetadata;
}

/**
 * Discriminated union for type-safe notification handling
 */
export type TypedNotificationData = 
  | FriendRequestNotificationData
  | MessageNotificationData
  | GameInviteNotificationData
  | NotificationData; // Fallback for other types

/**
 * Notification counts for badge display
 */
export interface NotificationCounts {
  total: number;
  unread: number;
  friendRequests: number;
  messages: number;
  gameInvites: number;
  system: number;
}

/**
 * Notification grouping for UI display
 */
export interface NotificationGroup {
  date: string; // Format: "YYYY-MM-DD"
  notifications: EnrichedNotificationData[];
}

/**
 * Parameters for notification creation
 */
export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  relatedEntityId?: string;
}

/**
 * Parameters for friend request creation
 */
export interface CreateFriendRequestParams {
  senderId: string;
  receiverId: string;
  message?: string;
}

/**
 * Response types for friend request operations
 */
export interface FriendRequestResponse {
  success: boolean;
  friendRequest?: FriendRequestData;
  error?: string;
}

/**
 * SSE connection configuration
 */
export interface SSEConnectionConfig {
  url: string;
  tabId: string;
  reconnectInterval: number;
  heartbeatInterval: number;
  maxReconnectAttempts: number;
}

/**
 * Type guards for runtime type checking
 */

/**
 * Type guard to check if a notification is a friend request notification
 */
export function isFriendRequestNotification(
  notification: NotificationData
): notification is FriendRequestNotificationData {
  return notification.type === 'FRIEND_REQUEST';
}

/**
 * Type guard to check if a notification is a message notification
 */
export function isMessageNotification(
  notification: NotificationData
): notification is MessageNotificationData {
  return notification.type === 'MESSAGE';
}

/**
 * Type guard to check if a notification is a game invite notification
 */
export function isGameInviteNotification(
  notification: NotificationData
): notification is GameInviteNotificationData {
  return notification.type === 'GAME_INVITE';
}

/**
 * Type guard to check if metadata is friend request metadata
 */
export function isFriendRequestMetadata(
  metadata: unknown
): metadata is FriendRequestMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'friendRequestId' in metadata &&
    'senderUsername' in metadata
  );
}

/**
 * Type guard to check if metadata is message metadata
 */
export function isMessageMetadata(
  metadata: unknown
): metadata is MessageMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'messageId' in metadata &&
    'senderId' in metadata &&
    'messagePreview' in metadata
  );
}

/**
 * Type guard to check if an SSE message contains notification data
 */
export function isNotificationSSEMessage(
  message: SSEMessage
): message is SSEMessage & { data: { notification: NotificationData } } {
  return (
    message.type === 'notification' &&
    message.data !== undefined &&
    'notification' in message.data &&
    message.data.notification !== undefined
  );
}

/**
 * Constants for notification system
 */
export const NOTIFICATION_CONSTANTS = {
  MAX_TITLE_LENGTH: 100,
  MAX_MESSAGE_LENGTH: 500,
  MAX_FRIEND_REQUEST_MESSAGE_LENGTH: 200,
  DEFAULT_HEARTBEAT_INTERVAL: 30000, // 30 seconds
  DEFAULT_RECONNECT_INTERVAL: 5000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  NOTIFICATION_EXPIRY_DAYS: 30,
} as const;

/**
 * Notification type display names for UI
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  FRIEND_REQUEST: 'Friend Request',
  FRIEND_REQUEST_ACCEPTED: 'Friend Request Accepted',
  FRIEND_REQUEST_DECLINED: 'Friend Request Declined',
  MESSAGE: 'Message',
  GAME_INVITE: 'Game Invitation',
  SYSTEM: 'System Notification',
} as const;