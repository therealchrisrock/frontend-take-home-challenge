/**
 * Guest Session Management Utilities
 * 
 * Handles guest user sessions for multiplayer games, including:
 * - Guest ID generation and validation
 * - Guest session tracking
 * - Guest-to-account conversion procedures
 * - Guest game history persistence
 */

import { nanoid } from "nanoid";

// Constants for guest session management
export const GUEST_SESSION_CONSTANTS = {
  ID_LENGTH: 16,
  SESSION_EXPIRY_HOURS: 24,
  MAX_GUEST_NAME_LENGTH: 20,
  MIN_GUEST_NAME_LENGTH: 1,
  STORAGE_KEY_PREFIX: "checkers_guest_",
  HISTORY_STORAGE_KEY: "checkers_guest_history",
} as const;

// Types for guest session data
export interface GuestSessionData {
  id: string;
  displayName: string;
  createdAt: Date;
  lastActive: Date;
  gameHistory: GuestGameRecord[];
  tempUserId?: string; // For conversion tracking
}

export interface GuestGameRecord {
  gameId: string;
  role: "PLAYER_1" | "PLAYER_2" | "SPECTATOR";
  startedAt: Date;
  endedAt?: Date;
  result?: "won" | "lost" | "draw";
  opponentName?: string;
  moveCount: number;
}

export interface GuestConversionData {
  guestSessionId: string;
  gameHistory: GuestGameRecord[];
  displayName: string;
  email?: string;
  username?: string;
}

/**
 * Guest Session Manager Class
 * Handles all guest session operations
 */
export class GuestSessionManager {
  private static instance: GuestSessionManager | null = null;
  
  private constructor() {}
  
  static getInstance(): GuestSessionManager {
    if (!GuestSessionManager.instance) {
      GuestSessionManager.instance = new GuestSessionManager();
    }
    return GuestSessionManager.instance;
  }

  /**
   * Generate a new guest session ID
   */
  generateGuestId(): string {
    return `guest_${nanoid(GUEST_SESSION_CONSTANTS.ID_LENGTH)}`;
  }

  /**
   * Validate guest session ID format
   */
  isValidGuestId(guestId: string): boolean {
    return /^guest_[A-Za-z0-9_-]{16}$/.test(guestId);
  }

  /**
   * Create a new guest session
   */
  createGuestSession(displayName: string): GuestSessionData {
    if (!this.isValidDisplayName(displayName)) {
      throw new Error("Invalid display name");
    }

    const session: GuestSessionData = {
      id: this.generateGuestId(),
      displayName: displayName.trim(),
      createdAt: new Date(),
      lastActive: new Date(),
      gameHistory: [],
    };

    // Store in localStorage if available (client-side)
    if (typeof window !== "undefined" && window.localStorage) {
      this.saveGuestSession(session);
    }

    return session;
  }

  /**
   * Load guest session from localStorage
   */
  loadGuestSession(guestId: string): GuestSessionData | null {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    try {
      const stored = localStorage.getItem(
        GUEST_SESSION_CONSTANTS.STORAGE_KEY_PREFIX + guestId
      );
      
      if (!stored) return null;
      
      const session = JSON.parse(stored) as GuestSessionData;
      
      // Convert date strings back to Date objects
      session.createdAt = new Date(session.createdAt);
      session.lastActive = new Date(session.lastActive);
      session.gameHistory = session.gameHistory.map(game => ({
        ...game,
        startedAt: new Date(game.startedAt),
        endedAt: game.endedAt ? new Date(game.endedAt) : undefined,
      }));
      
      // Check if session has expired
      const expiry = new Date(session.lastActive);
      expiry.setHours(expiry.getHours() + GUEST_SESSION_CONSTANTS.SESSION_EXPIRY_HOURS);
      
      if (new Date() > expiry) {
        this.clearGuestSession(guestId);
        return null;
      }
      
      return session;
    } catch (error) {
      console.error("Failed to load guest session:", error);
      return null;
    }
  }

  /**
   * Save guest session to localStorage
   */
  saveGuestSession(session: GuestSessionData): boolean {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    try {
      session.lastActive = new Date();
      localStorage.setItem(
        GUEST_SESSION_CONSTANTS.STORAGE_KEY_PREFIX + session.id,
        JSON.stringify(session)
      );
      return true;
    } catch (error) {
      console.error("Failed to save guest session:", error);
      return false;
    }
  }

  /**
   * Update guest session activity timestamp
   */
  updateGuestActivity(guestId: string): boolean {
    const session = this.loadGuestSession(guestId);
    if (!session) return false;
    
    return this.saveGuestSession(session);
  }

  /**
   * Add game record to guest session history
   */
  addGameToHistory(guestId: string, gameRecord: GuestGameRecord): boolean {
    const session = this.loadGuestSession(guestId);
    if (!session) return false;

    // Prevent duplicate entries
    const existingIndex = session.gameHistory.findIndex(
      game => game.gameId === gameRecord.gameId
    );
    
    if (existingIndex >= 0) {
      session.gameHistory[existingIndex] = gameRecord;
    } else {
      session.gameHistory.push(gameRecord);
    }
    
    // Keep only last 50 games to prevent storage bloat
    if (session.gameHistory.length > 50) {
      session.gameHistory = session.gameHistory
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 50);
    }
    
    return this.saveGuestSession(session);
  }

  /**
   * Update game result in guest session history
   */
  updateGameResult(
    guestId: string,
    gameId: string,
    result: "won" | "lost" | "draw",
    endedAt?: Date
  ): boolean {
    const session = this.loadGuestSession(guestId);
    if (!session) return false;

    const gameIndex = session.gameHistory.findIndex(
      game => game.gameId === gameId
    );
    
    if (gameIndex >= 0) {
      session.gameHistory[gameIndex] = {
        ...session.gameHistory[gameIndex],
        result,
        endedAt: endedAt || new Date(),
      };
      return this.saveGuestSession(session);
    }
    
    return false;
  }

  /**
   * Get guest session statistics
   */
  getGuestStats(guestId: string): {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  } | null {
    const session = this.loadGuestSession(guestId);
    if (!session) return null;

    const finishedGames = session.gameHistory.filter(game => game.result);
    const wins = finishedGames.filter(game => game.result === "won").length;
    const losses = finishedGames.filter(game => game.result === "lost").length;
    const draws = finishedGames.filter(game => game.result === "draw").length;
    const total = wins + losses + draws;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    return {
      gamesPlayed: total,
      wins,
      losses,
      draws,
      winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Prepare guest data for account conversion
   */
  prepareConversionData(guestId: string): GuestConversionData | null {
    const session = this.loadGuestSession(guestId);
    if (!session) return null;

    return {
      guestSessionId: session.id,
      gameHistory: session.gameHistory,
      displayName: session.displayName,
    };
  }

  /**
   * Clear guest session from storage
   */
  clearGuestSession(guestId: string): boolean {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    try {
      localStorage.removeItem(GUEST_SESSION_CONSTANTS.STORAGE_KEY_PREFIX + guestId);
      return true;
    } catch (error) {
      console.error("Failed to clear guest session:", error);
      return false;
    }
  }

  /**
   * Clean up expired guest sessions
   */
  cleanupExpiredSessions(): number {
    if (typeof window === "undefined" || !window.localStorage) {
      return 0;
    }

    let cleaned = 0;
    const prefix = GUEST_SESSION_CONSTANTS.STORAGE_KEY_PREFIX;
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        const guestId = key.substring(prefix.length);
        const session = this.loadGuestSession(guestId);
        
        // loadGuestSession will automatically clear expired sessions
        if (!session) {
          cleaned++;
        }
      }
    }
    
    return cleaned;
  }

  /**
   * Validate guest display name
   */
  private isValidDisplayName(displayName: string): boolean {
    if (typeof displayName !== "string") return false;
    
    const trimmed = displayName.trim();
    return (
      trimmed.length >= GUEST_SESSION_CONSTANTS.MIN_GUEST_NAME_LENGTH &&
      trimmed.length <= GUEST_SESSION_CONSTANTS.MAX_GUEST_NAME_LENGTH &&
      /^[a-zA-Z0-9\s\-_\.]+$/.test(trimmed) // Allow alphanumeric, spaces, hyphens, underscores, dots
    );
  }
}

// Server-side utilities for guest session validation
export class ServerGuestSessionUtils {
  /**
   * Validate guest session data on server
   */
  static validateGuestSession(guestData: {
    id: string;
    displayName: string;
  }): boolean {
    const manager = GuestSessionManager.getInstance();
    
    return (
      manager.isValidGuestId(guestData.id) &&
      typeof guestData.displayName === "string" &&
      guestData.displayName.trim().length >= GUEST_SESSION_CONSTANTS.MIN_GUEST_NAME_LENGTH &&
      guestData.displayName.trim().length <= GUEST_SESSION_CONSTANTS.MAX_GUEST_NAME_LENGTH
    );
  }

  /**
   * Generate server-side guest tracking ID
   */
  static generateServerGuestId(): string {
    return `guest_server_${nanoid(12)}_${Date.now()}`;
  }

  /**
   * Convert guest game history to user account
   * This would be called during account creation process
   */
  static async convertGuestHistoryToUser(
    conversionData: GuestConversionData,
    newUserId: string,
    db: any // Database client
  ): Promise<boolean> {
    try {
      // This is a placeholder for the conversion logic
      // In a real implementation, you would:
      // 1. Create user account records for guest games
      // 2. Update game records to link to new user ID
      // 3. Preserve statistics and achievements
      // 4. Clean up guest session data

      console.log("Converting guest history:", {
        guestId: conversionData.guestSessionId,
        newUserId,
        gameCount: conversionData.gameHistory.length,
      });

      return true;
    } catch (error) {
      console.error("Failed to convert guest history:", error);
      return false;
    }
  }
}

// Export singleton instance
export const guestSessionManager = GuestSessionManager.getInstance();