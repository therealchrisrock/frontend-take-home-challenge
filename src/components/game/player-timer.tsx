import { Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  type TimeState,
  formatTime,
  getTimeWarningLevel,
} from "~/lib/time-control-types";
import { type PieceColor } from "~/lib/game-logic";

interface PlayerTimerProps {
  timeState: TimeState;
  color: PieceColor;
  className?: string;
}

export function PlayerTimer({ timeState, color, className }: PlayerTimerProps) {
  const playerTime = color === "red" ? timeState.redTime : timeState.blackTime;
  const isTimerActive = timeState.activePlayer === color && !timeState.isPaused;
  const timeWarning = getTimeWarningLevel(timeState, color);

  if (playerTime == null) return null;

  const displayTime = formatTime(playerTime, playerTime < 60000);

  const getTimerStyle = () => {
    if (timeWarning?.level === "urgent")
      return "text-red-600 font-bold animate-pulse";
    if (timeWarning?.level === "critical") return "text-red-500 font-semibold";
    if (timeWarning?.level === "low") return "text-orange-500 font-medium";
    if (isTimerActive)
      return color === "red"
        ? "text-red-600 font-semibold"
        : "text-gray-800 font-semibold";
    return "text-gray-600";
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Clock className={cn("h-3.5 w-3.5", getTimerStyle())} />
      <span className={cn("font-mono text-sm tabular-nums", getTimerStyle())}>
        {displayTime}
      </span>
      {isTimerActive && (
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
      )}
    </div>
  );
}
