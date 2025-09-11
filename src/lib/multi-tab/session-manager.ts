import type {
  TabId,
  GameId,
  TabSession,
  GameSession,
  SyncEvent,
} from "./types";

export class GameSessionManager {
  private sessions = new Map<GameId, GameSession>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly TAB_TIMEOUT = 60000; // 1 minute

  constructor() {
    // Cleanup inactive tabs every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveTabs();
    }, this.CLEANUP_INTERVAL);
  }

  addTab(
    gameId: GameId,
    tabId: TabId,
    session: Pick<TabSession, "controller" | "lastSeen">,
  ): void {
    if (!this.sessions.has(gameId)) {
      this.sessions.set(gameId, {
        gameId,
        tabs: new Map(),
        activeTabId: null,
        lastMove: new Date(),
        version: 1,
      });
    }

    const gameSession = this.sessions.get(gameId)!;
    const isFirstTab = gameSession.tabs.size === 0;

    gameSession.tabs.set(tabId, {
      id: tabId,
      isActive: isFirstTab,
      ...session,
    });

    // Set as active if first tab
    if (isFirstTab) {
      gameSession.activeTabId = tabId;
    }

    console.log(
      `Tab ${tabId} added to game ${gameId}. Total tabs: ${gameSession.tabs.size}`,
    );

    // Broadcast tab status update to all tabs
    this.broadcastToTabs(gameId, {
      type: "TAB_STATUS_UPDATE",
      payload: {
        activeTabId: gameSession.activeTabId,
        totalTabs: gameSession.tabs.size,
      },
      timestamp: new Date().toISOString(),
      gameId,
    });
  }

  removeTab(gameId: GameId, tabId: TabId): void {
    const gameSession = this.sessions.get(gameId);
    if (!gameSession) return;

    gameSession.tabs.delete(tabId);

    // If this was the active tab, assign a new one
    if (gameSession.activeTabId === tabId && gameSession.tabs.size > 0) {
      const nextTab = gameSession.tabs.values().next().value;
      if (nextTab) {
        gameSession.activeTabId = nextTab.id;
        nextTab.isActive = true;

        // Broadcast active tab change
        this.broadcastToTabs(gameId, {
          type: "ACTIVE_TAB_CHANGED",
          payload: { activeTabId: nextTab.id },
          timestamp: new Date().toISOString(),
          gameId,
        });
      }
    }

    // Remove session if no tabs left
    if (gameSession.tabs.size === 0) {
      this.sessions.delete(gameId);
      console.log(`Game session ${gameId} removed - no tabs remaining`);
    } else {
      // Broadcast updated tab count
      this.broadcastToTabs(gameId, {
        type: "TAB_STATUS_UPDATE",
        payload: {
          activeTabId: gameSession.activeTabId,
          totalTabs: gameSession.tabs.size,
        },
        timestamp: new Date().toISOString(),
        gameId,
      });
    }

    console.log(
      `Tab ${tabId} removed from game ${gameId}. Remaining tabs: ${gameSession.tabs.size}`,
    );
  }

  setActiveTab(gameId: GameId, tabId: TabId): boolean {
    const gameSession = this.sessions.get(gameId);
    if (!gameSession?.tabs.has(tabId)) {
      return false;
    }

    // Update active tab
    if (gameSession.activeTabId) {
      const previousActiveTab = gameSession.tabs.get(gameSession.activeTabId);
      if (previousActiveTab) {
        previousActiveTab.isActive = false;
      }
    }

    gameSession.activeTabId = tabId;
    const newActiveTab = gameSession.tabs.get(tabId)!;
    newActiveTab.isActive = true;

    console.log(`Active tab for game ${gameId} changed to ${tabId}`);

    return true;
  }

  updateTabHeartbeat(gameId: GameId, tabId: TabId): void {
    const gameSession = this.sessions.get(gameId);
    if (!gameSession) return;

    const tab = gameSession.tabs.get(tabId);
    if (tab) {
      tab.lastSeen = new Date();
    }
  }

  isActiveTab(gameId: GameId, tabId: TabId): boolean {
    const gameSession = this.sessions.get(gameId);
    return gameSession ? gameSession.activeTabId === tabId : false;
  }

  getSession(gameId: GameId): GameSession | undefined {
    return this.sessions.get(gameId);
  }

  broadcastToTabs(
    gameId: GameId,
    event: SyncEvent,
    excludeTabId?: TabId,
  ): void {
    const gameSession = this.sessions.get(gameId);
    if (!gameSession) return;

    const encoder = new TextEncoder();
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    const encodedData = encoder.encode(eventData);

    gameSession.tabs.forEach((tab) => {
      if (excludeTabId && tab.id === excludeTabId) return;

      try {
        if (tab.controller) {
          tab.controller.enqueue(encodedData);
        }
      } catch (error) {
        console.error(`Failed to send event to tab ${tab.id}:`, error);
        // Remove tab if controller is no longer valid
        this.removeTab(gameId, tab.id);
      }
    });
  }

  private cleanupInactiveTabs(): void {
    const now = new Date();

    this.sessions.forEach((gameSession, gameId) => {
      const tabsToRemove: TabId[] = [];

      gameSession.tabs.forEach((tab) => {
        const timeSinceLastSeen = now.getTime() - tab.lastSeen.getTime();
        if (timeSinceLastSeen > this.TAB_TIMEOUT) {
          tabsToRemove.push(tab.id);
        }
      });

      tabsToRemove.forEach((tabId) => {
        console.log(`Cleaning up inactive tab ${tabId} from game ${gameId}`);
        this.removeTab(gameId, tabId);
      });
    });
  }

  // Get statistics for monitoring
  getStats(): {
    totalSessions: number;
    totalTabs: number;
    sessionsDetails: Array<{
      gameId: GameId;
      tabCount: number;
      activeTabId: TabId | null;
    }>;
  } {
    const sessionsDetails = Array.from(this.sessions.entries()).map(
      ([gameId, session]) => ({
        gameId,
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
export const gameSessionManager = new GameSessionManager();

// Cleanup on process exit
process.on("exit", () => {
  gameSessionManager.destroy();
});

process.on("SIGINT", () => {
  gameSessionManager.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  gameSessionManager.destroy();
  process.exit(0);
});
