import { type PlayerInfo } from "~/lib/player-types";
import { type PieceColor } from "~/lib/game-logic";

export type AppUser = {
  id: string;
  username?: string;
  name?: string | null;
  image?: string | null;
};

export type PlayerInfoOverrides = Partial<
  Omit<PlayerInfo, "id" | "name" | "avatar" | "color">
> & {
  name?: string | null;
  avatar?: string | null;
};

// Overload for game context (with color)
export function mapUserToPlayerInfo(
  user: AppUser,
  color: PieceColor,
  overrides?: PlayerInfoOverrides,
): PlayerInfo;

// Overload for profile context (without color)
export function mapUserToPlayerInfo(
  user: AppUser | undefined | null,
  overrides?: PlayerInfoOverrides,
): PlayerInfo;

export function mapUserToPlayerInfo(
  user: AppUser | undefined | null,
  colorOrOverrides?: PieceColor | PlayerInfoOverrides,
  overrides: PlayerInfoOverrides = {},
): PlayerInfo {
  // Handle case where user is null/undefined
  if (!user) {
    return {
      id: "anonymous",
      name: "Player",
      avatar: undefined,
      stats: undefined,
      isAI: false,
      isCurrentUser: false,
      isGuest: true,
    };
  }

  // Determine if this is game context (color provided) or profile context
  const isGameContext = typeof colorOrOverrides === "string";
  const color = isGameContext ? colorOrOverrides : undefined;
  const actualOverrides = isGameContext ? overrides : colorOrOverrides! || {};

  const nameBase = (
    actualOverrides.name ??
    user.name ??
    user.username ??
    ""
  ).trim();
  const name =
    nameBase ||
    (color ? `${color === "red" ? "Red" : "Black"} Player` : "Player");

  return {
    id: user.id,
    name,
    avatar: actualOverrides.avatar ?? user.image ?? undefined,
    stats: actualOverrides.stats,
    isAI: actualOverrides.isAI ?? false,
    aiDifficulty: actualOverrides.aiDifficulty,
    isCurrentUser: actualOverrides.isCurrentUser ?? true,
    isGuest: actualOverrides.isGuest ?? false,
    color,
  };
}
