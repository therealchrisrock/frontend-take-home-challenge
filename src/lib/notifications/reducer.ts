import type { NotificationState, ConnectionState } from "./types";

// Combined state for the notification system
export interface NotificationReducerState {
  notifications: NotificationState[];
  connectionState: ConnectionState;
  optimisticUpdates: Map<string, NotificationState>; // Track optimistic updates for rollback
}

// Action types for the notification reducer
export type NotificationAction =
  | { type: "INITIALIZE_NOTIFICATIONS"; payload: NotificationState[] }
  | { type: "NOTIFICATION_RECEIVED"; payload: NotificationState }
  | { type: "NOTIFICATION_READ"; payload: { notificationId: string; readAt: string } }
  | { type: "NOTIFICATION_DISMISSED"; payload: { notificationId: string } }
  | { type: "CONNECTION_STATUS_CHANGED"; payload: ConnectionState }
  | { type: "CONNECTION_OPENED"; payload: { lastConnected: Date } }
  | { type: "CONNECTION_ERROR"; payload: { error: string; reconnectAttempts: number } }
  | { type: "HEARTBEAT"; payload: { lastConnected: Date } }
  | { type: "OPTIMISTIC_MARK_READ"; payload: { notificationId: string; readAt: string } }
  | { type: "OPTIMISTIC_DISMISS"; payload: { notificationId: string } }
  | { type: "REVERT_OPTIMISTIC"; payload: { notificationId: string } }
  | { type: "MARK_ALL_READ"; payload: { readAt: string } }
  | { type: "RESET_CONNECTION_ATTEMPTS" };

export const initialNotificationState: NotificationReducerState = {
  notifications: [],
  connectionState: {
    connected: false,
    reconnecting: false,
    error: undefined,
    lastConnected: null,
    reconnectAttempts: 0,
  },
  optimisticUpdates: new Map(),
};

export function notificationReducer(
  state: NotificationReducerState,
  action: NotificationAction
): NotificationReducerState {
  switch (action.type) {
    case "INITIALIZE_NOTIFICATIONS":
      return {
        ...state,
        notifications: action.payload,
      };

    case "NOTIFICATION_RECEIVED":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };

    case "NOTIFICATION_READ":
      return {
        ...state,
        // Remove read notifications from the list entirely
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.payload.notificationId
        ),
        // Remove from optimistic updates if it exists
        optimisticUpdates: new Map(
          Array.from(state.optimisticUpdates.entries()).filter(
            ([id]) => id !== action.payload.notificationId
          )
        ),
      };

    case "NOTIFICATION_DISMISSED":
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.payload.notificationId
        ),
        // Remove from optimistic updates if it exists
        optimisticUpdates: new Map(
          Array.from(state.optimisticUpdates.entries()).filter(
            ([id]) => id !== action.payload.notificationId
          )
        ),
      };

    case "CONNECTION_STATUS_CHANGED":
      return {
        ...state,
        connectionState: action.payload,
      };

    case "CONNECTION_OPENED":
      return {
        ...state,
        connectionState: {
          ...state.connectionState,
          connected: true,
          reconnecting: false,
          error: undefined,
          lastConnected: action.payload.lastConnected,
          reconnectAttempts: 0,
        },
      };

    case "CONNECTION_ERROR":
      return {
        ...state,
        connectionState: {
          ...state.connectionState,
          connected: false,
          reconnecting: true,
          error: action.payload.error,
          reconnectAttempts: action.payload.reconnectAttempts,
        },
      };

    case "HEARTBEAT":
      return {
        ...state,
        connectionState: {
          ...state.connectionState,
          lastConnected: action.payload.lastConnected,
        },
      };

    case "OPTIMISTIC_MARK_READ": {
      const notification = state.notifications.find(
        (n) => n.id === action.payload.notificationId
      );
      
      if (!notification) return state;

      // Store original state for potential rollback
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      if (!newOptimisticUpdates.has(action.payload.notificationId)) {
        newOptimisticUpdates.set(action.payload.notificationId, notification);
      }

      return {
        ...state,
        // Remove notification optimistically when marking as read
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload.notificationId
        ),
        optimisticUpdates: newOptimisticUpdates,
      };
    }

    case "OPTIMISTIC_DISMISS": {
      const notification = state.notifications.find(
        (n) => n.id === action.payload.notificationId
      );
      
      if (!notification) return state;

      // Store original state for potential rollback
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      if (!newOptimisticUpdates.has(action.payload.notificationId)) {
        newOptimisticUpdates.set(action.payload.notificationId, notification);
      }

      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload.notificationId
        ),
        optimisticUpdates: newOptimisticUpdates,
      };
    }

    case "REVERT_OPTIMISTIC": {
      const originalNotification = state.optimisticUpdates.get(action.payload.notificationId);
      
      if (!originalNotification) return state;

      // Remove from optimistic updates
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.delete(action.payload.notificationId);

      // Check if notification was dismissed optimistically
      const notificationExists = state.notifications.find(
        (n) => n.id === action.payload.notificationId
      );

      if (!notificationExists) {
        // Notification was dismissed optimistically, restore it
        return {
          ...state,
          notifications: [originalNotification, ...state.notifications],
          optimisticUpdates: newOptimisticUpdates,
        };
      } else {
        // Notification was marked as read optimistically, revert read status
        return {
          ...state,
          notifications: state.notifications.map((n) =>
            n.id === action.payload.notificationId ? originalNotification : n
          ),
          optimisticUpdates: newOptimisticUpdates,
        };
      }
    }

    case "MARK_ALL_READ":
      return {
        ...state,
        // Clear all notifications when marking all as read
        notifications: [],
      };

    case "RESET_CONNECTION_ATTEMPTS":
      return {
        ...state,
        connectionState: {
          ...state.connectionState,
          reconnectAttempts: 0,
        },
      };

    default:
      return state;
  }
}