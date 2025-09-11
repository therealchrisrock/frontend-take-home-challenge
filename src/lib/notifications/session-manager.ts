import type { NotificationEvent } from "./types";

export type UserId = string;
export type TabId = string;

export interface NotificationSession {
  id: TabId;
  userId: UserId;
  controller: ReadableStreamDefaultController<Uint8Array>;
  lastSeen: Date;
  isActive: boolean;
}

export interface UserNotificationSession {
  userId: UserId;
  tabs: Map<TabId, NotificationSession>;
  activeTabId: TabId | null;
}

export class NotificationSessionManager {
  private sessions = new Map<UserId, UserNotificationSession>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly TAB_TIMEOUT = 60000; // 1 minute
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor() {
    // Cleanup inactive tabs every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveTabs();
    }, this.CLEANUP_INTERVAL);

    // Send heartbeat to all connections
    setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  addTab(
    userId: UserId,
    tabId: TabId,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        userId,
        tabs: new Map(),
        activeTabId: null,
      });
    }

    const userSession = this.sessions.get(userId)!;
    
    // Check if user already has an active tab (single-tab enforcement)
    if (userSession.tabs.size > 0) {
      // Close all existing tabs for this user
      userSession.tabs.forEach((tab) => {
        try {
          const encoder = new TextEncoder();
          const errorEvent = JSON.stringify({
            type: "CONNECTION_STATUS",
            payload: {
              connected: false,
              reconnecting: false,
              error: "Another tab has taken over the notification stream",
              lastConnected: null,
            },
            timestamp: new Date().toISOString(),
            userId,
          });
          tab.controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
          tab.controller.close();
        } catch (error) {
          console.error("Error closing existing tab:", error);
        }
      });
      userSession.tabs.clear();
    }

    const isFirstTab = userSession.tabs.size === 0;

    userSession.tabs.set(tabId, {
      id: tabId,
      userId,
      controller,
      lastSeen: new Date(),
      isActive: isFirstTab,
    });

    // Set as active (always first and only tab due to single-tab enforcement)
    userSession.activeTabId = tabId;

    console.log(`Notification tab ${tabId} added for user ${userId}`);

    // Send initial connection status
    this.sendToTab(userId, tabId, {
      type: "CONNECTION_STATUS",
      payload: {
        connected: true,
        reconnecting: false,
        error: undefined,
        lastConnected: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      userId,
    });
  }

  removeTab(userId: UserId, tabId: TabId): void {
    const userSession = this.sessions.get(userId);
    if (!userSession) return;

    userSession.tabs.delete(tabId);

    // Remove session if no tabs left
    if (userSession.tabs.size === 0) {
      this.sessions.delete(userId);
      console.log(`Notification session for user ${userId} removed - no tabs remaining`);
    }

    console.log(`Notification tab ${tabId} removed for user ${userId}`);
  }

  updateTabHeartbeat(userId: UserId, tabId: TabId): void {
    const userSession = this.sessions.get(userId);
    if (!userSession) return;

    const tab = userSession.tabs.get(tabId);
    if (tab) {
      tab.lastSeen = new Date();
    }
  }

  isActiveTab(userId: UserId, tabId: TabId): boolean {
    const userSession = this.sessions.get(userId);
    return userSession ? userSession.activeTabId === tabId : false;
  }

  getUserSession(userId: UserId): UserNotificationSession | undefined {
    return this.sessions.get(userId);
  }

  broadcastToUser(userId: UserId, event: NotificationEvent): void {
    const userSession = this.sessions.get(userId);
    if (!userSession) return;

    const encoder = new TextEncoder();
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    const encodedData = encoder.encode(eventData);

    userSession.tabs.forEach((tab) => {
      try {
        if (tab.controller) {
          tab.controller.enqueue(encodedData);
        }
      } catch (error) {
        console.error(`Failed to send notification event to user ${userId}, tab ${tab.id}:`, error);
        // Remove tab if controller is no longer valid
        this.removeTab(userId, tab.id);
      }
    });
  }

  sendToTab(userId: UserId, tabId: TabId, event: NotificationEvent): void {
    const userSession = this.sessions.get(userId);
    if (!userSession) return;

    const tab = userSession.tabs.get(tabId);
    if (!tab) return;

    const encoder = new TextEncoder();
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    const encodedData = encoder.encode(eventData);

    try {
      if (tab.controller) {
        tab.controller.enqueue(encodedData);
      }
    } catch (error) {
      console.error(`Failed to send event to user ${userId}, tab ${tabId}:`, error);
      this.removeTab(userId, tabId);
    }
  }

  private sendHeartbeat(): void {
    const encoder = new TextEncoder();
    const heartbeatEvent = JSON.stringify({
      type: "HEARTBEAT",
      payload: {},
      timestamp: new Date().toISOString(),
      userId: "",
    });
    const eventData = `data: ${heartbeatEvent}\n\n`;
    const encodedData = encoder.encode(eventData);

    this.sessions.forEach((userSession, userId) => {
      userSession.tabs.forEach((tab) => {
        try {
          if (tab.controller) {
            tab.controller.enqueue(encodedData);
            // Update heartbeat timestamp
            this.updateTabHeartbeat(userId, tab.id);
          }
        } catch (error) {
          console.error(`Failed to send heartbeat to user ${userId}, tab ${tab.id}:`, error);
          this.removeTab(userId, tab.id);
        }
      });
    });
  }

  private cleanupInactiveTabs(): void {
    const now = new Date();

    this.sessions.forEach((userSession, userId) => {
      const tabsToRemove: TabId[] = [];

      userSession.tabs.forEach((tab) => {
        const timeSinceLastSeen = now.getTime() - tab.lastSeen.getTime();
        if (timeSinceLastSeen > this.TAB_TIMEOUT) {
          tabsToRemove.push(tab.id);
        }
      });

      tabsToRemove.forEach((tabId) => {
        console.log(`Cleaning up inactive notification tab ${tabId} for user ${userId}`);
        this.removeTab(userId, tabId);
      });
    });
  }

  // Get statistics for monitoring
  getStats(): {
    totalSessions: number;
    totalTabs: number;
    sessionsDetails: Array<{
      userId: UserId;
      tabCount: number;
      activeTabId: TabId | null;
    }>;
  } {
    const sessionsDetails = Array.from(this.sessions.entries()).map(
      ([userId, session]) => ({
        userId,
        tabCount: session.tabs.size,
        activeTabId: session.activeTabId,
      }),
    );

    return {
      totalSessions: this.sessions.size,
      totalTabs: sessionsDetails.reduce(
        (sum, session) => sum + session.tabCount,
        0,
      ),
      sessionsDetails,
    };
  }

  // Cleanup on shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}

// Singleton instance
export const notificationSessionManager = new NotificationSessionManager();

// Cleanup on process exit
process.on("exit", () => {
  notificationSessionManager.destroy();
});

process.on("SIGINT", () => {
  notificationSessionManager.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  notificationSessionManager.destroy();
  process.exit(0);
});