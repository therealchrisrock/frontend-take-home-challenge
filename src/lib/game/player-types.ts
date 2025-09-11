import { type PieceColor } from "./logic";

export interface PlayerStats {
  wins: number;
  draws: number;
  losses: number;
  rating?: number;
}

export interface PlayerInfo {
  id?: string;
  name: string;
  avatar?: string;
  stats?: PlayerStats;
  isAI?: boolean;
  aiDifficulty?: "easy" | "medium" | "hard" | "expert";
  isCurrentUser?: boolean;
  isGuest?: boolean;
  color?: PieceColor;
}

export interface GamePlayers {
  red: PlayerInfo;
  black: PlayerInfo;
}

/**
 * Create default player info for AI opponents
 */
export function createAIPlayer(
  difficulty: "easy" | "medium" | "hard" | "expert" = "medium",
  color: PieceColor,
): PlayerInfo {
  const aiNames = {
    easy: "AI Player",
    medium: "AI Player",
    hard: "AI Player",
    expert: "AI Player",
  };

  const aiStats = {
    easy: { wins: 245, draws: 12, losses: 183, rating: 1200 },
    medium: { wins: 487, draws: 23, losses: 120, rating: 1500 },
    hard: { wins: 892, draws: 45, losses: 63, rating: 1800 },
    expert: { wins: 1247, draws: 78, losses: 25, rating: 2200 },
  };

  return {
    id: `ai-${difficulty}`,
    name: aiNames[difficulty],
    stats: aiStats[difficulty],
    isAI: true,
    aiDifficulty: difficulty,
    isCurrentUser: false,
    color,
  };
}

/**
 * Create default player info for human players
 */
export function createHumanPlayer(
  name = "Player",
  color: PieceColor,
  isCurrentUser = false,
): PlayerInfo {
  return {
    id: `player-${color}`,
    name,
    stats: { wins: 0, draws: 0, losses: 0, rating: 1000 },
    isAI: false,
    isCurrentUser,
    color,
  };
}

/**
 * Create guest/anonymous player
 */
export function createGuestPlayer(color: PieceColor): PlayerInfo {
  return {
    id: `guest-${color}`,
    name: `Guest ${color === "red" ? "Red" : "Black"}`,
    stats: undefined, // No stats for guests
    isAI: false,
    isCurrentUser: false,
    color,
  };
}

/**
 * Create default players for local games
 */
export function createLocalGamePlayers(): GamePlayers {
  return {
    red: createHumanPlayer("Player 1", "red", true),
    black: createHumanPlayer("Player 2", "black", false),
  };
}

/**
 * Create players for AI games
 */
export function createAIGamePlayers(
  difficulty: "easy" | "medium" | "hard" | "expert" = "medium",
  playerName = "You",
): GamePlayers {
  return {
    red: createHumanPlayer(playerName, "red", true),
    black: createAIPlayer(difficulty, "black"),
  };
}

/**
 * Get player by color from GamePlayers
 */
export function getPlayerByColor(
  players: GamePlayers,
  color: PieceColor,
): PlayerInfo {
  return players[color];
}

/**
 * Get opponent by color from GamePlayers
 */
export function getOpponentByColor(
  players: GamePlayers,
  color: PieceColor,
): PlayerInfo {
  return color === "red" ? players.black : players.red;
}

/**
 * Create fallback player when player info is missing or invalid
 */
export function createFallbackPlayer(
  color: PieceColor,
  originalName?: string,
  isAI?: boolean,
): PlayerInfo {
  if (isAI) {
    return createAIPlayer("medium", color);
  }

  return {
    id: `fallback-${color}`,
    name: originalName || `${color === "red" ? "Red" : "Black"} Player`,
    stats: undefined,
    isAI: false,
    isCurrentUser: false,
    color,
  };
}

/**
 * Validate and sanitize player info, providing fallbacks for missing data
 */
export function sanitizePlayerInfo(
  player: Partial<PlayerInfo>,
  color: PieceColor,
): PlayerInfo {
  // Provide fallback for missing or invalid player info
  if (!player || typeof player !== "object") {
    return createFallbackPlayer(color);
  }

  // Ensure required fields are present
  const sanitized: PlayerInfo = {
    id: player.id || `player-${color}-${Date.now()}`,
    name:
      player.name && typeof player.name === "string" && player.name.trim()
        ? player.name.trim()
        : `${color === "red" ? "Red" : "Black"} Player`,
    avatar:
      player.avatar && typeof player.avatar === "string"
        ? player.avatar
        : undefined,
    stats:
      player.stats && typeof player.stats === "object"
        ? {
            wins: Math.max(0, Number(player.stats.wins) || 0),
            draws: Math.max(0, Number(player.stats.draws) || 0),
            losses: Math.max(0, Number(player.stats.losses) || 0),
            rating:
              player.stats.rating && Number(player.stats.rating) > 0
                ? Number(player.stats.rating)
                : undefined,
          }
        : undefined,
    isAI: Boolean(player.isAI),
    aiDifficulty:
      player.isAI && player.aiDifficulty ? player.aiDifficulty : undefined,
    isCurrentUser: Boolean(player.isCurrentUser),
    color,
  };

  return sanitized;
}
