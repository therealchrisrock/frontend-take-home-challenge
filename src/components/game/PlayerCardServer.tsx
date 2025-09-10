import { PlayerCard } from "./PlayerCard";
import { PlayerCardSkeleton } from "./PlayerCardSkeleton";
import { type PieceColor } from "~/lib/game-logic";
import { type PlayerInfo } from "~/lib/player-types";
import { api } from "~/trpc/server";
import { GameVariantEnum, PlayModeEnum } from "@prisma/client";

interface PlayerCardServerProps {
  player: PlayerInfo;
  color: PieceColor;
  position: "top" | "bottom";
  isActive?: boolean;
  className?: string;
  /** Variant for rating lookup */
  variant?: keyof typeof GameVariantEnum;
  /** Play mode for rating lookup */
  playMode?: keyof typeof PlayModeEnum;
}

export async function PlayerCardServer({
  player,
  color,
  position,
  isActive = false,
  className = "",
  variant = "AMERICAN",
  playMode = "CASUAL",
}: PlayerCardServerProps) {
  try {
    // Only fetch server data for non-AI players with IDs
    if (player.isAI || !player.id) {
      return (
        <PlayerCard
          player={player}
          color={color}
          position={position}
          isActive={isActive}
          className={className}
        />
      );
    }

    // Use the server-side tRPC api

    // Fetch player profile data
    let profileData = null;
    let statsData = null;

    try {
      profileData = await api.user.getPlayerProfile({ userId: player.id });
    } catch (error) {
      console.warn("Failed to fetch player profile:", error);
    }

    // Fetch player stats
    try {
      statsData = await api.user.getPlayerStats({
        userId: player.id,
        variant: GameVariantEnum[variant],
        playMode: PlayModeEnum[playMode],
      });
    } catch (error) {
      console.warn("Failed to fetch player stats:", error);
    }

    // Merge server data with client data
    const enhancedPlayer: PlayerInfo = {
      ...player,
      ...(profileData && {
        name: profileData.name ?? player.name,
        avatar: profileData.image ?? player.avatar,
      }),
      ...(statsData && {
        stats: {
          wins: statsData.wins,
          losses: statsData.losses,
          draws: statsData.draws,
          rating: statsData.rating,
        },
      }),
    };

    return (
      <PlayerCard
        player={enhancedPlayer}
        color={color}
        position={position}
        isActive={isActive}
        className={className}
      />
    );
  } catch (error) {
    console.error("Error in PlayerCardServer:", error);

    // Fallback to skeleton on error
    return (
      <PlayerCardSkeleton
        color={color}
        position={position}
        className={className}
      />
    );
  }
}
