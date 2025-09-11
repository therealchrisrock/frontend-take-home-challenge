import type { PieceColor, Move, Position } from "./logic";
import type { GameParticipants, GameRole } from "./playerRoles";

export interface SpectatorPermissions {
  canViewBoard: boolean;
  canViewMoveHistory: boolean;
  canViewPlayerInfo: boolean;
  canViewGameState: boolean;
  canMakeMove: boolean;
  canChat: boolean; // For future chat implementation
}

export interface SpectatorEvent {
  type: "join" | "leave" | "move_attempted" | "permission_denied";
  userId?: string;
  guestId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Get permissions for a spectator or player
 */
export function getPermissions(
  role: GameRole | null,
  currentTurnColor: PieceColor
): SpectatorPermissions {
  if (!role) {
    // Unknown user - limited permissions
    return {
      canViewBoard: true,
      canViewMoveHistory: true,
      canViewPlayerInfo: false,
      canViewGameState: true,
      canMakeMove: false,
      canChat: false
    };
  }

  if (role.isActivePlayer) {
    // Active players have full permissions
    return {
      canViewBoard: true,
      canViewMoveHistory: true,
      canViewPlayerInfo: true,
      canViewGameState: true,
      canMakeMove: role.color === currentTurnColor,
      canChat: true
    };
  }

  // Spectators have view-only permissions
  return {
    canViewBoard: true,
    canViewMoveHistory: true,
    canViewPlayerInfo: true,
    canViewGameState: true,
    canMakeMove: false,
    canChat: true
  };
}

/**
 * Validate if a move attempt is allowed
 */
export function validateMovePermission(
  role: GameRole | null,
  currentTurnColor: PieceColor,
  move: Move
): { allowed: boolean; reason?: string } {
  const permissions = getPermissions(role, currentTurnColor);
  
  if (!permissions.canMakeMove) {
    if (!role) {
      return { allowed: false, reason: "Unknown user cannot make moves" };
    }
    if (role.isSpectator) {
      return { allowed: false, reason: "Spectators cannot make moves" };
    }
    if (role.color !== currentTurnColor) {
      return { allowed: false, reason: "Not your turn" };
    }
  }
  
  return { allowed: true };
}

/**
 * Filter game state based on user permissions
 * Removes sensitive information for spectators/guests
 */
export function filterGameStateForViewer(
  gameState: {
    board: unknown;
    currentPlayer: PieceColor;
    moveHistory: Move[];
    winner: PieceColor | "draw" | null;
    participants: GameParticipants;
  },
  viewerRole: GameRole | null
): Partial<typeof gameState> {
  const permissions = getPermissions(viewerRole, gameState.currentPlayer);
  
  const filtered: Partial<typeof gameState> = {};
  
  if (permissions.canViewBoard) {
    filtered.board = gameState.board;
    filtered.currentPlayer = gameState.currentPlayer;
    filtered.winner = gameState.winner;
  }
  
  if (permissions.canViewMoveHistory) {
    filtered.moveHistory = gameState.moveHistory;
  }
  
  if (permissions.canViewPlayerInfo) {
    filtered.participants = gameState.participants;
  } else {
    // Provide limited participant info for spectators
    filtered.participants = {
      redPlayer: gameState.participants.redPlayer ? {
        ...gameState.participants.redPlayer,
        user: {
          ...gameState.participants.redPlayer.user,
          userId: undefined, // Hide user IDs from spectators
          name: gameState.participants.redPlayer.user.name
        }
      } : undefined,
      blackPlayer: gameState.participants.blackPlayer ? {
        ...gameState.participants.blackPlayer,
        user: {
          ...gameState.participants.blackPlayer.user,
          userId: undefined,
          name: gameState.participants.blackPlayer.user.name
        }
      } : undefined,
      spectators: [], // Hide other spectators
      allParticipants: []
    };
  }
  
  return filtered;
}

/**
 * Create spectator event for logging/analytics
 */
export function createSpectatorEvent(
  type: SpectatorEvent["type"],
  userId?: string,
  guestId?: string,
  metadata?: Record<string, unknown>
): SpectatorEvent {
  return {
    type,
    userId,
    guestId,
    timestamp: new Date(),
    metadata
  };
}

/**
 * Check if position interaction is allowed for viewer
 */
export function canInteractWithPosition(
  position: Position,
  role: GameRole | null,
  currentTurnColor: PieceColor,
  board: unknown[][] // Simplified board type
): boolean {
  const permissions = getPermissions(role, currentTurnColor);
  
  if (!permissions.canMakeMove) {
    return false;
  }
  
  // Additional validation could check if the position contains the player's piece
  // This would require the actual board implementation
  return true;
}

/**
 * Get spectator count from participants
 */
export function getSpectatorCount(participants: GameParticipants): number {
  return participants.spectators.length;
}

/**
 * Check if game is in spectatable state
 */
export function isGameSpectatable(gameState: {
  winner: PieceColor | "draw" | null;
  participants: GameParticipants;
}): boolean {
  // Game is spectatable if:
  // 1. It has at least one active player
  // 2. It's not in an error state
  const hasActivePlayers = gameState.participants.redPlayer || gameState.participants.blackPlayer;
  
  return !!hasActivePlayers;
}

/**
 * Generate spectator view summary for UI
 */
export function getSpectatorViewSummary(
  participants: GameParticipants,
  currentViewerRole: GameRole | null
): {
  isSpectating: boolean;
  activePlayerCount: number;
  spectatorCount: number;
  canParticipate: boolean;
  viewerStatus: "player" | "spectator" | "guest";
} {
  const activePlayerCount = [participants.redPlayer, participants.blackPlayer].filter(Boolean).length;
  const spectatorCount = participants.spectators.length;
  const isSpectating = currentViewerRole?.isSpectator ?? true;
  const canParticipate = activePlayerCount < 2; // Can join as player if less than 2 active
  
  let viewerStatus: "player" | "spectator" | "guest" = "guest";
  if (currentViewerRole) {
    viewerStatus = currentViewerRole.isActivePlayer ? "player" : "spectator";
  }
  
  return {
    isSpectating,
    activePlayerCount,
    spectatorCount,
    canParticipate,
    viewerStatus
  };
}

/**
 * Check if a user can be promoted from spectator to active player
 * This happens when there's an open player slot
 */
export function canPromoteToPlayer(
  participants: GameParticipants,
  spectatorRole: GameRole
): { canPromote: boolean; availableColor?: PieceColor } {
  if (!spectatorRole.isSpectator) {
    return { canPromote: false };
  }
  
  if (!participants.redPlayer) {
    return { canPromote: true, availableColor: "red" };
  }
  
  if (!participants.blackPlayer) {
    return { canPromote: true, availableColor: "black" };
  }
  
  return { canPromote: false };
}