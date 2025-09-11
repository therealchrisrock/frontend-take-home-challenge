import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "~/test/test-utils";
import { api } from "~/trpc/react";
import { toast } from "~/hooks/use-toast";
import { NotificationDropdown } from "~/components/NotificationDropdown";

// Mock dependencies
vi.mock("~/trpc/react", () => ({
  api: {
    user: {
      getFriendRequestNotificationCount: {
        useQuery: vi.fn(),
      },
      getFriendRequestNotifications: {
        useQuery: vi.fn(),
      },
      respondToFriendRequest: {
        useMutation: vi.fn(),
      },
    },
  },
}));

vi.mock("~/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn((date: Date) => "2 hours ago"),
}));

describe("NotificationDropdown", () => {
  const mockFriendRequestNotifications = [
    {
      id: "friendship-123",
      type: "FRIEND_REQUEST_RECEIVED" as const,
      sender: {
        id: "sender-123",
        username: "johnsmith",
        name: "John Smith",
        image: "https://example.com/avatar.jpg",
      },
      createdAt: new Date("2024-01-01T12:00:00Z"),
      read: false,
    },
    {
      id: "friendship-456", 
      type: "FRIEND_REQUEST_RECEIVED" as const,
      sender: {
        id: "sender-456",
        username: "janedoe",
        name: "Jane Doe",
        image: null,
      },
      createdAt: new Date("2024-01-01T10:00:00Z"),
      read: false,
    },
  ];

  const mockRespond = {
    mutate: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful queries by default
    vi.mocked(api.user.getFriendRequestNotificationCount.useQuery).mockReturnValue({
      data: { count: 2 },
      refetch: vi.fn(),
    } as any);

    vi.mocked(api.user.getFriendRequestNotifications.useQuery).mockReturnValue({
      data: mockFriendRequestNotifications,
      refetch: vi.fn(),
    } as any);

    vi.mocked(api.user.respondToFriendRequest.useMutation).mockReturnValue(mockRespond as any);

    // Mock window.addEventListener
    global.addEventListener = vi.fn();
    global.removeEventListener = vi.fn();
  });

  it("renders notification bell with correct badge count", () => {
    renderWithProviders(<NotificationDropdown messageCount={1} />);

    const bell = screen.getByRole("button");
    expect(bell).toBeInTheDocument();
    
    // Total count should be friendRequest count (2) + message count (1) = 3
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders notification bell without badge when count is zero", () => {
    vi.mocked(api.user.getFriendRequestNotificationCount.useQuery).mockReturnValue({
      data: { count: 0 },
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const bell = screen.getByRole("button");
    expect(bell).toBeInTheDocument();
    
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("displays 99+ when count exceeds 99", () => {
    vi.mocked(api.user.getFriendRequestNotificationCount.useQuery).mockReturnValue({
      data: { count: 100 },
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<NotificationDropdown messageCount={10} />);
    
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("opens dropdown when bell is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationDropdown messageCount={1} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("displays friend request notifications when dropdown is open", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText("Friend Requests")).toBeInTheDocument();
      expect(screen.getByText(/John Smith.*sent you a friend request/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Doe.*sent you a friend request/)).toBeInTheDocument();
    });
  });

  it("displays user avatars correctly", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      // Check for avatars - one with image, one with fallback
      const avatars = screen.getAllByRole("img");
      expect(avatars).toHaveLength(1); // Only the one with actual image src
      
      // Check for fallback initials
      expect(screen.getByText("J")).toBeInTheDocument(); // Jane Doe fallback
    });
  });

  it("handles accept friend request", async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();

    vi.mocked(api.user.getFriendRequestNotifications.useQuery).mockReturnValue({
      data: mockFriendRequestNotifications,
      refetch: mockRefetch,
    } as any);

    vi.mocked(api.user.getFriendRequestNotificationCount.useQuery).mockReturnValue({
      data: { count: 2 },
      refetch: mockRefetch,
    } as any);

    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText(/John Smith.*sent you a friend request/)).toBeInTheDocument();
    });

    const acceptButtons = screen.getAllByText("Accept");
    await user.click(acceptButtons[0]!);

    expect(mockRespond.mutate).toHaveBeenCalledWith({
      friendshipId: "friendship-123",
      accept: true,
    });
  });

  it("handles decline friend request", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText(/John Smith.*sent you a friend request/)).toBeInTheDocument();
    });

    const declineButtons = screen.getAllByText("Decline");
    await user.click(declineButtons[0]!);

    expect(mockRespond.mutate).toHaveBeenCalledWith({
      friendshipId: "friendship-123",
      accept: false,
    });
  });

  it("shows success toast on successful friend request response", () => {
    const mockMutation = {
      mutate: vi.fn(),
      isPending: false,
      onSuccess: vi.fn(),
      onError: vi.fn(),
    };

    vi.mocked(api.user.respondToFriendRequest.useMutation).mockImplementation((options) => {
      // Simulate calling onSuccess callback
      if (options?.onSuccess) {
        setTimeout(() => {
          options.onSuccess(undefined, { friendshipId: "test", accept: true }, undefined);
        }, 0);
      }
      return mockMutation as any;
    });

    renderWithProviders(<NotificationDropdown messageCount={0} />);

    expect(toast).toHaveBeenCalledWith({
      title: "Success",
      description: "Friend request accepted",
    });
  });

  it("shows error toast on failed friend request response", () => {
    const mockMutation = {
      mutate: vi.fn(),
      isPending: false,
      onSuccess: vi.fn(),
      onError: vi.fn(),
    };

    vi.mocked(api.user.respondToFriendRequest.useMutation).mockImplementation((options) => {
      // Simulate calling onError callback
      if (options?.onError) {
        setTimeout(() => {
          options.onError(new Error("Server error"), { friendshipId: "test", accept: true }, undefined);
        }, 0);
      }
      return mockMutation as any;
    });

    renderWithProviders(<NotificationDropdown messageCount={0} />);

    expect(toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Server error",
      variant: "destructive",
    });
  });

  it("disables buttons when mutation is pending", async () => {
    const user = userEvent.setup();
    
    vi.mocked(api.user.respondToFriendRequest.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as any);

    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      const acceptButtons = screen.getAllByText("Accept");
      const declineButtons = screen.getAllByText("Decline");
      
      acceptButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
      
      declineButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  it("displays message notifications", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationDropdown messageCount={3} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText("Messages")).toBeInTheDocument();
      expect(screen.getByText("You have 3 unread messages")).toBeInTheDocument();
      expect(screen.getByText("Go to Messages to read them")).toBeInTheDocument();
    });
  });

  it("displays singular message text for one message", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationDropdown messageCount={1} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText("You have 1 unread message")).toBeInTheDocument();
    });
  });

  it("shows empty state when no notifications", async () => {
    const user = userEvent.setup();
    
    vi.mocked(api.user.getFriendRequestNotificationCount.useQuery).mockReturnValue({
      data: { count: 0 },
      refetch: vi.fn(),
    } as any);

    vi.mocked(api.user.getFriendRequestNotifications.useQuery).mockReturnValue({
      data: [],
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText("No new notifications")).toBeInTheDocument();
    });
  });

  it("shows 'View all notifications' link when there are notifications", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationDropdown messageCount={1} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      expect(screen.getByText("View all notifications")).toBeInTheDocument();
    });
  });

  it("does not show 'View all notifications' link when no notifications", async () => {
    const user = userEvent.setup();
    
    vi.mocked(api.user.getFriendRequestNotificationCount.useQuery).mockReturnValue({
      data: { count: 0 },
      refetch: vi.fn(),
    } as any);

    vi.mocked(api.user.getFriendRequestNotifications.useQuery).mockReturnValue({
      data: [],
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      expect(screen.queryByText("View all notifications")).not.toBeInTheDocument();
    });
  });

  it("listens for friend request events and refetches data", () => {
    renderWithProviders(<NotificationDropdown messageCount={0} />);

    expect(global.addEventListener).toHaveBeenCalledWith(
      "friendRequestSent",
      expect.any(Function)
    );
  });

  it("cleans up event listener on unmount", () => {
    const { unmount } = renderWithProviders(<NotificationDropdown messageCount={0} />);
    
    unmount();

    expect(global.removeEventListener).toHaveBeenCalledWith(
      "friendRequestSent",
      expect.any(Function)
    );
  });

  it("formats timestamps correctly", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const bell = screen.getByRole("button");
    await user.click(bell);

    await waitFor(() => {
      const timestamps = screen.getAllByText("2 hours ago");
      expect(timestamps).toHaveLength(2); // One for each notification
    });
  });

  it("only fetches notifications when dropdown is open", () => {
    renderWithProviders(<NotificationDropdown messageCount={0} />);

    const friendRequestQuery = vi.mocked(api.user.getFriendRequestNotifications.useQuery);
    
    expect(friendRequestQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        enabled: false, // Should be false initially (dropdown closed)
      })
    );
  });

  it("handles loading states gracefully", () => {
    vi.mocked(api.user.getFriendRequestNotificationCount.useQuery).mockReturnValue({
      data: undefined,
      refetch: vi.fn(),
    } as any);

    vi.mocked(api.user.getFriendRequestNotifications.useQuery).mockReturnValue({
      data: undefined,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<NotificationDropdown messageCount={2} />);

    // Should show message count even when friend request count is loading
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});