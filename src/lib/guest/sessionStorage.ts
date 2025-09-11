import { multiplayerStorage } from "../multiplayer/indexedDbStorage";
import type { GuestSession } from "../multiplayer/indexedDbStorage";

export interface GuestProfile {
  guestId: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  gamesPlayed: number;
  currentGameId?: string;
  preferences: {
    soundEnabled: boolean;
    showMoveHints: boolean;
    autoPromoteToQueen: boolean;
  };
}

export interface GuestGameRecord {
  gameId: string;
  result: "win" | "loss" | "draw" | "ongoing" | "abandoned";
  color: "red" | "black";
  opponent: string;
  playedAt: Date;
  moveCount: number;
}

const GUEST_SESSION_KEY = "checkers_guest_session";
const GUEST_PREFERENCES_KEY = "checkers_guest_preferences";
const GUEST_GAME_HISTORY_KEY = "checkers_guest_history";

/**
 * Manager for guest user sessions and data persistence
 */
export class GuestSessionManager {
  private currentGuestId: string | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Try to restore existing session from localStorage
      const storedSession = localStorage.getItem(GUEST_SESSION_KEY);
      if (storedSession) {
        const { guestId, expiresAt } = JSON.parse(storedSession);
        
        // Check if session is still valid (24 hours)
        if (Date.now() < expiresAt) {
          this.currentGuestId = guestId;
        } else {
          // Session expired, clean up
          localStorage.removeItem(GUEST_SESSION_KEY);
        }
      }
    } catch (error) {
      console.warn("Failed to restore guest session:", error);
      localStorage.removeItem(GUEST_SESSION_KEY);
    }
    
    this.isInitialized = true;
  }

  /**
   * Create a new guest session for a game
   */
  async createGuestSession(gameId: string, displayName?: string): Promise<string> {
    await this.initialize();
    
    const defaultName = displayName ?? `Guest${Math.floor(Math.random() * 1000)}`;
    
    try {
      // Create session in IndexedDB
      const guestId = await multiplayerStorage.createGuestSession(gameId, defaultName);
      
      // Store session info in localStorage for quick access
      const sessionData = {
        guestId,
        displayName: defaultName,
        createdAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        currentGameId: gameId
      };
      
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(sessionData));
      
      // Create default preferences
      const defaultPreferences = {
        soundEnabled: true,
        showMoveHints: true,
        autoPromoteToQueen: false
      };
      
      localStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(defaultPreferences));
      
      this.currentGuestId = guestId;
      
      return guestId;
    } catch (error) {
      console.error("Failed to create guest session:", error);
      throw new Error("Could not create guest session");
    }
  }

  /**
   * Get current guest ID
   */
  getCurrentGuestId(): string | null {
    return this.currentGuestId;
  }

  /**
   * Get guest profile information
   */
  async getGuestProfile(): Promise<GuestProfile | null> {
    await this.initialize();
    
    if (!this.currentGuestId) return null;
    
    try {
      const session = await multiplayerStorage.getGuestSession(this.currentGuestId);
      if (!session) return null;
      
      const preferences = this.getGuestPreferences();
      const gameHistory = this.getGuestGameHistory();
      
      return {
        guestId: session.guestId,
        displayName: session.displayName,
        createdAt: new Date(session.createdAt),
        gamesPlayed: gameHistory.length,
        currentGameId: session.gameId,
        preferences
      };
    } catch (error) {
      console.error("Failed to get guest profile:", error);
      return null;
    }
  }

  /**
   * Update guest display name
   */
  async updateDisplayName(newName: string): Promise<void> {
    if (!this.currentGuestId) throw new Error("No active guest session");
    
    try {
      const session = await multiplayerStorage.getGuestSession(this.currentGuestId);
      if (session) {
        session.displayName = newName;
        
        // Update localStorage
        const sessionData = JSON.parse(localStorage.getItem(GUEST_SESSION_KEY) ?? "{}");
        sessionData.displayName = newName;
        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error("Failed to update display name:", error);
      throw new Error("Could not update display name");
    }
  }

  /**
   * Get guest preferences
   */
  getGuestPreferences(): GuestProfile["preferences"] {
    try {
      const stored = localStorage.getItem(GUEST_PREFERENCES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load guest preferences:", error);
    }
    
    return {
      soundEnabled: true,
      showMoveHints: true,
      autoPromoteToQueen: false
    };
  }

  /**
   * Update guest preferences
   */
  updateGuestPreferences(preferences: Partial<GuestProfile["preferences"]>): void {
    const current = this.getGuestPreferences();
    const updated = { ...current, ...preferences };
    
    try {
      localStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save guest preferences:", error);
    }
  }

  /**
   * Record a game result in guest history
   */
  recordGameResult(gameRecord: GuestGameRecord): void {
    try {
      const history = this.getGuestGameHistory();
      
      // Remove any existing record for this game
      const filteredHistory = history.filter(record => record.gameId !== gameRecord.gameId);
      
      // Add new record
      filteredHistory.push({
        ...gameRecord,
        playedAt: new Date(gameRecord.playedAt)
      });
      
      // Keep only last 50 games
      const limitedHistory = filteredHistory
        .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime())
        .slice(0, 50);
      
      // Serialize dates for storage
      const serializedHistory = limitedHistory.map(record => ({
        ...record,
        playedAt: record.playedAt.toISOString()
      }));
      
      localStorage.setItem(GUEST_GAME_HISTORY_KEY, JSON.stringify(serializedHistory));
      
      // Also add to IndexedDB game history
      if (this.currentGuestId) {
        multiplayerStorage.addGameToGuestHistory(this.currentGuestId, gameRecord.gameId).catch(console.error);
      }
    } catch (error) {
      console.error("Failed to record game result:", error);
    }
  }

  /**
   * Get guest game history
   */
  getGuestGameHistory(): GuestGameRecord[] {
    try {
      const stored = localStorage.getItem(GUEST_GAME_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((record: any) => ({
          ...record,
          playedAt: new Date(record.playedAt)
        }));
      }
    } catch (error) {
      console.warn("Failed to load guest game history:", error);
    }
    
    return [];
  }

  /**
   * Get guest statistics
   */
  getGuestStats(): {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  } {
    const history = this.getGuestGameHistory().filter(game => 
      game.result !== "ongoing" && game.result !== "abandoned"
    );
    
    const wins = history.filter(game => game.result === "win").length;
    const losses = history.filter(game => game.result === "loss").length;
    const draws = history.filter(game => game.result === "draw").length;
    const totalGames = wins + losses + draws;
    
    return {
      totalGames,
      wins,
      losses,
      draws,
      winRate: totalGames > 0 ? wins / totalGames : 0
    };
  }

  /**
   * Join a new game as a guest
   */
  async joinGame(gameId: string): Promise<void> {
    if (!this.currentGuestId) {
      throw new Error("No active guest session");
    }
    
    try {
      await multiplayerStorage.addGameToGuestHistory(this.currentGuestId, gameId);
      
      // Update current game in localStorage
      const sessionData = JSON.parse(localStorage.getItem(GUEST_SESSION_KEY) ?? "{}");
      sessionData.currentGameId = gameId;
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error("Failed to join game:", error);
      throw new Error("Could not join game");
    }
  }

  /**
   * Check if current session is valid
   */
  isValidSession(): boolean {
    return this.currentGuestId !== null;
  }

  /**
   * Clear guest session and all data
   */
  clearSession(): void {
    this.currentGuestId = null;
    localStorage.removeItem(GUEST_SESSION_KEY);
    localStorage.removeItem(GUEST_PREFERENCES_KEY);
    localStorage.removeItem(GUEST_GAME_HISTORY_KEY);
  }

  /**
   * Convert guest data for account creation
   * Returns data that should be transferred to a new user account
   */
  exportGuestDataForConversion(): {
    displayName: string;
    preferences: GuestProfile["preferences"];
    gameHistory: GuestGameRecord[];
    stats: ReturnType<typeof this.getGuestStats>;
  } {
    return {
      displayName: JSON.parse(localStorage.getItem(GUEST_SESSION_KEY) ?? "{}")?.displayName ?? "",
      preferences: this.getGuestPreferences(),
      gameHistory: this.getGuestGameHistory(),
      stats: this.getGuestStats()
    };
  }

  /**
   * Generate a shareable guest name
   */
  static generateGuestName(): string {
    const adjectives = ["Quick", "Smart", "Bold", "Swift", "Clever", "Sharp", "Fast", "Wise"];
    const nouns = ["Player", "Gamer", "Checker", "Master", "Ace", "Pro", "Star", "King"];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 100);
    
    return `${adjective}${noun}${number}`;
  }
}

// Singleton instance
export const guestSessionManager = new GuestSessionManager();