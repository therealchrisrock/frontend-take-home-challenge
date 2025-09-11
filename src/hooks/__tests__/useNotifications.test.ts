import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { toast } from "~/hooks/use-toast";
import { NotificationProvider, useNotifications } from "~/contexts/notification-context";
import type { NotificationEvent } from "~/lib/notifications/types";

// Mock dependencies
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    notification: {
      getAll: {
        useQuery: vi.fn(),
      },
      getUnreadCount: {
        useQuery: vi.fn(),
      },
      markAsRead: {
        useMutation: vi.fn(),
      },
      markAllAsRead: {
        useMutation: vi.fn(),
      },
      dismiss: {
        useMutation: vi.fn(),
      },
    },
  },
}));

vi.mock("~/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

// Mock EventSource
class MockEventSource {
  url: string;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onerror?: (event: unknown) => void;
  readyState: number = 1;

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening
    setTimeout(() => {
      if (this.onopen) {
        this.onopen();
      }
    }, 10);
  }

  close() {
    this.readyState = 2;
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: NotificationEvent) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper method to simulate an error
  simulateError(error?: unknown) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Replace global EventSource
const originalEventSource = global.EventSource;

describe("useNotifications Hook", () => {
  const mockSession = {
    user: { id: "user-123", email: "test@example.com", username: "testuser" },
    expires: new Date().toISOString(),
  };

  const mockInitialNotifications = [
    {
      id: "notif-1",
      type: "FRIEND_REQUEST" as const,
      title: "Friend Request",
      message: "John sent you a friend request",
      read: false,
      metadata: null,
      relatedEntityId: "req-123",
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "notif-2",
      type: "FRIEND_REQUEST_ACCEPTED" as const,
      title: "Friend Request Accepted",
      message: "Jane accepted your friend request",
      read: true,
      metadata: null,
      relatedEntityId: "req-456",
      createdAt: new Date("2024-01-02"),
    },
  ];

  const mockMutations = {
    markAsRead: {
      mutateAsync: vi.fn(),
    },
    markAllAsRead: {
      mutateAsync: vi.fn(),
    },
    dismiss: {
      mutateAsync: vi.fn(),
    },
  };

  let mockEventSource: MockEventSource;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock EventSource
    global.EventSource = vi.fn().mockImplementation((url: string) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource;
    });

    // Mock useSession
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: vi.fn(),
    });

    // Mock tRPC queries
    vi.mocked(api.notification.getAll.useQuery).mockReturnValue({
      data: mockInitialNotifications,
      refetch: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    vi.mocked(api.notification.getUnreadCount.useQuery).mockReturnValue({
      data: 1,
      refetch: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    // Mock mutations
    vi.mocked(api.notification.markAsRead.useMutation).mockReturnValue(mockMutations.markAsRead as any);
    vi.mocked(api.notification.markAllAsRead.useMutation).mockReturnValue(mockMutations.markAllAsRead as any);
    vi.mocked(api.notification.dismiss.useMutation).mockReturnValue(mockMutations.dismiss as any);
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
  });

  const renderNotificationHook = () => {
    return renderHook(() => useNotifications(), {
      wrapper: ({ children }) => 
        createElement(NotificationProvider, null, children),
    });
  };

  it("should initialize with server-side notifications", async () => {
    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    expect(result.current.notifications[0]).toMatchObject({
      id: "notif-1",
      type: "FRIEND_REQUEST",
      title: "Friend Request",
      read: false,
    });

    expect(result.current.unreadCount).toBe(1);
  });

  it("should establish SSE connection when authenticated", async () => {
    renderNotificationHook();

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/notifications\/stream\?tabId=/)
      );
    });
  });

  it("should update connection state when SSE connects", async () => {
    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.connectionState.connected).toBe(true);
      expect(result.current.connectionState.reconnecting).toBe(false);
    });
  });

  it("should handle new notification events", async () => {
    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.connectionState.connected).toBe(true);
    });

    const newNotificationEvent: NotificationEvent = {
      type: "NOTIFICATION_CREATED",
      payload: {
        id: "notif-new",
        type: "FRIEND_REQUEST" as const,
        title: "New Friend Request",
        message: "Alice sent you a friend request",
        createdAt: new Date().toISOString(),
        metadata: { senderId: "alice-123" },
        relatedEntityId: "req-789",
      },
      timestamp: new Date().toISOString(),
      userId: "user-123",
    };

    act(() => {
      mockEventSource.simulateMessage(newNotificationEvent);
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications[0]).toMatchObject({
        id: "notif-new",
        title: "New Friend Request",
        read: false,
      });
    });

    expect(toast).toHaveBeenCalledWith({
      title: "New Friend Request",
      description: "Alice sent you a friend request",
      duration: 5000,
    });
  });

  it("should handle notification read events", async () => {
    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    const readEvent: NotificationEvent = {
      type: "NOTIFICATION_READ",
      payload: {
        notificationId: "notif-1",
        readAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      userId: "user-123",
    };

    act(() => {
      mockEventSource.simulateMessage(readEvent);
    });

    await waitFor(() => {
      const notification = result.current.notifications.find(n => n.id === "notif-1");
      expect(notification?.read).toBe(true);
    });
  });

  it("should handle heartbeat events", async () => {
    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.connectionState.connected).toBe(true);
    });

    const heartbeatEvent: NotificationEvent = {
      type: "HEARTBEAT",
      payload: {},
      timestamp: new Date().toISOString(),
      userId: "user-123",
    };

    const previousLastConnected = result.current.connectionState.lastConnected;

    act(() => {
      mockEventSource.simulateMessage(heartbeatEvent);
    });

    await waitFor(() => {
      expect(result.current.connectionState.lastConnected).not.toEqual(previousLastConnected);
    });
  });

  it("should handle SSE connection errors", async () => {
    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.connectionState.connected).toBe(true);
    });

    act(() => {
      mockEventSource.simulateError(new Error("Connection failed"));
    });

    await waitFor(() => {
      expect(result.current.connectionState.connected).toBe(false);
      expect(result.current.connectionState.reconnecting).toBe(true);
      expect(result.current.connectionState.error).toBe("Connection lost");
    });
  });

  it("should mark notification as read with optimistic updates", async () => {
    mockMutations.markAsRead.mutateAsync.mockResolvedValue(undefined);

    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    act(() => {
      void result.current.markAsRead("notif-1");
    });

    // Should optimistically update
    await waitFor(() => {
      const notification = result.current.notifications.find(n => n.id === "notif-1");
      expect(notification?.read).toBe(true);
    });

    expect(mockMutations.markAsRead.mutateAsync).toHaveBeenCalledWith({
      notificationId: "notif-1",
    });
  });

  it("should revert optimistic update if mark as read fails", async () => {
    mockMutations.markAsRead.mutateAsync.mockRejectedValue(new Error("Server error"));

    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    await act(async () => {
      await result.current.markAsRead("notif-1");
    });

    // Should revert the optimistic update
    await waitFor(() => {
      const notification = result.current.notifications.find(n => n.id === "notif-1");
      expect(notification?.read).toBe(false);
    });

    expect(toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Failed to mark notification as read",
      variant: "destructive",
    });
  });

  it("should mark all notifications as read", async () => {
    mockMutations.markAllAsRead.mutateAsync.mockResolvedValue(undefined);

    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockMutations.markAllAsRead.mutateAsync).toHaveBeenCalled();

    await waitFor(() => {
      result.current.notifications.forEach(notification => {
        expect(notification.read).toBe(true);
      });
    });
  });

  it("should dismiss notification with optimistic updates", async () => {
    mockMutations.dismiss.mutateAsync.mockResolvedValue(undefined);

    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    act(() => {
      void result.current.dismissNotification("notif-1");
    });

    // Should optimistically remove
    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications.find(n => n.id === "notif-1")).toBeUndefined();
    });

    expect(mockMutations.dismiss.mutateAsync).toHaveBeenCalledWith({
      notificationId: "notif-1",
    });
  });

  it("should not establish SSE connection when not authenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    renderNotificationHook();

    // Wait a bit to ensure no connection is attempted
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(global.EventSource).not.toHaveBeenCalled();
  });

  it("should close connection when user logs out", async () => {
    const { rerender } = renderNotificationHook();

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
    });

    // Mock user logging out
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    rerender();

    await waitFor(() => {
      expect(mockEventSource.readyState).toBe(2); // CLOSED
    });
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useNotifications());
    }).toThrow("useNotifications must be used within a NotificationProvider");
    
    consoleSpy.mockRestore();
  });

  it("should handle malformed SSE messages gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.connectionState.connected).toBe(true);
    });

    act(() => {
      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({ data: "invalid-json" });
      }
    });

    expect(consoleSpy).toHaveBeenCalledWith("Error parsing SSE message:", expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it("should update connection state with CONNECTION_STATUS event", async () => {
    const { result } = renderNotificationHook();

    await waitFor(() => {
      expect(result.current.connectionState.connected).toBe(true);
    });

    const statusEvent: NotificationEvent = {
      type: "CONNECTION_STATUS",
      payload: {
        connected: false,
        reconnecting: true,
        error: "Server maintenance",
        lastConnected: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      userId: "user-123",
    };

    act(() => {
      mockEventSource.simulateMessage(statusEvent);
    });

    await waitFor(() => {
      expect(result.current.connectionState.connected).toBe(false);
      expect(result.current.connectionState.reconnecting).toBe(true);
      expect(result.current.connectionState.error).toBe("Server maintenance");
    });
  });
});