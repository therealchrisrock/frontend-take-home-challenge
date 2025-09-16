/**
 * Unified SSE Event System
 *
 * This file consolidates all real-time event types into a single, type-safe system.
 * It replaces scattered event definitions across the codebase.
 */

// ============================================================================
// Event Type Enumeration
// ============================================================================

export enum SSEEventType {
  // System events
  CONNECTION_STATUS = "CONNECTION_STATUS",
  HEARTBEAT = "HEARTBEAT",
  ERROR = "ERROR",

  // Notification events
  NOTIFICATION_CREATED = "NOTIFICATION_CREATED",
  NOTIFICATION_READ = "NOTIFICATION_READ",
  NOTIFICATION_DELETED = "NOTIFICATION_DELETED",

  // Message events
  MESSAGE_SENT = "MESSAGE_SENT",
  MESSAGE_RECEIVED = "MESSAGE_RECEIVED",
  MESSAGE_READ = "MESSAGE_READ",
  MESSAGE_DELETED = "MESSAGE_DELETED",
  TYPING_START = "TYPING_START",
  TYPING_STOP = "TYPING_STOP",

  // Game events
  GAME_CREATED = "GAME_CREATED",
  GAME_INVITE = "GAME_INVITE",
  GAME_STARTED = "GAME_STARTED",
  GAME_MOVE = "GAME_MOVE",
  GAME_STATE_SYNC = "GAME_STATE_SYNC",
  GAME_ENDED = "GAME_ENDED",
  GAME_RESIGNED = "GAME_RESIGNED",
  PLAYER_JOINED = "PLAYER_JOINED",
  PLAYER_LEFT = "PLAYER_LEFT",
  DRAW_REQUEST = "DRAW_REQUEST",
  DRAW_ACCEPTED = "DRAW_ACCEPTED",
  DRAW_DECLINED = "DRAW_DECLINED",

  // Presence events
  USER_ONLINE = "USER_ONLINE",
  USER_OFFLINE = "USER_OFFLINE",
  USER_AWAY = "USER_AWAY",
  PRESENCE = "PRESENCE", // Legacy support

  // Friend events
  FRIEND_REQUEST_RECEIVED = "FRIEND_REQUEST_RECEIVED",
  FRIEND_REQUEST_ACCEPTED = "FRIEND_REQUEST_ACCEPTED",
  FRIEND_REQUEST_DECLINED = "FRIEND_REQUEST_DECLINED",
}

// ============================================================================
// Base Event Structure
// ============================================================================

export interface SSEEvent<T = any> {
  id: string;
  type: SSEEventType;
  userId?: string; // Target user
  channel?: string; // Optional channel (game:123, chat:456)
  payload: T;
  timestamp: number;
  sequenceNumber?: number; // For ordering
}

// ============================================================================
// Event Payload Types
// ============================================================================

// Connection & System Payloads
export interface ConnectionStatusPayload {
  connected: boolean;
  reconnecting: boolean;
  error?: string | null;
  lastConnected: string | null;
  status?: "connected" | "disconnected" | "reconnecting";
}

export interface HeartbeatPayload {
  timestamp: number | string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
  details?: any;
  timestamp: number;
}

// Message Payloads
export interface MessagePayload {
  id: string;  // Changed from messageId to match server payload
  messageId?: string;  // Keep for backwards compatibility
  chatId?: string;
  senderId: string;
  receiverId?: string;  // Added - server sends this
  senderName: string;
  senderUsername?: string;
  senderAvatar?: string | null;
  senderImage?: string | null;
  content: string;
  createdAt?: string;
  read?: boolean;  // Added - server sends this
  metadata?: Record<string, any>;
}

export interface TypingPayload {
  userId: string;
  userName?: string;
  chatId: string;
  isTyping?: boolean;
}

// Game Payloads
export interface GameMovePayload {
  gameId: string;
  playerId: string;
  playerName?: string;
  playerRole?: "PLAYER_1" | "PLAYER_2";
  playerColor?: "red" | "black";
  move: any;
  gameState?: any;
  newBoard?: string; // JSON string of the board
  board?: string; // Alternative field name for board
  currentPlayer?: string;
  nextPlayer?: string;
  winner?: string | null;
  moveCount?: number;
  version?: number;
  timeRemaining?: Record<string, number>;
  timestamp?: number;
}

export interface GameInvitePayload {
  inviteId: string;
  gameId: string;
  inviterId: string;
  inviterName: string;
  inviterUsername?: string;
  inviterImage?: string | null;
  gameMode?: string;
  variant?: string;
  message?: string;
}

export interface GameStatePayload {
  gameId: string;
  state: any;
  currentPlayer?: string;
  status?: string;
  winner?: string;
}

export interface PlayerJoinedPayload {
  gameId: string;
  playerId: string;
  playerName: string;
  playerRole: "PLAYER_1" | "PLAYER_2";
  timestamp?: number;
}

export interface DrawRequestPayload {
  gameId: string;
  requestedBy: "PLAYER_1" | "PLAYER_2";
  timestamp?: number;
}

export interface DrawResponsePayload {
  gameId: string;
  respondedBy: "PLAYER_1" | "PLAYER_2";
  accepted?: boolean;
  declined?: boolean;
  timestamp?: number;
}

// Notification Payloads
export interface NotificationPayload {
  id?: string;
  notificationId?: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  relatedEntityId?: string;
  createdAt?: string;
  read?: boolean;
  readAt?: string;
}

// Presence Payloads
export interface PresencePayload {
  userId: string;
  online: boolean;
  status?: "online" | "offline" | "away";
  lastActive?: string;
  timestamp: number;
}

// Friend Request Payloads
export interface FriendRequestPayload {
  requestId: string;
  senderId: string;
  senderName?: string;
  senderUsername?: string;
  senderImage?: string | null;
  receiverId?: string;
  message?: string;
  status?: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt?: string;
}

// ============================================================================
// Type-safe Event Creators
// ============================================================================

export const createEvent = <T>(
  type: SSEEventType,
  payload: T,
  options?: {
    userId?: string;
    channel?: string;
    sequenceNumber?: number;
  },
): SSEEvent<T> => ({
  id: crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`,
  type,
  payload,
  userId: options?.userId,
  channel: options?.channel,
  sequenceNumber: options?.sequenceNumber,
  timestamp: Date.now(),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isConnectionStatusEvent(
  event: SSEEvent,
): event is SSEEvent<ConnectionStatusPayload> {
  return event.type === SSEEventType.CONNECTION_STATUS;
}

export function isHeartbeatEvent(
  event: SSEEvent,
): event is SSEEvent<HeartbeatPayload> {
  return event.type === SSEEventType.HEARTBEAT;
}

export function isMessageEvent(
  event: SSEEvent,
): event is SSEEvent<MessagePayload> {
  return [SSEEventType.MESSAGE_SENT, SSEEventType.MESSAGE_RECEIVED].includes(
    event.type,
  );
}

export function isGameEvent(
  event: SSEEvent,
): event is SSEEvent<GameMovePayload | GameStatePayload> {
  return event.type.startsWith("GAME_");
}

export function isNotificationEvent(
  event: SSEEvent,
): event is SSEEvent<NotificationPayload> {
  return event.type.startsWith("NOTIFICATION_");
}

export function isPresenceEvent(
  event: SSEEvent,
): event is SSEEvent<PresencePayload> {
  return [
    SSEEventType.USER_ONLINE,
    SSEEventType.USER_OFFLINE,
    SSEEventType.USER_AWAY,
    SSEEventType.PRESENCE,
  ].includes(event.type);
}

// ============================================================================
// Legacy Compatibility Mappings
// ============================================================================

export const LEGACY_EVENT_MAPPINGS: Record<string, SSEEventType> = {
  notification: SSEEventType.NOTIFICATION_CREATED,
  heartbeat: SSEEventType.HEARTBEAT,
  connection_established: SSEEventType.CONNECTION_STATUS,
  presence: SSEEventType.PRESENCE,
  GAME_MOVE: SSEEventType.GAME_MOVE,
  PLAYER_JOINED: SSEEventType.PLAYER_JOINED,
  DRAW_REQUEST: SSEEventType.DRAW_REQUEST,
  DRAW_ACCEPTED: SSEEventType.DRAW_ACCEPTED,
  DRAW_DECLINED: SSEEventType.DRAW_DECLINED,
};

// ============================================================================
// Event Channel Helpers
// ============================================================================

export const createGameChannel = (gameId: string): string => `game:${gameId}`;
export const createChatChannel = (chatId: string): string => `chat:${chatId}`;
export const createUserChannel = (userId: string): string => `user:${userId}`;

export const parseChannel = (
  channel: string,
): { type: string; id: string } | null => {
  const parts = channel.split(":");
  if (parts.length !== 2) return null;
  return { type: parts[0]!, id: parts[1]! };
};

// ============================================================================
// Export All Types
// ============================================================================

export type AnySSEPayload =
  | ConnectionStatusPayload
  | HeartbeatPayload
  | ErrorPayload
  | MessagePayload
  | TypingPayload
  | GameMovePayload
  | GameInvitePayload
  | GameStatePayload
  | PlayerJoinedPayload
  | DrawRequestPayload
  | DrawResponsePayload
  | NotificationPayload
  | PresencePayload
  | FriendRequestPayload;
