import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Bot, Crown } from "lucide-react";
import { type PieceColor } from "~/lib/game/logic";
import { type PlayerInfo } from "~/lib/game/player-types";
// PlayerCard is strictly the profile display; timers are handled by containers

interface PlayerCardProps {
  player: PlayerInfo;
  color?: PieceColor;
  position?: "top" | "bottom";
  isActive?: boolean;
  className?: string;
  context?: "game" | "profile";
}

const difficultyConfig = {
  easy: { icon: "🟢", label: "Easy" },
  medium: { icon: "🟡", label: "Medium" },
  hard: { icon: "🟠", label: "Hard" },
  expert: { icon: "🔴", label: "Expert" },
};

export function PlayerCard({
  player,
  color,
  position,
  isActive = false,
  className = "",
  context,
}: PlayerCardProps) {
  // Safely calculate stats with fallbacks
  const wins = Math.max(0, player.stats?.wins ?? 0);
  const draws = Math.max(0, player.stats?.draws ?? 0);
  const losses = Math.max(0, player.stats?.losses ?? 0);
  const totalGames = wins + draws + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  // Sanitize player name - use generic fallback when no color context
  const displayName = player.name?.trim()
    ? player.name.trim()
    : color
      ? `${color === "red" ? "Red" : "Black"} Player`
      : "Player";

  const getInitials = (name: string) => {
    if (!name || typeof name !== "string") {
      return color ? (color === "red" ? "R" : "B") : "U";
    }

    const words = name
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    if (words.length === 0) {
      return color ? (color === "red" ? "R" : "B") : "U";
    }

    return words
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const getAccentColor = (color?: PieceColor) => {
    if (!color) return "bg-blue-600"; // Default neutral color for non-game contexts
    return color === "red" ? "bg-red-600" : "bg-gray-800";
  };

  const accentColor = getAccentColor(color);
  const activeClasses = isActive ? "" : "";

  return (
    <div
      className={`${activeClasses} transition-all duration-200 ${className}`}
    >
      <div className="flex items-center gap-2 px-2">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar className="h-8 w-8 border border-gray-200">
            <AvatarImage src={player.avatar} alt={displayName} />
            <AvatarFallback
              className={`${accentColor} text-xs font-semibold text-white`}
            >
              {player.isAI ? (
                <Bot className="h-3 w-3" />
              ) : (
                getInitials(displayName)
              )}
            </AvatarFallback>
          </Avatar>

          {/* Color indicator - only show in game context */}
          {color && (
            <div
              className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ${accentColor} border border-white shadow-sm`}
            />
          )}
        </div>

        {/* Player Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {/* Show appropriate name based on player type */}
            <h3 className="truncate text-sm font-medium text-gray-900">
              {player.isAI
                ? "AI Player"
                : player.isGuest
                  ? "Guest"
                  : displayName}
            </h3>

            {player.isAI && player.aiDifficulty ? (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {difficultyConfig[player.aiDifficulty].label}
              </Badge>
            ) : null}

            {player.isCurrentUser && !player.isAI && (
              <Crown className="h-3 w-3 flex-shrink-0 text-yellow-600" />
            )}
          </div>

          {/* Win/Loss/Draw record for players with stats */}
          {!player.isAI && player.stats && totalGames > 0 && (
            <div className="mt-0.5 text-xs text-gray-500">
              {wins} / {losses} / {draws}
            </div>
          )}
        </div>

        {/* No timer here; timers are rendered alongside by the container */}
      </div>
    </div>
  );
}
