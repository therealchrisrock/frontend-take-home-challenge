import type { ConnectionStatus } from "./syncManager";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor";

export interface ConnectionMetrics {
  latency: number;
  quality: ConnectionQuality;
  isOnline: boolean;
  reconnectAttempts: number;
  lastSuccessfulConnection: number;
  packetsLost: number;
  totalPackets: number;
}

export interface PingResult {
  timestamp: number;
  latency: number;
  success: boolean;
}

export interface ConnectionEvent {
  type: "quality_changed" | "reconnect_attempt" | "connection_restored" | "connection_lost";
  data: {
    metrics: ConnectionMetrics;
    timestamp: number;
  };
}

type ConnectionEventListener = (event: ConnectionEvent) => void;

export class ConnectionManager {
  private metrics: ConnectionMetrics = {
    latency: 0,
    quality: "excellent",
    isOnline: navigator.onLine,
    reconnectAttempts: 0,
    lastSuccessfulConnection: Date.now(),
    packetsLost: 0,
    totalPackets: 0,
  };

  private eventListeners = new Set<ConnectionEventListener>();
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingHistory: PingResult[] = [];
  private readonly MAX_PING_HISTORY = 10;
  private readonly PING_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Progressive backoff

  constructor(private gameId: string) {
    this.initializeConnectionMonitoring();
  }

  private initializeConnectionMonitoring(): void {
    // Listen to browser online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline.bind(this));
      window.addEventListener("offline", this.handleOffline.bind(this));
    }

    // Start periodic ping monitoring
    this.startPingMonitoring();
  }

  private startPingMonitoring(): void {
    this.pingInterval = setInterval(async () => {
      await this.performPing();
    }, this.PING_INTERVAL);
  }

  private async performPing(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Use a lightweight endpoint for ping testing
      const response = await fetch("/api/ping", {
        method: "HEAD",
        cache: "no-cache",
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const latency = Date.now() - startTime;
      const success = response.ok;

      this.recordPingResult({
        timestamp: Date.now(),
        latency,
        success,
      });

      if (success) {
        this.updateMetrics({ latency });
        this.metrics.reconnectAttempts = 0; // Reset on successful ping
        
        if (!this.metrics.isOnline) {
          this.metrics.isOnline = true;
          this.metrics.lastSuccessfulConnection = Date.now();
          this.emitEvent({
            type: "connection_restored",
            data: {
              metrics: { ...this.metrics },
              timestamp: Date.now(),
            },
          });
        }
      } else {
        this.handlePingFailure();
      }

    } catch (error) {
      this.recordPingResult({
        timestamp: Date.now(),
        latency: 10000, // Max timeout
        success: false,
      });
      
      this.handlePingFailure();
    }
  }

  private recordPingResult(result: PingResult): void {
    this.pingHistory.push(result);
    
    // Keep only the most recent ping results
    if (this.pingHistory.length > this.MAX_PING_HISTORY) {
      this.pingHistory.shift();
    }

    // Update packet statistics
    this.metrics.totalPackets++;
    if (!result.success) {
      this.metrics.packetsLost++;
    }
  }

  private handlePingFailure(): void {
    if (this.metrics.isOnline) {
      this.metrics.isOnline = false;
      this.emitEvent({
        type: "connection_lost",
        data: {
          metrics: { ...this.metrics },
          timestamp: Date.now(),
        },
      });
    }

    this.attemptReconnection();
  }

  private attemptReconnection(): void {
    if (this.metrics.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.warn("Max reconnection attempts reached");
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delayIndex = Math.min(this.metrics.reconnectAttempts, this.RECONNECT_DELAYS.length - 1);
    const delay = this.RECONNECT_DELAYS[delayIndex];

    this.reconnectTimeout = setTimeout(async () => {
      this.metrics.reconnectAttempts++;
      
      this.emitEvent({
        type: "reconnect_attempt",
        data: {
          metrics: { ...this.metrics },
          timestamp: Date.now(),
        },
      });

      // Attempt to ping again
      await this.performPing();
    }, delay);
  }

  private updateMetrics(updates: Partial<ConnectionMetrics>): void {
    const oldQuality = this.metrics.quality;
    
    Object.assign(this.metrics, updates);
    
    // Update connection quality based on latency
    this.metrics.quality = this.calculateConnectionQuality(this.metrics.latency);
    
    if (oldQuality !== this.metrics.quality) {
      this.emitEvent({
        type: "quality_changed",
        data: {
          metrics: { ...this.metrics },
          timestamp: Date.now(),
        },
      });
    }
  }

  private calculateConnectionQuality(latency: number): ConnectionQuality {
    if (latency < 50) return "excellent";
    if (latency < 150) return "good";
    if (latency < 300) return "fair";
    return "poor";
  }

  private handleOnline(): void {
    console.log("Browser detected online status");
    this.metrics.isOnline = true;
    this.metrics.reconnectAttempts = 0;
    
    // Immediate ping test when coming online
    void this.performPing();
  }

  private handleOffline(): void {
    console.log("Browser detected offline status");
    this.metrics.isOnline = false;
    
    this.emitEvent({
      type: "connection_lost",
      data: {
        metrics: { ...this.metrics },
        timestamp: Date.now(),
      },
    });
  }

  // Public API methods
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  getPingHistory(): PingResult[] {
    return [...this.pingHistory];
  }

  getAverageLatency(): number {
    const successfulPings = this.pingHistory.filter(ping => ping.success);
    if (successfulPings.length === 0) return 0;
    
    const totalLatency = successfulPings.reduce((sum, ping) => sum + ping.latency, 0);
    return Math.round(totalLatency / successfulPings.length);
  }

  getPacketLossRate(): number {
    if (this.metrics.totalPackets === 0) return 0;
    return (this.metrics.packetsLost / this.metrics.totalPackets) * 100;
  }

  isConnectionStable(): boolean {
    const recentPings = this.pingHistory.slice(-5); // Last 5 pings
    const successRate = recentPings.filter(ping => ping.success).length / recentPings.length;
    
    return successRate >= 0.8 && this.metrics.latency < 500; // 80% success rate and reasonable latency
  }

  getConnectionStatusDisplay(): {
    status: ConnectionStatus;
    quality: ConnectionQuality;
    latency: number;
    indicator: "🟢" | "🟡" | "🔴";
  } {
    let status: ConnectionStatus;
    let indicator: "🟢" | "🟡" | "🔴";

    if (!this.metrics.isOnline) {
      status = "disconnected";
      indicator = "🔴";
    } else if (this.metrics.reconnectAttempts > 0) {
      status = "connecting";
      indicator = "🟡";
    } else if (this.isConnectionStable()) {
      status = "connected";
      indicator = "🟢";
    } else {
      status = "error";
      indicator = "🟡";
    }

    return {
      status,
      quality: this.metrics.quality,
      latency: this.getAverageLatency(),
      indicator,
    };
  }

  // Manual connection test
  async testConnection(): Promise<{
    success: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch("/api/ping", {
        method: "HEAD",
        cache: "no-cache",
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;
      
      return {
        success: response.ok,
        latency,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Force reconnection attempt
  forceReconnect(): void {
    this.metrics.reconnectAttempts = 0;
    void this.performPing();
  }

  // Event system
  addEventListener(listener: ConnectionEventListener): void {
    this.eventListeners.add(listener);
  }

  removeEventListener(listener: ConnectionEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(event: ConnectionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Connection event listener error:", error);
      }
    });
  }

  // Cleanup
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline.bind(this));
      window.removeEventListener("offline", this.handleOffline.bind(this));
    }

    this.eventListeners.clear();
    this.pingHistory.length = 0;
  }
}