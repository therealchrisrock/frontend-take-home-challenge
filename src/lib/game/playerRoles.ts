import type { PieceColor } from "./logic";

export interface MultiplayerUser {
  userId?: string;
  guestId?: string;
  name: string;
  avatar?: string;
  joinedAt: Date;
  isCurrentUser?: boolean;
}

export interface GameRole {
  user: MultiplayerUser;
  color: PieceColor;
  isActivePlayer: boolean;
  isSpectator: boolean;
  joinOrder: number;
  canMakeMove: boolean;
}

export interface GameParticipants {
  redPlayer?: GameRole;
  blackPlayer?: GameRole;
  spectators: GameRole[];
  allParticipants: GameRole[];
}

/**
 * Assign roles to users based on join order for multiplayer games
 */
export function assignMultiplayerRoles(
  users: MultiplayerUser[],
  currentTurnColor: PieceColor
): GameParticipants {
  // Sort users by join time to determine order
  const sortedUsers = [...users].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  
  const roles: GameRole[] = sortedUsers.map((user, index) => {
    const isActivePlayer = index < 2;
    let color: PieceColor;
    
    if (index === 0) {
      color = "red"; // First joiner gets RED
    } else if (index === 1) {
      color = "black"; // Second joiner gets BLACK
    } else {
      color = "red"; // Spectators default to RED perspective
    }
    
    const canMakeMove = isActivePlayer && color === currentTurnColor;
    
    return {
      user,
      color,
      isActivePlayer,
      isSpectator: !isActivePlayer,
      joinOrder: index,
      canMakeMove
    };
  });
  
  const redPlayer = roles.find(role => role.color === "red" && role.isActivePlayer);
  const blackPlayer = roles.find(role => role.color === "black" && role.isActivePlayer);
  const spectators = roles.filter(role => role.isSpectator);
  
  return {
    redPlayer,
    blackPlayer,
    spectators,
    allParticipants: roles
  };
}

/**
 * Find a participant's role by their ID
 */
export function findParticipantRole(
  participants: GameParticipants,
  userId?: string,
  guestId?: string
): GameRole | null {
  return participants.allParticipants.find(role =>
    (userId && role.user.userId === userId) ||
    (guestId && role.user.guestId === guestId)
  ) ?? null;
}

/**
 * Check if a user can make moves in the current game state
 */
export function canUserMakeMove(
  participants: GameParticipants,
  currentTurnColor: PieceColor,
  userId?: string,
  guestId?: string
): boolean {
  const role = findParticipantRole(participants, userId, guestId);
  if (!role || !role.isActivePlayer) {
    return false;
  }
  
  return role.color === currentTurnColor;
}

/**
 * Get the current active player (whose turn it is)
 */
export function getCurrentActivePlayer(
  participants: GameParticipants,
  currentTurnColor: PieceColor
): GameRole | null {
  return currentTurnColor === "red" ? participants.redPlayer ?? null : participants.blackPlayer ?? null;
}

/**
 * Get the opponent of the current player
 */
export function getOpponentPlayer(
  participants: GameParticipants,
  currentTurnColor: PieceColor
): GameRole | null {
  return currentTurnColor === "red" ? participants.blackPlayer ?? null : participants.redPlayer ?? null;
}

/**
 * Create a guest user for anonymous participation
 */
export function createGuestUser(guestId: string): MultiplayerUser {
  return {
    guestId,
    name: `Guest ${guestId.slice(-4)}`, // Use last 4 chars of ID
    joinedAt: new Date(),
    isCurrentUser: true
  };
}

/**
 * Generate a unique guest ID
 */
export function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Check if user is a guest
 */
export function isGuestUser(user: MultiplayerUser): boolean {
  return !!user.guestId && !user.userId;
}

/**
 * Check if a game has enough players to start
 */
export function canGameStart(participants: GameParticipants): boolean {
  return !!participants.redPlayer && !!participants.blackPlayer;
}

/**
 * Get display name for a user
 */
export function getUserDisplayName(user: MultiplayerUser): string {
  if (user.name) return user.name;
  if (user.userId) return `User ${user.userId.slice(-4)}`;
  if (user.guestId) return `Guest ${user.guestId.slice(-4)}`;
  return "Unknown User";
}

/**
 * Check if two users are the same
 */
export function isSameUser(user1: MultiplayerUser, user2: MultiplayerUser): boolean {
  if (user1.userId && user2.userId) {
    return user1.userId === user2.userId;
  }
  if (user1.guestId && user2.guestId) {
    return user1.guestId === user2.guestId;
  }
  return false;
}

/**
 * Get user's preferred color (if they've played before)
 */
export function getUserPreferredColor(
  user: MultiplayerUser,
  gameHistory?: Array<{ color: PieceColor; result: "win" | "loss" | "draw" }>
): PieceColor | null {
  if (!gameHistory?.length) return null;
  
  // Simple heuristic: prefer color with better win rate
  const colorStats = gameHistory.reduce((acc, game) => {
    if (!acc[game.color]) {
      acc[game.color] = { wins: 0, total: 0 };
    }
    acc[game.color].total++;
    if (game.result === "win") {
      acc[game.color].wins++;
    }
    return acc;
  }, {} as Record<PieceColor, { wins: number; total: number }>);
  
  const redWinRate = colorStats.red ? colorStats.red.wins / colorStats.red.total : 0;
  const blackWinRate = colorStats.black ? colorStats.black.wins / colorStats.black.total : 0;
  
  return redWinRate >= blackWinRate ? "red" : "black";
}