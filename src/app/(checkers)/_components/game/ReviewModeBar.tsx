import { History } from "lucide-react";
import { Button } from "~/components/ui/button";

interface ReviewModeBarProps {
  currentMoveIndex: number;
  totalMoves: number;
  onNavigateToMove: (index: number) => void;
  onExitReview: () => void;
}

export function ReviewModeBar({
  currentMoveIndex,
  totalMoves,
  onNavigateToMove,
  onExitReview,
}: ReviewModeBarProps) {
  return (
    <div className="absolute top-2 right-12 left-2 z-10 flex items-center justify-between rounded-lg bg-blue-100/90 px-3 py-2 shadow-md backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-blue-700" />
        <span className="text-sm font-medium text-blue-900">
          Game Review Mode - Move {currentMoveIndex + 1} of {totalMoves}
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onNavigateToMove(0)}
          size="sm"
          variant="ghost"
          disabled={currentMoveIndex <= -1}
        >
          Start
        </Button>
        <Button
          onClick={() => onNavigateToMove(currentMoveIndex - 1)}
          size="sm"
          variant="ghost"
          disabled={currentMoveIndex <= -1}
        >
          ← Previous
        </Button>
        <Button
          onClick={() => onNavigateToMove(currentMoveIndex + 1)}
          size="sm"
          variant="ghost"
          disabled={currentMoveIndex >= totalMoves - 1}
        >
          Next →
        </Button>
        <Button onClick={onExitReview} size="sm" variant="default">
          Exit Review
        </Button>
      </div>
    </div>
  );
}