import { useEffect } from "react";
import { useSkin } from "./skin-context";

interface GameStats {
  wins: number;
  losses: number;
  gamesPlayed: number;
  currentStreak: number;
  perfectGames: number;
}

export function useSkinUnlockTracking(stats: GameStats | null) {
  const { checkUnlockCondition, updateProgress } = useSkin();

  useEffect(() => {
    if (!stats) return;

    // Check wins-based unlocks
    checkUnlockCondition("midnight", "wins", stats.wins);
    updateProgress("midnight", stats.wins);

    // Check games-played unlocks
    checkUnlockCondition("ocean", "games", stats.gamesPlayed);
    updateProgress("ocean", stats.gamesPlayed);

    // Check streak-based unlocks
    checkUnlockCondition("forest", "streak", stats.currentStreak);
    updateProgress("forest", stats.currentStreak);

    // Check achievement-based unlocks
    if (stats.perfectGames > 0) {
      checkUnlockCondition("neon", "achievement", "perfect_game");
    }
  }, [stats, checkUnlockCondition, updateProgress]);
}

export function useGameEndSkinUnlock(
  gameResult: "win" | "loss" | null,
  wasPerfectGame: boolean,
) {
  const { checkUnlockCondition, skinProgress } = useSkin();

  useEffect(() => {
    if (!gameResult) return;

    // Get current stats from localStorage (in a real app, this would come from a database)
    const storedStats = localStorage.getItem("checkers-game-stats");
    let stats: GameStats = {
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      currentStreak: 0,
      perfectGames: 0,
    };

    if (storedStats) {
      try {
        stats = JSON.parse(storedStats) as GameStats;
      } catch (e) {
        console.error("Failed to parse game stats", e);
      }
    }

    // Update stats based on game result
    stats.gamesPlayed++;

    if (gameResult === "win") {
      stats.wins++;
      stats.currentStreak++;

      if (wasPerfectGame) {
        stats.perfectGames++;
        // Check perfect game achievement
        checkUnlockCondition("neon", "achievement", "perfect_game");
      }
    } else {
      stats.losses++;
      stats.currentStreak = 0;
    }

    // Save updated stats
    localStorage.setItem("checkers-game-stats", JSON.stringify(stats));

    // Check all unlock conditions with new stats
    checkUnlockCondition("midnight", "wins", stats.wins);
    checkUnlockCondition("ocean", "games", stats.gamesPlayed);
    checkUnlockCondition("forest", "streak", stats.currentStreak);
  }, [gameResult, wasPerfectGame, checkUnlockCondition]);
}

export function useSpecialEventSkins() {
  const { checkUnlockCondition } = useSkin();

  useEffect(() => {
    // Check for seasonal events
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate();

    // Winter holiday season (December)
    if (month === 11) {
      // Auto-unlock holiday skin during December
      checkUnlockCondition("holiday", "code", "HOLIDAY2024");
    }

    // You can add more seasonal checks here
    // Halloween (October)
    // if (month === 9) { ... }

    // Valentine's Day (February 14)
    // if (month === 1 && day === 14) { ... }
  }, [checkUnlockCondition]);
}
