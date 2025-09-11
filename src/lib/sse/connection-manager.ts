import type {
  UserId,
  TabId,
  NotificationConnection,
  UserSession,
  SSEMessage,
  NotificationData,
} from "./types";

export class NotificationConnectionManager {
  private sessions = new Map<UserId, UserSession>();
  private cleanupInterval: NodeJS.Timeout;
  private heartbeatInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 1 minute

  constructor() {
    // Cleanup inactive connections every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, this.CLEANUP_INTERVAL);

    // Send heartbeat to all connections every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeatToAll();
    }, this.HEARTBEAT_INTERVAL);
  }

  addConnection(
    userId: UserId,
    tabId: TabId,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        userId,
        connections: new Map(),
        activeTabId: null,
      });
    }

    const userSession = this.sessions.get(userId)!;
    
    // Close existing connections for single-tab enforcement
    if (userSession.connections.size > 0) {
      console.log(`Closing existing connections for user ${userId} (single-tab enforcement)`);
      this.closeExistingConnections(userId, tabId);
    }

    const connection: NotificationConnection = {
      id: `${userId}-${tabId}-${Date.now()}`,
      userId,
      tabId,
      controller,
      lastSeen: new Date(),
      isActive: true,
    };

    userSession.connections.set(tabId, connection);
    userSession.activeTabId = tabId;

    console.log(`Connection established for user ${userId}, tab ${tabId}`);

    // Send connection established message
    this.sendToConnection(connection, {
      type: 'connection_established',
      data: {
        tabId,
        timestamp: Date.now(),
        message: 'Successfully connected to notification stream',
      },
    });
  }

  removeConnection(userId: UserId, tabId: TabId): void {
    const userSession = this.sessions.get(userId);
    if (!userSession) return;

    userSession.connections.delete(tabId);

    // If this was the active tab, clear it
    if (userSession.activeTabId === tabId) {
      userSession.activeTabId = null;
    }

    // Remove session if no connections left
    if (userSession.connections.size === 0) {
      this.sessions.delete(userId);
      console.log(`User session ${userId} removed - no connections remaining`);
    }

    console.log(`Connection removed for user ${userId}, tab ${tabId}`);
  }

  updateConnectionHeartbeat(userId: UserId, tabId: TabId): void {
    const userSession = this.sessions.get(userId);
    if (!userSession) return;

    const connection = userSession.connections.get(tabId);
    if (connection) {
      connection.lastSeen = new Date();
    }
  }

  broadcastToUser(userId: UserId, notification: NotificationData): void {
    const userSession = this.sessions.get(userId);
    if (!userSession) {
      console.log(`No active session for user ${userId}, notification queued for delivery`);
      return;
    }

    const message: SSEMessage = {
      type: 'notification',
      data: {
        notification,
        timestamp: Date.now(),
      },
    };

    userSession.connections.forEach((connection) => {
      this.sendToConnection(connection, message);
    });

    console.log(`Notification sent to user ${userId} (${userSession.connections.size} connections)`);
  }

  private closeExistingConnections(userId: UserId, excludeTabId?: TabId): void {
    const userSession = this.sessions.get(userId);
    if (!userSession) return;

    const connectionsToClose: TabId[] = [];
    
    userSession.connections.forEach((connection, tabId) => {
      if (excludeTabId && tabId === excludeTabId) return;
      
      // Send connection closed message
      this.sendToConnection(connection, {
        type: 'connection_closed',
        data: {
          tabId,
          timestamp: Date.now(),
          message: 'Connection closed due to new tab activation',
        },
      });

      connectionsToClose.push(tabId);
    });

    // Remove closed connections
    connectionsToClose.forEach((tabId) => {
      userSession.connections.delete(tabId);
    });
  }

  private sendToConnection(connection: NotificationConnection, message: SSEMessage): void {
    try {
      const encoder = new TextEncoder();
      const eventData = `data: ${JSON.stringify(message)}\n\n`;
      const encodedData = encoder.encode(eventData);
      
      connection.controller.enqueue(encodedData);
    } catch (error) {
      console.error(`Failed to send message to connection ${connection.id}:`, error);
      // Remove connection if controller is no longer valid
      this.removeConnection(connection.userId, connection.tabId);
    }
  }

  private sendHeartbeatToAll(): void {
    this.sessions.forEach((userSession) => {
      userSession.connections.forEach((connection) => {
        this.sendToConnection(connection, {
          type: 'heartbeat',
          data: {
            tabId: connection.tabId,
            timestamp: Date.now(),
          },
        });
      });
    });
  }

  private cleanupInactiveConnections(): void {
    const now = new Date();

    this.sessions.forEach((userSession, userId) => {
      const connectionsToRemove: TabId[] = [];

      userSession.connections.forEach((connection, tabId) => {
        const timeSinceLastSeen = now.getTime() - connection.lastSeen.getTime();
        if (timeSinceLastSeen > this.CONNECTION_TIMEOUT) {
          connectionsToRemove.push(tabId);
        }
      });

      connectionsToRemove.forEach((tabId) => {
        console.log(`Cleaning up inactive connection for user ${userId}, tab ${tabId}`);
        this.removeConnection(userId, tabId);
      });
    });
  }

  // Get statistics for monitoring
  getStats(): {
    totalSessions: number;
    totalConnections: number;
    sessionsDetails: Array<{
      userId: UserId;
      connectionCount: number;
      activeTabId: TabId | null;
    }>;
  } {
    const sessionsDetails = Array.from(this.sessions.entries()).map(
      ([userId, session]) => ({
        userId,
        connectionCount: session.connections.size,
        activeTabId: session.activeTabId,
      }),
    );

    return {
      totalSessions: this.sessions.size,
      totalConnections: sessionsDetails.reduce(
        (sum, session) => sum + session.connectionCount,
        0,
      ),
      sessionsDetails,
    };
  }

  // Check if user has active connections
  hasActiveConnection(userId: UserId): boolean {
    const userSession = this.sessions.get(userId);
    return userSession ? userSession.connections.size > 0 : false;
  }

  // Cleanup on shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections gracefully
    this.sessions.forEach((userSession, userId) => {
      userSession.connections.forEach((connection, tabId) => {
        this.sendToConnection(connection, {
          type: 'connection_closed',
          data: {
            tabId,
            timestamp: Date.now(),
            message: 'Server shutting down',
          },
        });
      });
    });

    this.sessions.clear();
  }
}

// Singleton instance
export const notificationConnectionManager = new NotificationConnectionManager();

// Cleanup on process exit
process.on("exit", () => {
  notificationConnectionManager.destroy();
});

process.on("SIGINT", () => {
  notificationConnectionManager.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  notificationConnectionManager.destroy();
  process.exit(0);
});