import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, type Session } from "next-auth/react";
import { NotificationProvider } from "~/contexts/notification-context";
import { SettingsProvider } from "~/contexts/settings-context";
import type { NotificationState } from "~/lib/notifications/types";

// Mock session for testing
export const mockSession: Session = {
  user: {
    id: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    image: "https://example.com/avatar.jpg",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

// Mock notification data
export const mockNotifications: NotificationState[] = [
  {
    id: "notif-1",
    type: "FRIEND_REQUEST",
    title: "Friend Request",
    message: "John Doe sent you a friend request",
    read: false,
    metadata: {
      senderId: "john-123",
      senderName: "John Doe",
      senderEmail: "john@example.com",
    },
    relatedEntityId: "req-123",
    createdAt: new Date("2023-01-01T12:00:00Z").toISOString(),
  },
  {
    id: "notif-2",
    type: "FRIEND_REQUEST_ACCEPTED",
    title: "Friend Request Accepted",
    message: "Jane Smith accepted your friend request",
    read: true,
    metadata: {
      senderId: "jane-456",
      senderName: "Jane Smith",
      senderEmail: "jane@example.com",
    },
    relatedEntityId: "req-456",
    createdAt: new Date("2023-01-02T10:30:00Z").toISOString(),
    readAt: new Date("2023-01-02T10:35:00Z").toISOString(),
  },
  {
    id: "notif-3",
    type: "FRIEND_REQUEST_DECLINED",
    title: "Friend Request Declined",
    message: "Bob Wilson declined your friend request",
    read: false,
    metadata: {
      senderId: "bob-789",
      senderName: "Bob Wilson",
      senderEmail: "bob@example.com",
    },
    relatedEntityId: "req-789",
    createdAt: new Date("2023-01-03T14:15:00Z").toISOString(),
  },
];

// Mock friend request data
export const mockFriendRequests = [
  {
    id: "req-123",
    senderId: "john-123",
    receiverId: "test-user-123",
    status: "PENDING" as const,
    message: "Hey, let's be friends!",
    createdAt: new Date("2023-01-01T12:00:00Z"),
    updatedAt: new Date("2023-01-01T12:00:00Z"),
    sender: {
      id: "john-123",
      name: "John Doe",
      email: "john@example.com",
      image: "https://example.com/john.jpg",
    },
    receiver: {
      id: "test-user-123",
      name: "Test User",
      email: "test@example.com",
      image: "https://example.com/test.jpg",
    },
  },
  {
    id: "req-456", 
    senderId: "test-user-123",
    receiverId: "jane-456",
    status: "ACCEPTED" as const,
    message: "Hi Jane!",
    createdAt: new Date("2023-01-02T10:00:00Z"),
    updatedAt: new Date("2023-01-02T10:30:00Z"),
    sender: {
      id: "test-user-123",
      name: "Test User",
      email: "test@example.com",
      image: "https://example.com/test.jpg",
    },
    receiver: {
      id: "jane-456",
      name: "Jane Smith", 
      email: "jane@example.com",
      image: "https://example.com/jane.jpg",
    },
  },
];

// Test wrapper component with all necessary providers
interface TestProvidersProps {
  children: React.ReactNode;
  session?: Session | null;
  queryClient?: QueryClient;
}

export function TestProviders({ 
  children, 
  session = mockSession,
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  }),
}: TestProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        <SettingsProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </SettingsProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  session?: Session | null;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    session = mockSession,
    queryClient,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders session={session} queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock EventSource for SSE testing
export class MockEventSource {
  url: string;
  onopen?: ((this: EventSource, ev: Event) => any) | null;
  onmessage?: ((this: EventSource, ev: MessageEvent) => any) | null;
  onerror?: ((this: EventSource, ev: Event) => any) | null;
  readyState: number = 1;
  CONNECTING = 0;
  OPEN = 1;
  CLOSED = 2;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) {
        this.onopen.call(this as any, new Event("open"));
      }
    }, 10);
  }

  close() {
    this.readyState = 2;
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }

  addEventListener<K extends keyof EventSourceEventMap>(
    _type: K,
    _listener: (this: EventSource, ev: EventSourceEventMap[K]) => any,
    _options?: boolean | AddEventListenerOptions,
  ): void {
    // Mock implementation
  }

  removeEventListener<K extends keyof EventSourceEventMap>(
    _type: K,
    _listener: (this: EventSource, ev: EventSourceEventMap[K]) => any,
    _options?: boolean | EventListenerOptions,
  ): void {
    // Mock implementation
  }

  // Helper methods for testing
  simulateMessage(data: any) {
    if (this.onmessage) {
      const event = new MessageEvent("message", {
        data: JSON.stringify(data),
      });
      this.onmessage.call(this as any, event);
    }
  }

  simulateError(error?: any) {
    if (this.onerror) {
      const event = new ErrorEvent("error", { error });
      this.onerror.call(this as any, event);
    }
  }

  simulateOpen() {
    if (this.onopen) {
      this.onopen.call(this as any, new Event("open"));
    }
  }
}

// Test helper for waiting for async state updates
export const waitForAsyncUpdate = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// Test helper for generating unique IDs
export const generateTestId = (prefix = "test") => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2)}`;

// Test helper for creating mock dates
export const createMockDate = (daysAgo = 0) => 
  new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

// Test helper for mocking network delays
export const mockNetworkDelay = (ms = 100) =>
  new Promise(resolve => setTimeout(resolve, ms));

// Re-export everything from React Testing Library for convenience
export * from "@testing-library/react";
export { renderWithProviders as render };