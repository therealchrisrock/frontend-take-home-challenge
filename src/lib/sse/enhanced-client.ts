/**
 * SSE Client - Simplified "Always Alive" Pattern
 *
 * Maintains persistent SSE connections with automatic browser-handled reconnection.
 * Fixes Firefox "connection interrupted" errors and simplifies state management.
 */

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface SSEClientOptions {
  url: string;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
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
 * Creates a simplified SSE client that maintains persistent connections
 */
export function createSSEClient(options: SSEClientOptions): SSEClient {
  const {
    url,
    onMessage,
    onOpen,
    onError,
    onConnectionStateChange,
    heartbeatTimeout = 60000,
    autoConnect = true,
  } = options;

  let eventSource: EventSource | null = null;
  let connectionState: ConnectionState = "disconnected";
  let heartbeatTimeoutId: NodeJS.Timeout | null = null;
  let isDestroyed = false;

  const setState = (newState: ConnectionState) => {
    if (connectionState !== newState) {
      const previousState = connectionState;
      connectionState = newState;
      
      // Log state changes for debugging
      console.log(`SSE state change: ${previousState} -> ${newState} (${url})`);
      
      onConnectionStateChange?.(newState);
    }
  };

  const clearHeartbeatTimeout = () => {
    if (heartbeatTimeoutId) {
      clearTimeout(heartbeatTimeoutId);
      heartbeatTimeoutId = null;
    }
  };

  const closeEventSource = () => {
    if (eventSource) {
      console.log(`Closing SSE connection (${url})`);
      
      // Remove event listeners to prevent further events
      eventSource.onopen = null;
      eventSource.onmessage = null;
      eventSource.onerror = null;
      
      // Close the connection
      eventSource.close();
      eventSource = null;
    }
  };

  const resetHeartbeatTimeout = () => {
    clearHeartbeatTimeout();
    
    // Heartbeat timeout is now only for monitoring, not disconnection
    heartbeatTimeoutId = setTimeout(() => {
      if (connectionState === "connected" && !isDestroyed) {
        console.warn("SSE heartbeat timeout - connection may be stale, but keeping alive");
        // Don't disconnect - let browser handle reconnection if needed
      }
    }, heartbeatTimeout);
  };

  // Cleanup function for page unload events
  const cleanup = () => {
    console.log("SSE: Cleaning up connection for page unload");
    isDestroyed = true;
    setState("disconnected");
    closeEventSource();
    clearHeartbeatTimeout();
  };

  // Handle various page unload events for Firefox compatibility
  const handlePageHide = (e: PageTransitionEvent) => {
    // Don't cleanup if page is being cached (bfcache)
    if (e.persisted) return;
    
    console.log("SSE: Page hiding, cleaning up for Firefox");
    cleanup();
  };

  const handleBeforeUnload = () => {
    console.log("SSE: Page unloading");
    cleanup();
  };

  const handleUnload = () => {
    console.log("SSE: Page unload event");
    cleanup();
  };

  const registerUnloadEvents = () => {
    if (typeof window === "undefined") return;
    
    // Register all unload events for maximum compatibility
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);
  };

  const unregisterUnloadEvents = () => {
    if (typeof window === "undefined") return;
    
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("unload", handleUnload);
  };

  const connect = async (): Promise<void> => {
    if (isDestroyed) {
      console.log("SSE: Cannot connect - client is destroyed");
      return;
    }

    if (eventSource?.readyState === EventSource.OPEN) {
      console.log("SSE: Already connected");
      return;
    }

    setState("connecting");
    console.log(`SSE: Connecting to ${url}`);
    
    // Register unload events on first connection
    registerUnloadEvents();
    
    // Close any existing connection
    closeEventSource();
    clearHeartbeatTimeout();
    
    try {
      eventSource = new EventSource(url);
      
      eventSource.onopen = () => {
        console.log("SSE: Connection opened");
        setState("connected");
        resetHeartbeatTimeout();
        onOpen?.();
      };
      
      eventSource.onmessage = (event) => {
        // Reset heartbeat timeout on any message
        resetHeartbeatTimeout();
        
        // Filter heartbeat messages internally
        try {
          const data = JSON.parse(event.data);
          if (data.type === "HEARTBEAT" || data.type === "heartbeat") {
            console.log("SSE: Heartbeat received");
            return; // Don't pass heartbeat to application
          }
          if (data.type === "CONNECTION_STATUS" || data.type === "connection_established") {
            console.log("SSE: Connection status message received:", data);
            // Pass through connection status messages
          }
        } catch {
          // Not JSON or doesn't have type field, pass through
        }
        
        onMessage?.(event);
      };
      
      eventSource.onerror = (error) => {
        // Don't log errors during normal reconnection
        if (eventSource?.readyState === EventSource.CONNECTING) {
          // Browser is automatically reconnecting
          if (connectionState !== "reconnecting") {
            console.log("SSE: Browser reconnecting...");
            setState("reconnecting");
          }
        } else if (eventSource?.readyState === EventSource.CLOSED) {
          // Connection closed, browser will auto-reconnect
          console.log("SSE: Connection closed, browser will handle reconnection");
          setState("disconnected");
          // Don't manually reconnect - let browser handle it
        } else {
          // Actual error
          console.error("SSE: Connection error:", error);
          onError?.(error);
        }
      };
    } catch (error) {
      console.error("SSE: Failed to create EventSource:", error);
      setState("disconnected");
      // Don't try to reconnect on construction failure
    }
  };

  const disconnect = () => {
    console.log("SSE: Manual disconnect requested");
    closeEventSource();
    clearHeartbeatTimeout();
    setState("disconnected");
  };

  const reconnect = async (): Promise<void> => {
    console.log("SSE: Manual reconnect requested");
    closeEventSource();
    clearHeartbeatTimeout();
    await connect();
  };

  const destroy = () => {
    console.log("SSE: Destroying client");
    isDestroyed = true;
    closeEventSource();
    clearHeartbeatTimeout();
    unregisterUnloadEvents();
    setState("disconnected");
  };

  const getState = () => connectionState;
  const isConnected = () => connectionState === "connected";

  // Auto-connect if enabled
  if (autoConnect && typeof window !== "undefined") {
    // Use setTimeout to avoid blocking the constructor
    setTimeout(() => {
      if (!isDestroyed) {
        connect().catch((error) => {
          console.error("SSE: Auto-connect failed:", error);
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