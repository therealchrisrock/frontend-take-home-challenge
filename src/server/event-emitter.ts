/**
 * Server Event Emitter
 * 
 * Singleton event emitter for server-side event distribution.
 * This acts as a bridge between tRPC mutations and tRPC subscriptions.
 */

import { EventEmitter, on } from 'events';
import type { SSEEvent } from '~/types/sse-events';

// Export the 'on' function for use in tRPC subscriptions
export { on };

/**
 * ServerEventEmitter - Centralized event distribution system
 * 
 * This singleton manages all server-side event routing, allowing tRPC procedures
 * to emit events that will be delivered to connected SSE clients.
 */
class ServerEventEmitter extends EventEmitter {
  private static instance: ServerEventEmitter;
  private eventCounter = 0;
  
  private constructor() {
    super();
    // Unlimited listeners since we may have many concurrent connections
    this.setMaxListeners(0);
    
    // Log significant events in development
    if (process.env.NODE_ENV === 'development') {
      this.on('error', (error) => {
        console.error('[ServerEventEmitter] Error:', error);
      });
    }
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(): ServerEventEmitter {
    if (!ServerEventEmitter.instance) {
      ServerEventEmitter.instance = new ServerEventEmitter();
    }
    return ServerEventEmitter.instance;
  }
  
  /**
   * Emit an event to a specific user
   * The event will be delivered to all of the user's connected tabs/sessions
   */
  emitToUser<T>(userId: string, event: SSEEvent<T>): void {
    const userChannel = `user:${userId}`;
    
    // Add sequence number for ordering
    const eventWithSequence: SSEEvent<T> = {
      ...event,
      sequenceNumber: ++this.eventCounter,
    };
    
    this.emit(userChannel, eventWithSequence);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EventEmitter] Emitted to user ${userId}:`, event.type);
    }
  }
  
  /**
   * Emit an event to all users in a channel
   * Channels can be games, chats, or any other logical grouping
   */
  emitToChannel<T>(channel: string, event: SSEEvent<T>): void {
    // Add sequence number for ordering
    const eventWithSequence: SSEEvent<T> = {
      ...event,
      sequenceNumber: ++this.eventCounter,
    };
    
    this.emit(channel, eventWithSequence);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EventEmitter] Emitted to channel ${channel}:`, event.type);
    }
  }
  
  /**
   * Emit an event to multiple users
   * Useful for broadcasting to a list of friends, team members, etc.
   */
  emitToUsers<T>(userIds: string[], event: SSEEvent<T>): void {
    userIds.forEach(userId => {
      this.emitToUser(userId, event);
    });
  }
  
  /**
   * Subscribe to user events
   * Returns an unsubscribe function
   */
  onUserEvent(userId: string, callback: (event: SSEEvent) => void): () => void {
    const userChannel = `user:${userId}`;
    this.on(userChannel, callback);
    
    // Return unsubscribe function
    return () => {
      this.off(userChannel, callback);
    };
  }
  
  /**
   * Subscribe to channel events
   * Returns an unsubscribe function
   */
  onChannelEvent(channel: string, callback: (event: SSEEvent) => void): () => void {
    this.on(channel, callback);
    
    // Return unsubscribe function
    return () => {
      this.off(channel, callback);
    };
  }
  
  /**
   * Subscribe to multiple channels at once
   * Returns an unsubscribe function that removes all subscriptions
   */
  onMultipleChannels(
    channels: string[], 
    callback: (event: SSEEvent) => void
  ): () => void {
    channels.forEach(channel => {
      this.on(channel, callback);
    });
    
    // Return unsubscribe function for all channels
    return () => {
      channels.forEach(channel => {
        this.off(channel, callback);
      });
    };
  }
  
  /**
   * Check if there are any listeners for a user
   */
  hasUserListeners(userId: string): boolean {
    const userChannel = `user:${userId}`;
    return this.listenerCount(userChannel) > 0;
  }
  
  /**
   * Check if there are any listeners for a channel
   */
  hasChannelListeners(channel: string): boolean {
    return this.listenerCount(channel) > 0;
  }
  
  /**
   * Get statistics about current connections
   */
  getStats(): {
    totalChannels: number;
    totalListeners: number;
    channels: Array<{ channel: string; listenerCount: number }>;
  } {
    const channels = this.eventNames()
      .filter(name => typeof name === 'string')
      .map(name => ({
        channel: name as string,
        listenerCount: this.listenerCount(name as string),
      }));
    
    return {
      totalChannels: channels.length,
      totalListeners: channels.reduce((sum, ch) => sum + ch.listenerCount, 0),
      channels,
    };
  }
  
  /**
   * Clean up listeners for a specific user
   * Called when a user disconnects completely
   */
  cleanupUser(userId: string): void {
    const userChannel = `user:${userId}`;
    this.removeAllListeners(userChannel);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EventEmitter] Cleaned up listeners for user ${userId}`);
    }
  }
  
  /**
   * Clean up listeners for a specific channel
   * Called when a channel is no longer needed (e.g., game ends)
   */
  cleanupChannel(channel: string): void {
    this.removeAllListeners(channel);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EventEmitter] Cleaned up listeners for channel ${channel}`);
    }
  }
  
  /**
   * Reset the emitter (mainly for testing)
   */
  reset(): void {
    this.removeAllListeners();
    this.eventCounter = 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[EventEmitter] Reset all listeners');
    }
  }
}

// Export singleton instance
export const eventEmitter = ServerEventEmitter.getInstance();

// Export type for testing
export type { ServerEventEmitter };

// Graceful shutdown
if (typeof process !== 'undefined') {
  const cleanup = () => {
    eventEmitter.removeAllListeners();
    console.log('[EventEmitter] Cleaned up all listeners on process exit');
  };
  
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}