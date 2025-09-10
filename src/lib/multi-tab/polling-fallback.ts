import type { GameId, TabId, SyncEvent, InitialStatePayload } from "./types";

export interface PollingFallbackOptions {
  gameId: GameId;
  tabId: TabId;
  pollInterval: number; // milliseconds
  onSyncEvent: (event: SyncEvent) => void;
  onError: (error: Error) => void;
}

export class PollingFallback {
  private gameId: GameId;
  private tabId: TabId;
  private pollInterval: number;
  private onSyncEvent: (event: SyncEvent) => void;
  private onError: (error: Error) => void;

  private intervalId: NodeJS.Timeout | null = null;
  private lastGameVersion = 0;
  private lastPollTime = 0;
  private isPolling = false;

  constructor(options: PollingFallbackOptions) {
    this.gameId = options.gameId;
    this.tabId = options.tabId;
    this.pollInterval = options.pollInterval;
    this.onSyncEvent = options.onSyncEvent;
    this.onError = options.onError;
  }

  async start(): Promise<void> {
    if (this.isPolling) return;

    this.isPolling = true;

    try {
      // Get initial game state
      await this.pollGameState(true);

      // Start polling interval
      this.intervalId = setInterval(() => {
        this.pollGameState().catch((error) => {
          console.error("Polling error:", error);
          this.onError(error);
        });
      }, this.pollInterval);

      console.log(
        `Started polling fallback for game ${this.gameId} every ${this.pollInterval}ms`,
      );
    } catch (error) {
      this.isPolling = false;
      throw error;
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    console.log(`Stopped polling fallback for game ${this.gameId}`);
  }

  private async pollGameState(isInitial = false): Promise<void> {
    try {
      // This would need to be adapted to work with the actual API
      // For now, we'll create a mock implementation
      const gameState = await this.fetchGameState();

      if (!gameState) {
        throw new Error("Game not found");
      }

      // Check if game has been updated since last poll
      if (isInitial || gameState.version > this.lastGameVersion) {
        this.lastGameVersion = gameState.version;

        // Send initial state or update event
        const eventType = isInitial ? "INITIAL_STATE" : "MOVE_APPLIED";

        const event: SyncEvent = {
          type: eventType,
          payload: gameState,
          timestamp: new Date().toISOString(),
          gameId: this.gameId,
          tabId: this.tabId,
        };

        this.onSyncEvent(event);
      }

      // Also poll for tab status updates (simplified)
      const tabStatus = await this.fetchTabStatus();
      if (tabStatus) {
        const tabEvent: SyncEvent = {
          type: "TAB_STATUS_UPDATE",
          payload: tabStatus,
          timestamp: new Date().toISOString(),
          gameId: this.gameId,
          tabId: this.tabId,
        };

        this.onSyncEvent(tabEvent);
      }

      this.lastPollTime = Date.now();
    } catch (error) {
      console.error("Failed to poll game state:", error);
      throw error;
    }
  }

  private async fetchGameState(): Promise<InitialStatePayload | null> {
    // This is a simplified version - in reality, you'd use tRPC here
    // For the actual implementation, you'd need to modify this to use the tRPC client
    try {
      // Mock API call - replace with actual tRPC call
      const response = await fetch(`/api/game/${this.gameId}/state`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch game state:", error);
      return null;
    }
  }

  private async fetchTabStatus(): Promise<{
    activeTabId: TabId | null;
    totalTabs: number;
  } | null> {
    try {
      // Mock API call - replace with actual tRPC call
      const response = await fetch(
        `/api/game/${this.gameId}/tab-status?tabId=${this.tabId}`,
      );
      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch tab status:", error);
      return null;
    }
  }

  // Utility method to check if browser supports SSE
  static isSSESupported(): boolean {
    return (
      typeof EventSource !== "undefined" &&
      EventSource.prototype.constructor === EventSource
    );
  }

  // Get recommended poll interval based on browser and connection
  static getRecommendedPollInterval(): number {
    // More frequent polling for better browsers
    if (PollingFallback.isSSESupported()) {
      return 5000; // 5 seconds for modern browsers as fallback
    }

    // Less frequent for older browsers to reduce load
    return 10000; // 10 seconds for older browsers
  }

  // Public getters
  get isActive(): boolean {
    return this.isPolling;
  }

  get lastUpdate(): Date | null {
    return this.lastPollTime > 0 ? new Date(this.lastPollTime) : null;
  }

  get gameVersion(): number {
    return this.lastGameVersion;
  }
}

// Utility function to create appropriate sync mechanism
export function createSyncMechanism(
  gameId: GameId,
  tabId: TabId,
  onSyncEvent: (event: SyncEvent) => void,
  onError: (error: Error) => void,
): { type: "sse" | "polling"; mechanism: any } {
  if (PollingFallback.isSSESupported()) {
    // Use SSE (handled by MultiTabSyncManager)
    return {
      type: "sse",
      mechanism: null, // SSE handling is in MultiTabSyncManager
    };
  } else {
    // Use polling fallback
    const polling = new PollingFallback({
      gameId,
      tabId,
      pollInterval: PollingFallback.getRecommendedPollInterval(),
      onSyncEvent,
      onError,
    });

    return {
      type: "polling",
      mechanism: polling,
    };
  }
}
