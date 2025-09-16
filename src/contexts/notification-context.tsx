"use client";

import { useSession } from "next-auth/react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { toast } from "~/hooks/use-toast";
import {
  initialNotificationState,
  notificationReducer
} from "~/lib/notifications/reducer";
import type {
  ConnectionStatusPayload,
  NotificationContextValue,
  NotificationCreatedPayload,
  NotificationEvent,
  NotificationState
} from "~/lib/notifications/types";
import { createSSEClient, type SSEClient } from "~/lib/sse/enhanced-client";
import { api } from "~/trpc/react";
import { useTabTitleBadge } from "~/hooks/useTabTitleBadge";

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [state, dispatch] = useReducer(notificationReducer, initialNotificationState);
  const { notifications, connectionState } = state;

  // Enhanced SSE connection management
  const sseClientRef = useRef<SSEClient | null>(null);
  const tabIdRef = useRef<string>("");

  // tRPC queries and mutations
  const { data: initialNotifications, refetch: refetchNotifications } = api.notification.getAll.useQuery(
    undefined,
    {
      enabled: !!session?.user?.id,
      staleTime: 30000, // 30 seconds
    }
  );

  const { data: unreadCount = 0, refetch: refetchUnreadCount } = api.notification.getUnreadCount.useQuery(
    undefined,
    {
      enabled: !!session?.user?.id,
      refetchInterval: 60000, // 1 minute
    }
  );

  const markAsReadMutation = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      void refetchUnreadCount();
      void refetchNotifications();
    },
  });

  const markAllAsReadMutation = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      void refetchUnreadCount();
      void refetchNotifications();
    },
  });

  const dismissMutation = api.notification.dismiss.useMutation({
    onSuccess: () => {
      void refetchNotifications();
    },
  });

  // Update browser tab title with unread count
  useTabTitleBadge({ unreadCount });

  // Initialize notifications from server
  useEffect(() => {
    if (initialNotifications) {
      const mappedNotifications = initialNotifications
        .filter((n) => !n.read) // Only show unread notifications
        .map((n) => ({
          id: n.id,
          type: n.type as NotificationState["type"],
          title: n.title,
          message: n.message,
          read: n.read,
          metadata: n.metadata ? JSON.parse(n.metadata) : undefined,
          relatedEntityId: n.relatedEntityId ?? undefined,
          createdAt: n.createdAt.toISOString(),
          readAt: undefined, // Server doesn't track readAt currently
        }));

      dispatch({ type: "INITIALIZE_NOTIFICATIONS", payload: mappedNotifications });
    }
  }, [initialNotifications]);

  // Generate unique tab ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      tabIdRef.current = `tab_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
  }, []);

  const connectSSE = useCallback(() => {
    if (!session?.user?.id || status !== "authenticated") {
      return;
    }

    // Disconnect existing client
    if (sseClientRef.current) {
      sseClientRef.current.destroy();
      sseClientRef.current = null;
    }

    const url = `/api/notifications/stream?tabId=${tabIdRef.current}`;

    sseClientRef.current = createSSEClient({
      url,
      onMessage: (event) => {
        try {
          const data = JSON.parse(event.data) as NotificationEvent;

          switch (data.type) {
            case "NOTIFICATION_CREATED": {
              const payload = data.payload as NotificationCreatedPayload;
              
              // Guard against undefined payload
              if (!payload) {
                console.warn("Received NOTIFICATION_CREATED event with undefined payload");
                break;
              }
              
              const newNotification: NotificationState = {
                id: payload.id,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                read: false,
                metadata: payload.metadata,
                relatedEntityId: payload.relatedEntityId,
                createdAt: payload.createdAt,
              };

              dispatch({
                type: "NOTIFICATION_RECEIVED",
                payload: newNotification,
              });

              // Show toast notification
              toast({
                title: payload.title,
                description: payload.message,
                duration: 5000,
              });

              // Refetch unread count
              void refetchUnreadCount();
              break;
            }

            case "NOTIFICATION_READ": {
              const payload = data.payload as { notificationId: string; readAt: string };
              
              // Guard against undefined payload
              if (!payload) {
                console.warn("Received NOTIFICATION_READ event with undefined payload");
                break;
              }
              
              dispatch({
                type: "NOTIFICATION_READ",
                payload: {
                  notificationId: payload.notificationId,
                  readAt: payload.readAt,
                },
              });
              break;
            }

            case "CONNECTION_STATUS": {
              const payload = data.payload as ConnectionStatusPayload;
              
              // Guard against undefined payload
              if (!payload) {
                console.warn("Received CONNECTION_STATUS event with undefined payload");
                break;
              }
              
              dispatch({
                type: "CONNECTION_STATUS_CHANGED",
                payload: {
                  connected: payload.connected,
                  reconnecting: payload.reconnecting,
                  error: payload.error,
                  lastConnected: payload.lastConnected ? new Date(payload.lastConnected) : null,
                  reconnectAttempts: connectionState.reconnectAttempts, // Preserve current attempts
                },
              });
              break;
            }

            case "HEARTBEAT":
              dispatch({
                type: "HEARTBEAT",
                payload: { lastConnected: new Date() },
              });
              break;
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      },
      onOpen: () => {
        console.log("Notification SSE connection opened");
        dispatch({
          type: "CONNECTION_OPENED",
          payload: { lastConnected: new Date() },
        });
      },
      onError: (error) => {
        console.error("Notification SSE error:", error);
        dispatch({
          type: "CONNECTION_ERROR",
          payload: {
            error: "Connection lost",
            reconnectAttempts: connectionState.reconnectAttempts + 1,
          },
        });
      },
      onConnectionStateChange: (state) => {
        const isConnected = state === 'connected';
        const isReconnecting = state === 'reconnecting';

        dispatch({
          type: "CONNECTION_STATUS_CHANGED",
          payload: {
            connected: isConnected,
            reconnecting: isReconnecting,
            error: isConnected ? undefined : "Connection lost",
            lastConnected: isConnected ? new Date() : null,
            reconnectAttempts: connectionState.reconnectAttempts,
          },
        });
      },
      autoConnect: true,
    });
  }, [session?.user?.id, status, refetchUnreadCount, connectionState.reconnectAttempts]);

  // Establish SSE connection when authenticated
  useEffect(() => {
    if (session?.user?.id && status === "authenticated") {
      connectSSE();
    } else {
      // Disconnect when not authenticated
      if (sseClientRef.current) {
        sseClientRef.current.disconnect();
      }
      dispatch({
        type: "CONNECTION_STATUS_CHANGED",
        payload: {
          connected: false,
          reconnecting: false,
          error: undefined,
          lastConnected: null,
          reconnectAttempts: 0,
        },
      });
    }

    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.destroy();
        sseClientRef.current = null;
      }
    };
  }, [session?.user?.id, status, connectSSE]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.destroy();
        sseClientRef.current = null;
      }
    };
  }, []);

  // API functions
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistically update local state
      dispatch({
        type: "OPTIMISTIC_MARK_READ",
        payload: {
          notificationId,
          readAt: new Date().toISOString(),
        },
      });

      await markAsReadMutation.mutateAsync({ notificationId });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);

      // Revert optimistic update
      dispatch({
        type: "REVERT_OPTIMISTIC",
        payload: { notificationId },
      });

      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync();

      dispatch({
        type: "MARK_ALL_READ",
        payload: { readAt: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  }, [markAllAsReadMutation]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    try {
      // Optimistically remove from local state
      dispatch({
        type: "OPTIMISTIC_DISMISS",
        payload: { notificationId },
      });

      await dismissMutation.mutateAsync({ notificationId });
    } catch (error) {
      console.error("Failed to dismiss notification:", error);

      // Revert optimistic update
      dispatch({
        type: "REVERT_OPTIMISTIC",
        payload: { notificationId },
      });

      toast({
        title: "Error",
        description: "Failed to dismiss notification",
        variant: "destructive",
      });
    }
  }, [dismissMutation]);

  const refetch = useCallback(async () => {
    try {
      await refetchNotifications();
      await refetchUnreadCount();
    } catch (error) {
      console.error("Failed to refetch notifications:", error);
    }
  }, [refetchNotifications, refetchUnreadCount]);

  const contextValue: NotificationContextValue = {
    notifications,
    unreadCount,
    connectionState,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refetch,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}