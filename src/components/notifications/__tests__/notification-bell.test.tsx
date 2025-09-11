import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "~/test/test-utils";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "../notification-bell";
import * as notificationHooks from "../../../hooks/useNotifications";
import type { NotificationState } from "../../../lib/notifications/types";

// Mock the useNotifications hook
const mockUseNotifications = vi.fn();
vi.mock("../../../hooks/useNotifications", () => ({
  useNotifications: () => mockUseNotifications(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe("NotificationBell", () => {
  const mockNotifications: NotificationState[] = [
    {
      id: "1",
      type: "FRIEND_REQUEST",
      title: "Friend Request",
      message: "John Doe sent you a friend request",
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "2", 
      type: "FRIEND_REQUEST_ACCEPTED",
      title: "Friend Request Accepted",
      message: "Jane Smith accepted your friend request",
      read: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
  ];

  const defaultMockReturn = {
    notifications: mockNotifications,
    unreadCount: 1,
    connectionState: {
      connected: true,
      reconnecting: false,
      error: undefined,
      lastConnected: new Date(),
      reconnectAttempts: 0,
    },
    markAllAsRead: vi.fn(),
    refetch: vi.fn(),
    markAsRead: vi.fn(),
    dismissNotification: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue(defaultMockReturn);
  });

  it("should render bell icon", () => {
    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    expect(bellButton).toBeInTheDocument();
    expect(bellButton).toHaveAttribute("aria-label", "Notifications (1 unread)");
  });

  it("should show unread count badge when there are unread notifications", () => {
    renderWithProviders(<NotificationBell />);
    
    const badge = screen.getByText("1");
    expect(badge).toBeInTheDocument();
  });

  it("should not show badge when there are no unread notifications", () => {
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      unreadCount: 0,
    });

    renderWithProviders(<NotificationBell />);
    
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("should show 99+ for counts over 99", () => {
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      unreadCount: 150,
    });

    renderWithProviders(<NotificationBell />);
    
    const badge = screen.getByText("99+");
    expect(badge).toBeInTheDocument();
  });

  it("should show correct connection status indicator", () => {
    renderWithProviders(<NotificationBell />);
    
    // Connected status should show green indicator
    const indicator = document.querySelector(".bg-green-500");
    expect(indicator).toBeInTheDocument();
  });

  it("should show reconnecting status", () => {
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      connectionState: {
        ...defaultMockReturn.connectionState,
        connected: false,
        reconnecting: true,
      },
    });

    renderWithProviders(<NotificationBell />);
    
    const indicator = document.querySelector(".bg-yellow-500");
    expect(indicator).toBeInTheDocument();
  });

  it("should show disconnected status", () => {
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      connectionState: {
        ...defaultMockReturn.connectionState,
        connected: false,
        reconnecting: false,
        error: "Connection failed",
      },
    });

    renderWithProviders(<NotificationBell />);
    
    const indicator = document.querySelector(".bg-red-500");
    expect(indicator).toBeInTheDocument();
  });

  it("should open dropdown when clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });
  });

  it("should display notifications in dropdown", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText("Friend Request")).toBeInTheDocument();
      expect(screen.getByText("John Doe sent you a friend request")).toBeInTheDocument();
    });
  });

  it("should show unread count in dropdown header", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText("(1 unread)")).toBeInTheDocument();
    });
  });

  it("should call markAllAsRead when mark all as read button is clicked", async () => {
    const user = userEvent.setup();
    const mockMarkAllAsRead = vi.fn();
    
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      markAllAsRead: mockMarkAllAsRead,
    });

    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      const markAllButton = screen.getByTitle("Mark all as read");
      return user.click(markAllButton);
    });
    
    expect(mockMarkAllAsRead).toHaveBeenCalledOnce();
  });

  it("should call refetch when refresh button is clicked", async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();
    
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      refetch: mockRefetch,
    });

    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      const refreshButton = screen.getByTitle("Refresh");
      return user.click(refreshButton);
    });
    
    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("should show empty state when no notifications", async () => {
    const user = userEvent.setup();
    
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      notifications: [],
      unreadCount: 0,
    });

    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText("No notifications yet")).toBeInTheDocument();
      expect(screen.getByText("You'll be notified about friend requests and other activities")).toBeInTheDocument();
    });
  });

  it("should show link to view all notifications when there are more than 5", async () => {
    const user = userEvent.setup();
    const manyNotifications = Array.from({ length: 7 }, (_, i) => ({
      ...mockNotifications[0]!,
      id: `notification-${i}`,
      title: `Notification ${i}`,
    }));
    
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      notifications: manyNotifications,
      unreadCount: 7,
    });

    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      const viewAllLink = screen.getByText("View all notifications (7)");
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink.closest("a")).toHaveAttribute("href", "/notifications");
    });
  });

  it("should show connection status when not connected", async () => {
    const user = userEvent.setup();
    
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      connectionState: {
        ...defaultMockReturn.connectionState,
        connected: false,
        error: "Connection lost",
      },
    });

    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText("Connection error: Connection lost")).toBeInTheDocument();
    });
  });

  it("should not show mark all as read button when no unread notifications", async () => {
    const user = userEvent.setup();
    
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      notifications: [{ ...mockNotifications[1]! }], // only read notification
      unreadCount: 0,
    });

    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      expect(screen.queryByTitle("Mark all as read")).not.toBeInTheDocument();
    });
  });

  it("should apply custom className", () => {
    render(<NotificationBell className="custom-class" />);
    
    const bellButton = screen.getByRole("button");
    expect(bellButton).toHaveClass("custom-class");
  });

  it("should handle keyboard navigation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    
    // Should focus on tab
    await user.tab();
    expect(bellButton).toHaveFocus();
    
    // Should open on Enter
    await user.keyboard("{Enter}");
    
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });
  });

  it("should handle errors gracefully during mark all as read", async () => {
    const user = userEvent.setup();
    const mockMarkAllAsRead = vi.fn().mockRejectedValue(new Error("Network error"));
    
    // Mock console.error to avoid test noise
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    mockUseNotifications.mockReturnValue({
      ...defaultMockReturn,
      markAllAsRead: mockMarkAllAsRead,
    });

    renderWithProviders(<NotificationBell />);
    
    const bellButton = screen.getByRole("button");
    await user.click(bellButton);
    
    await waitFor(() => {
      const markAllButton = screen.getByTitle("Mark all as read");
      return user.click(markAllButton);
    });
    
    expect(mockMarkAllAsRead).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith("Failed to mark all as read:", expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});