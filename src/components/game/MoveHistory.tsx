"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  Play,
  Pause,
  Copy,
} from "lucide-react";
import type { Move, Board, PieceColor } from "~/lib/game-logic";
import type { GameAnalysis } from "~/lib/types/move-analysis";
import { MOVE_INDICATORS } from "~/lib/types/move-analysis";
import {
  moveToNotation,
  formatGameHistory,
  historyToString,
  type NotatedMove,
} from "~/lib/checkers-notation";
import { cn } from "~/lib/utils";

interface MoveHistoryProps {
  moves: Move[];
  currentMoveIndex: number;
  board: Board;
  boardSize: number;
  currentPlayer: PieceColor;
  onNavigateToMove: (moveIndex: number) => void;
  winner: PieceColor | "draw" | null;
  analysis?: GameAnalysis | null;
  showAnalysis?: boolean;
}

export function MoveHistory({
  moves,
  currentMoveIndex,
  board,
  boardSize,
  currentPlayer,
  onNavigateToMove,
  winner,
  analysis,
  showAnalysis = false,
}: MoveHistoryProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per move
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const currentMoveRef = useRef<HTMLDivElement>(null);
  const lastMoveIndexRef = useRef<number>(-1);
  // Keep a stable reference to onNavigateToMove to avoid effect churn
  const navigateToMoveRef = useRef(onNavigateToMove);
  useEffect(() => {
    navigateToMoveRef.current = onNavigateToMove;
  }, [onNavigateToMove]);

  // Convert moves to notated format (memoize to prevent recalculation)
  const notatedMoves: NotatedMove[] = useMemo(() => {
    // We pass an empty board since moveToNotation only uses it for piece info which we don't need for basic notation
    const emptyBoard: Board = Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(null));
    return moves.map((move, index) => {
      // For simplicity, we're not tracking kinging in this implementation
      // You could enhance this by comparing board states before/after each move
      return moveToNotation(move, emptyBoard, boardSize, false);
    });
  }, [moves, boardSize]); // Don't include board to prevent excessive recalculation

  // Format into game history entries (pairs of moves)
  const gameHistory = useMemo(
    () => formatGameHistory(notatedMoves),
    [notatedMoves],
  );

  // Auto-scroll to current move when it changes
  useEffect(() => {
    // Only proceed if we actually need to scroll
    if (currentMoveIndex === lastMoveIndexRef.current) {
      return;
    }

    // Update the ref to prevent multiple triggers
    lastMoveIndexRef.current = currentMoveIndex;

    // Check if we should scroll (new move or navigating)
    const shouldScrollToMove =
      currentMoveIndex >= 0 || currentMoveIndex === moves.length - 1;

    if (!shouldScrollToMove) return;

    // Use requestAnimationFrame to ensure DOM is updated
    const scrollTimeout = requestAnimationFrame(() => {
      if (currentMoveRef.current && scrollAreaRef.current) {
        const viewport = scrollAreaRef.current;
        const element = currentMoveRef.current;

        const elementTop = element.offsetTop;
        const elementHeight = element.offsetHeight;
        const viewportHeight = viewport.clientHeight;
        const currentScroll = viewport.scrollTop;

        const elementBottom = elementTop + elementHeight;
        const viewportBottom = currentScroll + viewportHeight;

        if (elementTop < currentScroll || elementBottom > viewportBottom) {
          const targetScroll =
            elementTop - viewportHeight / 2 + elementHeight / 2;
          viewport.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: "smooth",
          });
        }
      }
    });

    return () => {
      cancelAnimationFrame(scrollTimeout);
    };
  }, [currentMoveIndex, moves.length]);

  // Playback functionality
  useEffect(() => {
    if (isPlaying && currentMoveIndex < moves.length - 1) {
      playbackIntervalRef.current = setTimeout(() => {
        navigateToMoveRef.current(currentMoveIndex + 1);
      }, playbackSpeed);
    } else if (isPlaying && currentMoveIndex >= moves.length - 1) {
      // Reached the end
      setIsPlaying(false);
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearTimeout(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, currentMoveIndex, moves.length, playbackSpeed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = () => {
    // Cycle through speeds: 0.5s, 1s, 2s
    setPlaybackSpeed((current) => {
      if (current === 500) return 1000;
      if (current === 1000) return 2000;
      return 500;
    });
  };

  const handleFirst = () => {
    setIsPlaying(false);
    onNavigateToMove(-1); // Before first move
  };

  const handlePrevious = () => {
    setIsPlaying(false);
    if (currentMoveIndex >= 0) {
      onNavigateToMove(currentMoveIndex - 1);
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    if (currentMoveIndex < moves.length - 1) {
      onNavigateToMove(currentMoveIndex + 1);
    }
  };

  const handleLast = () => {
    setIsPlaying(false);
    onNavigateToMove(moves.length - 1);
  };

  const handleMoveClick = (moveIndex: number) => {
    setIsPlaying(false);
    onNavigateToMove(moveIndex);
  };

  const handleExport = () => {
    const historyString = historyToString(gameHistory);
    void navigator.clipboard.writeText(historyString);
    // You could also trigger a download here
  };

  const handleCopyNotation = (notation: string) => {
    void navigator.clipboard.writeText(notation);
  };

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm text-amber-900">
          <span>Move History</span>
          {moves.length > 0 && (
            <span className="text-xs font-normal text-amber-700">
              Move {currentMoveIndex + 1} of {moves.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        {/* Navigation Controls - Always Visible */}
        {
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <Button
                onClick={handleFirst}
                disabled={currentMoveIndex < 0 || moves.length === 0}
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", currentMoveIndex < 0 && "opacity-30")}
                title="Start position"
              >
                <ChevronFirst className="h-3 w-3" />
              </Button>
              <Button
                onClick={handlePrevious}
                disabled={currentMoveIndex < 0}
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", currentMoveIndex < 0 && "opacity-30")}
                title="Previous move"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                onClick={handlePlayPause}
                disabled={
                  currentMoveIndex >= moves.length - 1 || winner !== null
                }
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  (currentMoveIndex >= moves.length - 1 || winner !== null) &&
                    "opacity-30",
                )}
                title={isPlaying ? "Pause" : "Auto-play"}
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
              <Button
                onClick={handleNext}
                disabled={currentMoveIndex >= moves.length - 1}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  currentMoveIndex >= moves.length - 1 && "opacity-30",
                )}
                title="Next move"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                onClick={handleLast}
                disabled={currentMoveIndex >= moves.length - 1}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  currentMoveIndex >= moves.length - 1 && "opacity-30",
                )}
                title="Latest position"
              >
                <ChevronLast className="h-3 w-3" />
              </Button>

              <div className="flex-1 text-center">
                <span className="text-xs text-gray-500">
                  {/* {currentMoveIndex === -1 ? "Start" : `Move ${currentMoveIndex + 1}/${moves.length}`} */}
                </span>
              </div>

              <Button
                onClick={handleExport}
                disabled={moves.length === 0}
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", moves.length === 0 && "opacity-30")}
                title="Copy notation"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>

            {/* Playback Speed */}
            {isPlaying && (
              <Button
                onClick={handleSpeedChange}
                variant="ghost"
                size="sm"
                className="mt-1 h-6 text-xs"
              >
                Speed: {playbackSpeed / 1000}s
              </Button>
            )}
          </div>
        }

        {/* Move List */}
        <div
          className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-white/50"
          ref={scrollAreaRef}
        >
          <div className="space-y-1 p-2 pr-3">
            {gameHistory.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500">
                No moves yet
              </p>
            ) : (
              gameHistory.map((entry, entryIndex) => {
                const redMoveIndex = entryIndex * 2;
                const blackMoveIndex = entryIndex * 2 + 1;

                return (
                  <div
                    key={entry.moveNumber}
                    className="flex items-center gap-1 font-mono text-xs"
                  >
                    {/* Move number */}
                    <span className="w-6 text-right text-gray-500">
                      {entry.moveNumber}.
                    </span>

                    {/* Red move */}
                    {entry.redMove && (
                      <div
                        ref={
                          currentMoveIndex === redMoveIndex
                            ? currentMoveRef
                            : null
                        }
                        className={cn(
                          "flex flex-1 cursor-pointer items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-amber-100",
                          currentMoveIndex === redMoveIndex &&
                            "bg-amber-200 font-bold",
                          redMoveIndex > currentMoveIndex && "opacity-40",
                        )}
                        onClick={() => handleMoveClick(redMoveIndex)}
                        onDoubleClick={() =>
                          handleCopyNotation(entry.redMove!.notation)
                        }
                        title="Click to jump to this move"
                      >
                        {showAnalysis && analysis?.moves[redMoveIndex] && (
                          <span
                            className="w-4 text-xs"
                            title={
                              MOVE_INDICATORS[
                                analysis.moves[redMoveIndex].category
                              ].description
                            }
                          >
                            {
                              MOVE_INDICATORS[
                                analysis.moves[redMoveIndex].category
                              ].icon
                            }
                          </span>
                        )}
                        <span
                          className={cn(
                            entry.redMove.isCapture && "text-red-700",
                            entry.redMove.isKinging && "font-bold",
                          )}
                        >
                          {entry.redMove.notation}
                        </span>
                      </div>
                    )}

                    {/* Black move */}
                    {entry.blackMove && (
                      <div
                        ref={
                          currentMoveIndex === blackMoveIndex
                            ? currentMoveRef
                            : null
                        }
                        className={cn(
                          "flex flex-1 cursor-pointer items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-amber-100",
                          currentMoveIndex === blackMoveIndex &&
                            "bg-amber-200 font-bold",
                          blackMoveIndex > currentMoveIndex && "opacity-40",
                        )}
                        onClick={() => handleMoveClick(blackMoveIndex)}
                        onDoubleClick={() =>
                          handleCopyNotation(entry.blackMove!.notation)
                        }
                        title="Click to jump to this move"
                      >
                        {showAnalysis && analysis?.moves[blackMoveIndex] && (
                          <span
                            className="w-4 text-xs"
                            title={
                              MOVE_INDICATORS[
                                analysis.moves[blackMoveIndex].category
                              ].description
                            }
                          >
                            {
                              MOVE_INDICATORS[
                                analysis.moves[blackMoveIndex].category
                              ].icon
                            }
                          </span>
                        )}
                        <span
                          className={cn(
                            entry.blackMove.isCapture && "text-gray-900",
                            entry.blackMove.isKinging && "font-bold",
                          )}
                        >
                          {entry.blackMove.notation}
                        </span>
                      </div>
                    )}

                    {/* Placeholder for missing black move */}
                    {!entry.blackMove && entry.redMove && (
                      <div className="flex-1 px-1 py-0.5">
                        {currentPlayer === "black" &&
                          currentMoveIndex === redMoveIndex && (
                            <span className="animate-pulse text-gray-400">
                              ...
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Position indicator */}
        {currentMoveIndex < moves.length - 1 && moves.length > 0 && (
          <div className="rounded bg-amber-50 px-2 py-1 text-center text-[10px] text-amber-600">
            Viewing position after move {currentMoveIndex + 1}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
