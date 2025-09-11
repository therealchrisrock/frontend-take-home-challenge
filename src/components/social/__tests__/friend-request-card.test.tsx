import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FriendRequestCard, FriendRequestCardSkeleton } from "../friend-request-card";

// Mock tRPC
const mockMutateAsync = vi.fn();
const mockRespondMutation = {
  mutateAsync: mockMutateAsync,
  isPending: false,
};
const mockCancelMutation = {
  mutateAsync: mockMutateAsync,
  isPending: false,
};

vi.mock("../../../trpc/react", () => ({
  api: {
    friendRequest: {
      respond: {
        useMutation: vi.fn(() => mockRespondMutation),
      },
      cancel: {
        useMutation: vi.fn(() => mockCancelMutation),
      },
    },
  },
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("../../../hooks/use-toast", () => ({
  toast: mockToast,
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe("FriendRequestCard", () => {
  const mockFriendRequest = {
    id: "request-1",
    senderId: "sender-1",
    receiverId: "receiver-1",
    status: "PENDING" as const,
    message: "Hey, let's be friends!",
    createdAt: new Date("2023-01-01T12:00:00Z"),
    sender: {
      id: "sender-1",
      name: "John Doe",
      email: "john@example.com",
      image: "https://example.com/avatar.jpg",
    },
    receiver: {
      id: "receiver-1", 
      name: "Jane Smith",
      email: "jane@example.com",
      image: null,
    },
  };

  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
  });

  describe("rendering", () => {
    it("should render friend request card with sender info", () => {
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText('"Hey, let\'s be friends!"')).toBeInTheDocument();
    });

    it("should render receiver info when variant is sent", () => {
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="sent"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("should show fallback name when user name is null", () => {
      const requestWithoutName = {
        ...mockFriendRequest,
        sender: {
          ...mockFriendRequest.sender,
          name: null,
        },
      };

      render(
        <FriendRequestCard
          friendRequest={requestWithoutName}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("john@example.com")).toBeInTheDocument(); // Shows email as fallback
    });

    it("should render user avatar with initials", () => {
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      const avatar = screen.getByText("JD"); // John Doe initials
      expect(avatar).toBeInTheDocument();
    });

    it("should not render message when not provided", () => {
      const requestWithoutMessage = {
        ...mockFriendRequest,
        message: null,
      };

      render(
        <FriendRequestCard
          friendRequest={requestWithoutMessage}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.queryByText('"Hey, let\'s be friends!"')).not.toBeInTheDocument();
    });
  });

  describe("status badges", () => {
    it("should show pending badge for pending requests", () => {
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("should show accepted badge for accepted requests", () => {
      const acceptedRequest = {
        ...mockFriendRequest,
        status: "ACCEPTED" as const,
      };

      render(
        <FriendRequestCard
          friendRequest={acceptedRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("Accepted")).toBeInTheDocument();
    });

    it("should show declined badge for declined requests", () => {
      const declinedRequest = {
        ...mockFriendRequest,
        status: "DECLINED" as const,
      };

      render(
        <FriendRequestCard
          friendRequest={declinedRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("Declined")).toBeInTheDocument();
    });

    it("should show cancelled badge for cancelled requests", () => {
      const cancelledRequest = {
        ...mockFriendRequest,
        status: "CANCELLED" as const,
      };

      render(
        <FriendRequestCard
          friendRequest={cancelledRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });
  });

  describe("actions for received requests", () => {
    it("should show accept and decline buttons for pending received requests", () => {
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("Accept")).toBeInTheDocument();
      expect(screen.getByText("Decline")).toBeInTheDocument();
    });

    it("should not show action buttons for non-pending requests", () => {
      const acceptedRequest = {
        ...mockFriendRequest,
        status: "ACCEPTED" as const,
      };

      render(
        <FriendRequestCard
          friendRequest={acceptedRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.queryByText("Accept")).not.toBeInTheDocument();
      expect(screen.queryByText("Decline")).not.toBeInTheDocument();
    });

    it("should call respond mutation when accept button is clicked", async () => {
      const user = userEvent.setup();
      
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      const acceptButton = screen.getByText("Accept");
      await user.click(acceptButton);

      expect(mockMutateAsync).toHaveBeenCalledWith({
        friendRequestId: "request-1",
        response: "ACCEPTED",
      });
    });

    it("should call respond mutation when decline button is clicked", async () => {
      const user = userEvent.setup();
      
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      const declineButton = screen.getByText("Decline");
      await user.click(declineButton);

      expect(mockMutateAsync).toHaveBeenCalledWith({
        friendRequestId: "request-1",
        response: "DECLINED",
      });
    });

    it("should call onUpdate after successful accept", async () => {
      const user = userEvent.setup();
      
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      const acceptButton = screen.getByText("Accept");
      await user.click(acceptButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledOnce();
      });
    });

    it("should show success toast after accepting", async () => {
      const user = userEvent.setup();
      
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      const acceptButton = screen.getByText("Accept");
      await user.click(acceptButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Success",
          description: "Friend request accepteded",
        });
      });
    });
  });

  describe("actions for sent requests", () => {
    it("should show cancel button for pending sent requests", () => {
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="sent"
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.queryByText("Accept")).not.toBeInTheDocument();
      expect(screen.queryByText("Decline")).not.toBeInTheDocument();
    });

    it("should call cancel mutation when cancel button is clicked", async () => {
      const user = userEvent.setup();
      
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="sent"
          onUpdate={mockOnUpdate}
        />
      );

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(mockMutateAsync).toHaveBeenCalledWith({
        friendRequestId: "request-1",
      });
    });
  });

  describe("loading states", () => {
    it("should disable buttons when mutations are pending", async () => {
      vi.mocked(mockRespondMutation).isPending = true;
      
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      const acceptButton = screen.getByText("Accept");
      const declineButton = screen.getByText("Decline");

      expect(acceptButton).toBeDisabled();
      expect(declineButton).toBeDisabled();
    });
  });

  describe("error handling", () => {
    it("should show error toast when mutation fails", async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
      
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      const acceptButton = screen.getByText("Accept");
      await user.click(acceptButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Network error",
          variant: "destructive",
        });
      });
    });

    it("should show default error message when no specific error", async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValueOnce(new Error());
      
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      const acceptButton = screen.getByText("Accept");
      await user.click(acceptButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to respond to friend request",
          variant: "destructive",
        });
      });
    });
  });

  describe("relative time display", () => {
    it("should show relative time for request creation", () => {
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      // The exact text depends on current time, but should show some time indication
      const timeElements = screen.getAllByText(/ago|Just now/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe("FriendRequestCardSkeleton", () => {
    it("should render skeleton loading state", () => {
      render(<FriendRequestCardSkeleton />);
      
      // Check for skeleton elements (they have specific classes)
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("accessibility", () => {
    it("should have proper button roles and labels", () => {
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      const declineButton = screen.getByRole("button", { name: /decline/i });

      expect(acceptButton).toBeInTheDocument();
      expect(declineButton).toBeInTheDocument();
    });

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      
      render(
        <FriendRequestCard
          friendRequest={mockFriendRequest}
          variant="received"
          onUpdate={mockOnUpdate}
        />
      );

      // Tab to first button (Decline)
      await user.tab();
      const declineButton = screen.getByText("Decline");
      expect(declineButton).toHaveFocus();

      // Tab to second button (Accept)
      await user.tab();
      const acceptButton = screen.getByText("Accept");
      expect(acceptButton).toHaveFocus();

      // Should be able to activate with Enter
      await user.keyboard("{Enter}");
      expect(mockMutateAsync).toHaveBeenCalledWith({
        friendRequestId: "request-1",
        response: "ACCEPTED",
      });
    });
  });
});