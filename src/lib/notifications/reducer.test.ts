import { describe, it, expect } from "vitest";
import {
  notificationReducer,
  initialNotificationState,
  type NotificationAction,
} from "./reducer";
import type { NotificationState, ConnectionState } from "./types";

describe("notificationReducer", () => {
  it("should initialize notifications", () => {
    const notifications: NotificationState[] = [
      {
        id: "1",
        type: "FRIEND_REQUEST",
        title: "Friend Request",
        message: "You have a new friend request",
        read: false,
        createdAt: "2023-01-01T00:00:00Z",
      },
    ];

    const action: NotificationAction = {
      type: "INITIALIZE_NOTIFICATIONS",
      payload: notifications,
    };

    const result = notificationReducer(initialNotificationState, action);

    expect(result.notifications).toEqual(notifications);
    expect(result.connectionState).toEqual(initialNotificationState.connectionState);
  });

  it("should add new notification", () => {
    const newNotification: NotificationState = {
      id: "2",
      type: "FRIEND_REQUEST_ACCEPTED",
      title: "Friend Request Accepted",
      message: "Your friend request was accepted",
      read: false,
      createdAt: "2023-01-01T01:00:00Z",
    };

    const action: NotificationAction = {
      type: "NOTIFICATION_RECEIVED",
      payload: newNotification,
    };

    const result = notificationReducer(initialNotificationState, action);

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toEqual(newNotification);
  });

  it("should mark notification as read", () => {
    const initialState = {
      ...initialNotificationState,
      notifications: [
        {
          id: "1",
          type: "FRIEND_REQUEST" as const,
          title: "Friend Request",
          message: "You have a new friend request",
          read: false,
          createdAt: "2023-01-01T00:00:00Z",
        },
      ],
    };

    const action: NotificationAction = {
      type: "NOTIFICATION_READ",
      payload: {
        notificationId: "1",
        readAt: "2023-01-01T02:00:00Z",
      },
    };

    const result = notificationReducer(initialState, action);

    expect(result.notifications[0]?.read).toBe(true);
    expect(result.notifications[0]?.readAt).toBe("2023-01-01T02:00:00Z");
  });

  it("should handle optimistic update and rollback", () => {
    const initialState = {
      ...initialNotificationState,
      notifications: [
        {
          id: "1",
          type: "FRIEND_REQUEST" as const,
          title: "Friend Request",
          message: "You have a new friend request",
          read: false,
          createdAt: "2023-01-01T00:00:00Z",
        },
      ],
    };

    // Optimistic update
    const optimisticAction: NotificationAction = {
      type: "OPTIMISTIC_MARK_READ",
      payload: {
        notificationId: "1",
        readAt: "2023-01-01T02:00:00Z",
      },
    };

    const optimisticResult = notificationReducer(initialState, optimisticAction);

    expect(optimisticResult.notifications[0]?.read).toBe(true);
    expect(optimisticResult.optimisticUpdates.has("1")).toBe(true);

    // Rollback
    const rollbackAction: NotificationAction = {
      type: "REVERT_OPTIMISTIC",
      payload: { notificationId: "1" },
    };

    const rollbackResult = notificationReducer(optimisticResult, rollbackAction);

    expect(rollbackResult.notifications[0]?.read).toBe(false);
    expect(rollbackResult.optimisticUpdates.has("1")).toBe(false);
  });

  it("should update connection state", () => {
    const newConnectionState: ConnectionState = {
      connected: true,
      reconnecting: false,
      error: undefined,
      lastConnected: new Date("2023-01-01T00:00:00Z"),
      reconnectAttempts: 0,
    };

    const action: NotificationAction = {
      type: "CONNECTION_STATUS_CHANGED",
      payload: newConnectionState,
    };

    const result = notificationReducer(initialNotificationState, action);

    expect(result.connectionState).toEqual(newConnectionState);
  });

  it("should handle connection opened", () => {
    const initialStateWithError = {
      ...initialNotificationState,
      connectionState: {
        ...initialNotificationState.connectionState,
        connected: false,
        reconnecting: true,
        error: "Connection lost",
        reconnectAttempts: 3,
      },
    };

    const action: NotificationAction = {
      type: "CONNECTION_OPENED",
      payload: { lastConnected: new Date("2023-01-01T00:00:00Z") },
    };

    const result = notificationReducer(initialStateWithError, action);

    expect(result.connectionState.connected).toBe(true);
    expect(result.connectionState.reconnecting).toBe(false);
    expect(result.connectionState.error).toBeUndefined();
    expect(result.connectionState.reconnectAttempts).toBe(0);
    expect(result.connectionState.lastConnected).toEqual(new Date("2023-01-01T00:00:00Z"));
  });

  it("should handle connection error", () => {
    const action: NotificationAction = {
      type: "CONNECTION_ERROR",
      payload: {
        error: "Connection lost",
        reconnectAttempts: 2,
      },
    };

    const result = notificationReducer(initialNotificationState, action);

    expect(result.connectionState.connected).toBe(false);
    expect(result.connectionState.reconnecting).toBe(true);
    expect(result.connectionState.error).toBe("Connection lost");
    expect(result.connectionState.reconnectAttempts).toBe(2);
  });

  it("should mark all notifications as read", () => {
    const initialState = {
      ...initialNotificationState,
      notifications: [
        {
          id: "1",
          type: "FRIEND_REQUEST" as const,
          title: "Friend Request 1",
          message: "You have a new friend request",
          read: false,
          createdAt: "2023-01-01T00:00:00Z",
        },
        {
          id: "2",
          type: "FRIEND_REQUEST_ACCEPTED" as const,
          title: "Friend Request Accepted",
          message: "Your friend request was accepted",
          read: false,
          createdAt: "2023-01-01T01:00:00Z",
        },
      ],
    };

    const action: NotificationAction = {
      type: "MARK_ALL_READ",
      payload: { readAt: "2023-01-01T02:00:00Z" },
    };

    const result = notificationReducer(initialState, action);

    expect(result.notifications.every(n => n.read)).toBe(true);
    expect(result.notifications.every(n => n.readAt === "2023-01-01T02:00:00Z")).toBe(true);
  });

  it("should dismiss notification optimistically", () => {
    const initialState = {
      ...initialNotificationState,
      notifications: [
        {
          id: "1",
          type: "FRIEND_REQUEST" as const,
          title: "Friend Request",
          message: "You have a new friend request",
          read: false,
          createdAt: "2023-01-01T00:00:00Z",
        },
      ],
    };

    const action: NotificationAction = {
      type: "OPTIMISTIC_DISMISS",
      payload: { notificationId: "1" },
    };

    const result = notificationReducer(initialState, action);

    expect(result.notifications).toHaveLength(0);
    expect(result.optimisticUpdates.has("1")).toBe(true);
  });
});