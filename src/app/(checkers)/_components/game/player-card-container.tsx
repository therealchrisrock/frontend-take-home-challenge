"use client";

import { PlayerTimer } from "~/app/(checkers)/_components/game/player-timer";
import { PlayerCard } from "~/app/(checkers)/_components/game/PlayerCard";
import { PlayerCardSkeleton } from "~/app/(checkers)/_components/game/PlayerCardSkeleton";
import { usePlayerCard } from "~/lib/game/hooks/use-player-card";
import { type PieceColor } from "~/lib/game/logic";
import { type PlayerInfo } from "~/lib/game/player-types";
import { type TimeState } from "~/lib/game/time-control-types";

interface PlayerCardContainerProps {
  player: PlayerInfo;
  color: PieceColor;
  position: "top" | "bottom";
  isActive?: boolean;
  className?: string;
  enableServerData?: boolean;
  showLoadingSkeleton?: boolean;
  timeState?: TimeState | null;
  isAIThinking?: boolean;
}

export function PlayerCardContainer({
  player,
  color,
  position,
  isActive = false,
  className = "",
  enableServerData = false,
  showLoadingSkeleton = true,
  timeState,
  isAIThinking = false,
}: PlayerCardContainerProps) {
  const { player: viewModel, isLoading } = usePlayerCard({
    player,
    enableServerData,
  });

  if (isLoading && showLoadingSkeleton) {
    return (
      <PlayerCardSkeleton
        color={color}
        position={position}
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between px-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <PlayerCard
              player={viewModel}
              color={color}
              position={position}
              isActive={isActive}
            />
            {timeState && <PlayerTimer timeState={timeState} color={color} />}
          </div>
        </div>
      </div>
    </div>
  );
}
