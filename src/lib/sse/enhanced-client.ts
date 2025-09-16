/**
 * SSE Client
 *
 * Provides consistent SSE connection management with proper cleanup patterns
 * that work seamlessly with the existing SSE hub infrastructure.
 * Fixes Firefox "connection interrupted" errors and prevents resource leaks.
 */

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "intentionally_disconnected";

export interface SSEClientOptions {
  url: string;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  maxReconnectAttempts?: number;
  baseReconnectDelay?: number;
  maxReconnectDelay?: number;
  heartbeatTimeout?: number;
  autoConnect?: boolean;
}

export interface SSEClient {
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  getState(): ConnectionState;
  isConnected(): boolean;
  destroy(): void;
}

/**
 * Creates an SSE client with proper cleanup patterns
 */
export function createSSEClient(options: SSEClientOptions): SSEClient {
  const {
    url,
    onMessage,
    onOpen,
    onError,
    onConnectionStateChange,
    maxReconnectAttempts = 10,
    baseReconnectDelay = 1000,
    maxReconnectDelay = 30000,
    heartbeatTimeout = 60000,
    autoConnect = true,
  } = options;

  let eventSource: EventSource | null = null;
  let connectionState: ConnectionState = "disconnected";
  let reconnectAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let heartbeatTimeoutId: NodeJS.Timeout | null = null;
  let isDestroyed = false;
  let isConnecting = false;

  // Track browser events for cleanup
  let hasRegisteredBrowserEvents = false;

  const setState = (newState: ConnectionState) => {
    if (connectionState !== newState) {
      const previousState = connectionState;
      connectionState = newState;

      // Log state changes for debugging
      console.log(`SSE state change: ${previousState} -> ${newState} (${url})`);

      onConnectionStateChange?.(newState);
    }
  };

  const clearTimeouts = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (heartbeatTimeoutId) {
      clearTimeout(heartbeatTimeoutId);
      heartbeatTimeoutId = null;
    }
  };

  const closeEventSource = (reason = "unknown") => {
    if (eventSource) {
      console.log(`Closing SSE connection: ${reason} (${url})`);

      // Remove event listeners to prevent further events
      eventSource.onopen = null;
      eventSource.onmessage = null;
      eventSource.onerror = null;

      // Close the connection
      eventSource.close();
      eventSource = null;
    }
  };

  const scheduleReconnect = () => {
    if (isDestroyed || connectionState === "intentionally_disconnected") {
      console.log(
        `Skipping reconnect: destroyed=${isDestroyed}, state=${connectionState}`,
      );
      return;
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.warn(
        `Max reconnect attempts reached (${maxReconnectAttempts}), giving up`,
      );
      setState("disconnected");
      return;
    }

    setState("reconnecting");

    // Exponential backoff with jitter
    const delay = Math.min(
      baseReconnectDelay * Math.pow(2, reconnectAttempts) +
        Math.random() * 1000,
      maxReconnectDelay,
    );

    console.log(
      `Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`,
    );

    reconnectTimeout = setTimeout(() => {
      if (!isDestroyed && connectionState !== "intentionally_disconnected") {
        connect().catch((error) => {
          console.error("Reconnect failed:", error);
        });
      }
    }, delay);
  };

  const handleBeforeUnload = () => {
    console.log("Page unloading, disconnecting SSE");
    setState("intentionally_disconnected");
    closeEventSource("beforeunload");
    clearTimeouts();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      console.log("Page hidden, preparing for potential cleanup");
      // Don't disconnect immediately, but clear heartbeat timeout
      if (heartbeatTimeoutId) {
        clearTimeout(heartbeatTimeoutId);
      }
    } else if (document.visibilityState === "visible") {
      console.log("Page visible, restarting heartbeat");
      // Page is visible again, restart heartbeat if connected
      if (eventSource && connectionState === "connected") {
        resetHeartbeatTimeout();
      }
    }
  };

  const handlePageHide = () => {
    console.log("Page hiding, disconnecting SSE immediately");
    setState("intentionally_disconnected");
    closeEventSource("pagehide");
    clearTimeouts();
  };

  const registerBrowserEvents = () => {
    if (hasRegisteredBrowserEvents || typeof window === "undefined") {
      return;
    }

    console.log("Registering browser cleanup events");
    hasRegisteredBrowserEvents = true;

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle browser back/forward navigation
    window.addEventListener("pageshow", (event) => {
      if (event.persisted && connectionState === "intentionally_disconnected") {
        console.log("Page restored from cache, resetting state");
        setState("disconnected");
      }
    });
  };

  const unregisterBrowserEvents = () => {
    if (!hasRegisteredBrowserEvents || typeof window === "undefined") {
      return;
    }

    console.log("Unregistering browser cleanup events");
    hasRegisteredBrowserEvents = false;

    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("pagehide", handlePageHide);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };

  const resetHeartbeatTimeout = () => {
    if (heartbeatTimeoutId) {
      clearTimeout(heartbeatTimeoutId);
    }

    heartbeatTimeoutId = setTimeout(() => {
      if (connectionState === "connected" && !isDestroyed) {
        console.warn("SSE heartbeat timeout, connection may be stale");
        closeEventSource("heartbeat_timeout");
        setState("disconnected");
        scheduleReconnect();
      }
    }, heartbeatTimeout);
  };

  const connect = async (): Promise<void> => {
    if (
      isDestroyed ||
      connectionState === "intentionally_disconnected" ||
      isConnecting
    ) {
      console.log(
        `Skipping connect: destroyed=${isDestroyed}, state=${connectionState}, connecting=${isConnecting}`,
      );
      return;
    }

    isConnecting = true;
    setState("connecting");

    console.log(`Connecting to SSE: ${url}`);

    // Register browser events on first connection attempt
    registerBrowserEvents();

    // Close any existing connection
    closeEventSource("reconnecting");
    clearTimeouts();

    try {
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log("SSE connection opened");
        isConnecting = false;
        setState("connected");
        reconnectAttempts = 0; // Reset counter on successful connection
        resetHeartbeatTimeout();
        onOpen?.();
      };

      eventSource.onmessage = (event) => {
        // Reset heartbeat timeout on any message
        resetHeartbeatTimeout();

        // Handle heartbeat messages internally
        try {
          const data = JSON.parse(event.data);
          if (data.type === "HEARTBEAT" || data.type === "heartbeat") {
            console.log("Heartbeat received");
            return; // Don't pass heartbeat to application
          }
          if (
            data.type === "CONNECTION_STATUS" ||
            data.type === "connection_established"
          ) {
            console.log("Connection status message received:", data);
            // Pass through connection status messages
          }
        } catch {
          // Not JSON or doesn't have type field, pass through
        }

        onMessage?.(event);
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        isConnecting = false;

        if (connectionState === "intentionally_disconnected" || isDestroyed) {
          console.log("Ignoring error after intentional disconnect");
          return;
        }

        setState("disconnected");
        closeEventSource("connection_error");
        clearTimeouts();

        reconnectAttempts++;
        onError?.(error);

        // Schedule reconnection
        scheduleReconnect();
      };
    } catch (error) {
      console.error("Failed to create EventSource:", error);
      isConnecting = false;
      setState("disconnected");
      scheduleReconnect();
    }
  };

  const disconnect = () => {
    console.log("Intentional disconnect requested");
    setState("intentionally_disconnected");
    closeEventSource("intentional_disconnect");
    clearTimeouts();
  };

  const reconnect = async (): Promise<void> => {
    console.log("Manual reconnect requested");
    if (connectionState === "intentionally_disconnected") {
      setState("disconnected"); // Reset from intentional disconnect
    }
    closeEventSource("manual_reconnect");
    clearTimeouts();
    reconnectAttempts = 0; // Reset attempts for manual reconnect
    await connect();
  };

  const destroy = () => {
    console.log("Destroying SSE client");
    isDestroyed = true;
    setState("intentionally_disconnected");
    closeEventSource("destroy");
    clearTimeouts();
    unregisterBrowserEvents();
  };

  const getState = () => connectionState;
  const isConnected = () => connectionState === "connected";

  // Auto-connect if enabled
  if (autoConnect && typeof window !== "undefined") {
    // Use setTimeout to avoid blocking the constructor
    setTimeout(() => {
      if (!isDestroyed) {
        connect().catch((error) => {
          console.error("Auto-connect failed:", error);
        });
      }
    }, 0);
  }

  return {
    connect,
    disconnect,
    reconnect,
    getState,
    isConnected,
    destroy,
  };
}
