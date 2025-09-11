"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { toast } from "~/hooks/use-toast";
import type {
  NotificationEvent,
  NotificationState,
  ConnectionState,
  NotificationContextValue,
  NotificationCreatedPayload,
  ConnectionStatusPayload,
} from "~/lib/notifications/types";

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
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    reconnecting: false,
    error: undefined,
    lastConnected: null,
    reconnectAttempts: 0,
  });

  // SSE connection management
  const eventSourceRef = useRef<EventSource | null>(null);
  const tabIdRef = useRef<string>("");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  
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

  // Initialize notifications from server
  useEffect(() => {
    if (initialNotifications) {
      setNotifications(
        initialNotifications.map((n) => ({
          id: n.id,
          type: n.type as NotificationState["type"],
          title: n.title,
          message: n.message,
          read: n.read,
          metadata: n.metadata ? JSON.parse(n.metadata) : undefined,
          relatedEntityId: n.relatedEntityId ?? undefined,
          createdAt: n.createdAt.toISOString(),
          readAt: undefined, // Server doesn't track readAt currently
        }))
      );
    }
  }, [initialNotifications]);

  // Generate unique tab ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      tabIdRef.current = `tab_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
  }, []);

  const closeSSEConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const connectSSE = useCallback(() => {
    if (!session?.user?.id || status !== "authenticated") {
      return;
    }

    closeSSEConnection();

    const url = `/api/notifications/stream?tabId=${tabIdRef.current}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("Notification SSE connection opened");
      setConnectionState((prev) => ({
        ...prev,
        connected: true,
        reconnecting: false,
        error: undefined,
        lastConnected: new Date(),
      }));
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as NotificationEvent;
        
        switch (data.type) {
          case "NOTIFICATION_CREATED": {
            const payload = data.payload as NotificationCreatedPayload;
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

            setNotifications((prev) => [newNotification, ...prev]);
            
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
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.notificationId
                  ? { ...n, read: true, readAt: payload.readAt }
                  : n
              )
            );
            break;
          }

          case "CONNECTION_STATUS": {
            const payload = data.payload as ConnectionStatusPayload;
            setConnectionState((prev) => ({
              ...prev,
              connected: payload.connected,
              reconnecting: payload.reconnecting,
              error: payload.error,
              lastConnected: payload.lastConnected ? new Date(payload.lastConnected) : null,
            }));
            break;
          }

          case "HEARTBEAT":
            // Update connection timestamp
            setConnectionState((prev) => ({
              ...prev,
              lastConnected: new Date(),
            }));
            break;
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Notification SSE error:", error);
      
      setConnectionState((prev) => ({
        ...prev,
        connected: false,
        reconnecting: true,
        error: "Connection lost",
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));

      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff for reconnection
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds
      const backoffMultiplier = Math.min(Math.pow(2, reconnectAttemptsRef.current), maxDelay / baseDelay);
      const delay = baseDelay * backoffMultiplier;

      reconnectAttemptsRef.current += 1;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (session?.user?.id && status === "authenticated") {
          connectSSE();
        }
      }, delay);
    };
  }, [session?.user?.id, status, closeSSEConnection, refetchUnreadCount]);

  // Establish SSE connection when authenticated
  useEffect(() => {
    if (session?.user?.id && status === "authenticated") {
      connectSSE();
    } else {
      closeSSEConnection();
      setConnectionState({
        connected: false,
        reconnecting: false,
        error: undefined,
        lastConnected: null,
        reconnectAttempts: 0,
      });
    }

    return () => {
      closeSSEConnection();
    };
  }, [session?.user?.id, status, connectSSE, closeSSEConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeSSEConnection();
    };
  }, [closeSSEConnection]);

  // API functions
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read: true, readAt: new Date().toISOString() }
            : n
        )
      );

      await markAsReadMutation.mutateAsync({ notificationId });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      
      // Revert optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read: false, readAt: undefined }
            : n
        )
      );
      
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
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
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
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      
      await dismissMutation.mutateAsync({ notificationId });
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
      
      // Refetch to restore state
      void refetchNotifications();
      
      toast({
        title: "Error",
        description: "Failed to dismiss notification",
        variant: "destructive",
      });
    }
  }, [dismissMutation, refetchNotifications]);

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