import type { PieceColor } from "./logic";

export interface BoardOrientation {
  playerColor: PieceColor;
  rotated: boolean;
  bottomRows: number[];
  topRows: number[];
}

export interface PlayerRole {
  userId?: string;
  guestId?: string;
  color: PieceColor;
  isActivePlayer: boolean;
  isSpectator: boolean;
  joinOrder: number;
}

/**
 * Calculate board orientation based on player's assigned color
 * Each player should see their pieces at the bottom of the board
 */
export function calculateBoardOrientation(
  playerColor: PieceColor,
  boardSize = 8
): BoardOrientation {
  const isBlackPlayer = playerColor === "black";
  
  return {
    playerColor,
    rotated: isBlackPlayer, // BLACK player sees rotated board (180°)
    bottomRows: isBlackPlayer 
      ? [0, 1, 2] // BLACK player sees rows 0-2 at bottom
      : [boardSize - 3, boardSize - 2, boardSize - 1], // RED player sees rows 5-7 at bottom
    topRows: isBlackPlayer
      ? [boardSize - 3, boardSize - 2, boardSize - 1] // BLACK player sees rows 5-7 at top  
      : [0, 1, 2] // RED player sees rows 0-2 at top
  };
}

/**
 * Determine player roles based on join order
 * First 2 users become active players (RED and BLACK)
 * Additional users become spectators
 */
export function assignPlayerRoles(
  users: Array<{ userId?: string; guestId?: string; joinedAt: Date }>
): PlayerRole[] {
  // Sort by join time to determine order
  const sortedUsers = [...users].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  
  return sortedUsers.map((user, index) => {
    const isActivePlayer = index < 2;
    const color: PieceColor = index === 0 ? "red" : "black";
    
    return {
      userId: user.userId,
      guestId: user.guestId,
      color: isActivePlayer ? color : "red", // Default color for spectators
      isActivePlayer,
      isSpectator: !isActivePlayer,
      joinOrder: index
    };
  });
}

/**
 * Get the player role for a specific user/guest
 */
export function getPlayerRole(
  playerRoles: PlayerRole[],
  userId?: string,
  guestId?: string
): PlayerRole | null {
  return playerRoles.find(role => 
    (userId && role.userId === userId) || 
    (guestId && role.guestId === guestId)
  ) ?? null;
}

/**
 * Check if a user has permission to make moves
 * Only active players (first 2 to join) can make moves
 * Spectators can only observe
 */
export function canMakeMove(
  playerRole: PlayerRole | null,
  currentTurnColor: PieceColor
): boolean {
  if (!playerRole || !playerRole.isActivePlayer) {
    return false;
  }
  
  return playerRole.color === currentTurnColor;
}

/**
 * Get active players (those who can make moves)
 */
export function getActivePlayers(playerRoles: PlayerRole[]): PlayerRole[] {
  return playerRoles.filter(role => role.isActivePlayer);
}

/**
 * Get spectators (those who can only observe)
 */
export function getSpectators(playerRoles: PlayerRole[]): PlayerRole[] {
  return playerRoles.filter(role => role.isSpectator);
}

/**
 * Transform board position coordinates for different orientations
 * Used when rendering the board from different player perspectives
 */
export function transformPosition(
  position: { row: number; col: number },
  orientation: BoardOrientation,
  boardSize = 8
): { row: number; col: number } {
  if (!orientation.rotated) {
    return position;
  }
  
  // 180° rotation: flip both row and column
  return {
    row: boardSize - 1 - position.row,
    col: boardSize - 1 - position.col
  };
}

/**
 * Get board orientation for the current viewer
 * Handles both authenticated users and guests
 */
export function getBoardOrientationForViewer(
  playerRoles: PlayerRole[],
  viewerId?: string,
  guestId?: string,
  boardSize = 8
): BoardOrientation {
  const viewerRole = getPlayerRole(playerRoles, viewerId, guestId);
  
  // Default to RED perspective for spectators or unknown viewers
  const playerColor = viewerRole?.isActivePlayer ? viewerRole.color : "red";
  
  return calculateBoardOrientation(playerColor, boardSize);
}