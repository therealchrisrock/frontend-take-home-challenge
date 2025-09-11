/**
 * Multiplayer Game Synchronization Utilities
 * 
 * Handles real-time synchronization between players, including:
 * - SSE event emission for game moves
 * - Connection status tracking
 * - Move conflict resolution
 * - Player state synchronization
 */

import type { Position } from "~/lib/game/logic";
import type { SSEMessage } from "~/types/notifications";

// Types for multiplayer synchronization events
export interface GameMoveEvent {
  type: "GAME_MOVE";
  data: {
    gameId: string;
    move: {
      from: Position;
      to: Position;
      captures: Position[];
    };
    playerId: string | null;
    playerRole: "PLAYER_1" | "PLAYER_2";
    timestamp: Date;
    gameVersion: number;
    newGameState: {
      currentPlayer: "red" | "black";
      moveCount: number;
      winner: string | null;
    };
  };
}

export interface PlayerJoinedEvent {
  type: "PLAYER_JOINED";
  data: {
    gameId: string;
    playerId: string | null;
    playerRole: "PLAYER_1" | "PLAYER_2" | "SPECTATOR";
    playerName: string;
    isGuest: boolean;
    timestamp: Date;
  };
}

export interface PlayerLeftEvent {
  type: "PLAYER_LEFT";
  data: {
    gameId: string;
    playerId: string | null;
    playerRole: "PLAYER_1" | "PLAYER_2" | "SPECTATOR";
    connectionId: string;
    timestamp: Date;
  };
}

export interface GameStateSync {
  type: "GAME_STATE_SYNC";
  data: {
    gameId: string;
    gameVersion: number;
    syncType: "FULL_STATE" | "INCREMENTAL" | "CONFLICT_RESOLUTION";
    gameState: {
      board: string; // JSON serialized board
      currentPlayer: "red" | "black";
      moveCount: number;
      winner: string | null;
      version: number;
    };
    timestamp: Date;
  };
}

export interface ConnectionStatusEvent {
  type: "CONNECTION_STATUS";
  data: {
    gameId: string;
    playerId: string | null;
    status: "connected" | "disconnected" | "reconnecting";
    timestamp: Date;
    ping?: number; // Latency in ms
  };
}

export type MultiplayerSSEEvent = 
  | GameMoveEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | GameStateSync
  | ConnectionStatusEvent;

// Constants for synchronization
export const SYNC_CONSTANTS = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000, // Base delay for exponential backoff
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 60000, // 1 minute
  MOVE_TIMEOUT: 5000, // 5 seconds for move acknowledgment
  MAX_PENDING_MOVES: 10, // Maximum moves to queue offline
} as const;

// Connection states for tracking
export interface PlayerConnection {
  playerId: string | null;
  gameId: string;
  connectionId: string;
  isGuest: boolean;
  playerRole: "PLAYER_1" | "PLAYER_2" | "SPECTATOR";
  status: "connected" | "disconnected" | "reconnecting";
  lastPing: Date;
  joinedAt: Date;
}

// Move synchronization queue item
export interface QueuedMove {
  id: string;
  gameId: string;
  move: {
    from: Position;
    to: Position;
    captures: Position[];
  };
  playerId: string | null;
  timestamp: Date;
  attempts: number;
  gameVersion: number; // Expected game version when move was made
}

/**
 * Multiplayer Synchronization Manager
 * Coordinates real-time game synchronization
 */
export class MultiplayerSyncManager {
  private static instance: MultiplayerSyncManager | null = null;
  private connections = new Map<string, PlayerConnection>();
  private activeGames = new Set<string>();
  
  private constructor() {}
  
  static getInstance(): MultiplayerSyncManager {
    if (!MultiplayerSyncManager.instance) {
      MultiplayerSyncManager.instance = new MultiplayerSyncManager();
    }
    return MultiplayerSyncManager.instance;
  }

  /**
   * Register a player connection for a game
   */
  registerConnection(connection: PlayerConnection): void {
    this.connections.set(connection.connectionId, connection);
    this.activeGames.add(connection.gameId);
    
    console.log(`Player connected: ${connection.connectionId} to game ${connection.gameId}`);
  }

  /**
   * Remove a player connection
   */
  removeConnection(connectionId: string): PlayerConnection | null {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      
      // Check if this was the last connection for the game
      const gameConnections = Array.from(this.connections.values())
        .filter(c => c.gameId === connection.gameId);
      
      if (gameConnections.length === 0) {
        this.activeGames.delete(connection.gameId);
      }
      
      console.log(`Player disconnected: ${connectionId} from game ${connection.gameId}`);
    }
    
    return connection;
  }

  /**
   * Get all connections for a specific game
   */
  getGameConnections(gameId: string): PlayerConnection[] {
    return Array.from(this.connections.values())
      .filter(connection => connection.gameId === gameId);
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): PlayerConnection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(
    connectionId: string, 
    status: PlayerConnection["status"],
    ping?: number
  ): boolean {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = status;
      connection.lastPing = new Date();
      
      // Emit connection status event
      this.emitSSEEvent(connection.gameId, {
        type: "CONNECTION_STATUS",
        data: {
          gameId: connection.gameId,
          playerId: connection.playerId,
          status,
          timestamp: new Date(),
          ping,
        },
      });
      
      return true;
    }
    return false;
  }

  /**
   * Emit game move event to all connected players
   */
  emitGameMoveEvent(gameId: string, event: GameMoveEvent["data"]): void {
    const moveEvent: GameMoveEvent = {
      type: "GAME_MOVE",
      data: event,
    };
    
    this.emitSSEEvent(gameId, moveEvent);
  }

  /**
   * Emit player joined event
   */
  emitPlayerJoinedEvent(gameId: string, event: PlayerJoinedEvent["data"]): void {
    const joinEvent: PlayerJoinedEvent = {
      type: "PLAYER_JOINED",
      data: event,
    };
    
    this.emitSSEEvent(gameId, joinEvent);
  }

  /**
   * Emit player left event
   */
  emitPlayerLeftEvent(gameId: string, event: PlayerLeftEvent["data"]): void {
    const leftEvent: PlayerLeftEvent = {
      type: "PLAYER_LEFT",
      data: event,
    };
    
    this.emitSSEEvent(gameId, leftEvent);
  }

  /**
   * Emit game state synchronization event
   */
  emitGameStateSyncEvent(gameId: string, event: GameStateSync["data"]): void {
    const syncEvent: GameStateSync = {
      type: "GAME_STATE_SYNC",
      data: event,
    };
    
    this.emitSSEEvent(gameId, syncEvent);
  }

  /**
   * Generic SSE event emission (placeholder)
   * In a real implementation, this would interface with the SSE system
   */
  private emitSSEEvent(gameId: string, event: MultiplayerSSEEvent): void {
    const connections = this.getGameConnections(gameId);
    
    // Log the event for now - in production this would emit to actual SSE connections
    console.log(`SSE Event [${event.type}] for game ${gameId}:`, event.data);
    console.log(`Would notify ${connections.length} connections`);
    
    // TODO: Integrate with actual SSE notification system
    // This would typically:
    // 1. Get active SSE connections for each player in the game
    // 2. Send the event to each connection
    // 3. Handle connection errors and cleanup
    // 
    // Example integration:
    // for (const connection of connections) {
    //   await sseNotificationService.sendEvent(
    //     connection.playerId,
    //     {
    //       type: 'multiplayer_game_event',
    //       data: { gameId, event }
    //     }
    //   );
    // }
  }

  /**
   * Handle move conflicts when multiple players try to move simultaneously
   */
  resolveMoveConflict(
    gameId: string,
    conflictingMoves: QueuedMove[],
    serverGameVersion: number
  ): {
    acceptedMove: QueuedMove | null;
    rejectedMoves: QueuedMove[];
  } {
    if (conflictingMoves.length === 0) {
      return { acceptedMove: null, rejectedMoves: [] };
    }

    // Sort by timestamp - first move wins
    const sortedMoves = [...conflictingMoves].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const acceptedMove = sortedMoves[0];
    const rejectedMoves = sortedMoves.slice(1);

    // Emit conflict resolution event
    this.emitGameStateSyncEvent(gameId, {
      gameId,
      gameVersion: serverGameVersion,
      syncType: "CONFLICT_RESOLUTION",
      gameState: {
        board: "", // Would be populated with actual board state
        currentPlayer: "red", // Would be populated with actual current player
        moveCount: 0, // Would be populated with actual move count
        winner: null,
        version: serverGameVersion,
      },
      timestamp: new Date(),
    });

    console.log(
      `Move conflict resolved for game ${gameId}: accepted move from ${acceptedMove.playerId}, rejected ${rejectedMoves.length} moves`
    );

    return { acceptedMove, rejectedMoves };
  }

  /**
   * Check for stale connections and clean them up
   */
  cleanupStaleConnections(): number {
    const now = new Date();
    const timeout = SYNC_CONSTANTS.CONNECTION_TIMEOUT;
    let cleaned = 0;

    for (const [connectionId, connection] of this.connections.entries()) {
      const timeSinceLastPing = now.getTime() - connection.lastPing.getTime();
      
      if (timeSinceLastPing > timeout) {
        console.log(`Cleaning up stale connection: ${connectionId}`);
        this.removeConnection(connectionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get synchronization statistics
   */
  getSyncStats(): {
    activeGames: number;
    totalConnections: number;
    connectionsByGame: Record<string, number>;
  } {
    const connectionsByGame: Record<string, number> = {};
    
    for (const connection of this.connections.values()) {
      connectionsByGame[connection.gameId] = 
        (connectionsByGame[connection.gameId] || 0) + 1;
    }

    return {
      activeGames: this.activeGames.size,
      totalConnections: this.connections.size,
      connectionsByGame,
    };
  }
}

// Server-side utilities for move synchronization
export class ServerSyncUtils {
  /**
   * Generate a unique connection ID for tracking
   */
  static generateConnectionId(gameId: string, playerId: string | null): string {
    const timestamp = Date.now();
    const playerPart = playerId ? playerId.slice(-6) : "guest";
    return `${gameId.slice(-6)}_${playerPart}_${timestamp}`;
  }

  /**
   * Validate move synchronization data
   */
  static validateSyncData(data: {
    gameId: string;
    gameVersion: number;
    move: any;
  }): boolean {
    return (
      typeof data.gameId === "string" &&
      typeof data.gameVersion === "number" &&
      data.gameVersion >= 0 &&
      data.move &&
      typeof data.move === "object"
    );
  }

  /**
   * Calculate exponential backoff delay for retries
   */
  static calculateRetryDelay(attemptNumber: number): number {
    return Math.min(
      SYNC_CONSTANTS.RETRY_DELAY_BASE * Math.pow(2, attemptNumber),
      10000 // Max 10 seconds
    );
  }

  /**
   * Check if a game version conflict exists
   */
  static hasVersionConflict(
    clientVersion: number,
    serverVersion: number
  ): boolean {
    return clientVersion < serverVersion;
  }
}

// Client-side utilities for offline queue management
export class ClientSyncUtils {
  private static readonly QUEUE_STORAGE_KEY = "checkers_move_queue";

  /**
   * Add move to offline queue
   */
  static queueMoveOffline(queuedMove: QueuedMove): boolean {
    if (typeof window === "undefined") return false;

    try {
      const existing = this.getOfflineQueue();
      
      // Prevent queue from growing too large
      if (existing.length >= SYNC_CONSTANTS.MAX_PENDING_MOVES) {
        console.warn("Move queue is full, removing oldest move");
        existing.shift();
      }

      existing.push(queuedMove);
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(existing));
      return true;
    } catch (error) {
      console.error("Failed to queue move offline:", error);
      return false;
    }
  }

  /**
   * Get all queued offline moves
   */
  static getOfflineQueue(): QueuedMove[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (!stored) return [];

      const queue = JSON.parse(stored) as QueuedMove[];
      
      // Convert date strings back to Date objects
      return queue.map(move => ({
        ...move,
        timestamp: new Date(move.timestamp),
      }));
    } catch (error) {
      console.error("Failed to load offline move queue:", error);
      return [];
    }
  }

  /**
   * Remove moves from offline queue
   */
  static removeFromQueue(moveIds: string[]): boolean {
    if (typeof window === "undefined") return false;

    try {
      const queue = this.getOfflineQueue();
      const filtered = queue.filter(move => !moveIds.includes(move.id));
      
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error("Failed to update move queue:", error);
      return false;
    }
  }

  /**
   * Clear entire offline queue
   */
  static clearOfflineQueue(): boolean {
    if (typeof window === "undefined") return false;

    try {
      localStorage.removeItem(this.QUEUE_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Failed to clear move queue:", error);
      return false;
    }
  }
}

// Export singleton instance
export const multiplayerSyncManager = MultiplayerSyncManager.getInstance();