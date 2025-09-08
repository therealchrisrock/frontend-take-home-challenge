'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { 
  ChevronFirst, 
  ChevronLeft, 
  ChevronRight, 
  ChevronLast,
  Play,
  Pause,
  RotateCcw,
  Download,
  Copy
} from 'lucide-react';
import type { Move, Board, PieceColor } from '~/lib/game-logic';
import type { BoardConfig } from '~/lib/board-config';
import type { GameAnalysis, MoveEvaluation } from '~/lib/types/move-analysis';
import { MOVE_INDICATORS } from '~/lib/types/move-analysis';
import { 
  moveToNotation, 
  formatGameHistory, 
  historyToString,
  type NotatedMove,
  type GameHistoryEntry 
} from '~/lib/checkers-notation';
import { cn } from '~/lib/utils';

interface MoveHistoryProps {
  moves: Move[];
  currentMoveIndex: number;
  board: Board;
  boardConfig: BoardConfig;
  currentPlayer: PieceColor;
  onNavigateToMove: (moveIndex: number) => void;
  winner: PieceColor | 'draw' | null;
  analysis?: GameAnalysis | null;
  showAnalysis?: boolean;
}

export function MoveHistory({
  moves,
  currentMoveIndex,
  board,
  boardConfig,
  currentPlayer,
  onNavigateToMove,
  winner,
  analysis,
  showAnalysis = false
}: MoveHistoryProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per move
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const currentMoveRef = useRef<HTMLDivElement>(null);
  const lastMoveIndexRef = useRef<number>(-1);

  // Convert moves to notated format
  const notatedMoves: NotatedMove[] = moves.map((move, index) => {
    // For simplicity, we're not tracking kinging in this implementation
    // You could enhance this by comparing board states before/after each move
    return moveToNotation(move, board, boardConfig, false);
  });

  // Format into game history entries (pairs of moves)
  const gameHistory = formatGameHistory(notatedMoves);

  // Auto-scroll to current move when it changes
  useEffect(() => {
    // Check if a new move was made (currentMoveIndex increased and is at the latest move)
    const isNewMove = currentMoveIndex > lastMoveIndexRef.current && 
                      currentMoveIndex === moves.length - 1;
    
    if (currentMoveRef.current && scrollAreaRef.current) {
      // For new moves, scroll to the end to show the latest move
      // For navigation, scroll the current move into view
      currentMoveRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: isNewMove ? 'end' : 'nearest'
      });
    }
    
    lastMoveIndexRef.current = currentMoveIndex;
  }, [currentMoveIndex, moves.length]);

  // Playback functionality
  useEffect(() => {
    if (isPlaying && currentMoveIndex < moves.length - 1) {
      playbackIntervalRef.current = setTimeout(() => {
        onNavigateToMove(currentMoveIndex + 1);
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
  }, [isPlaying, currentMoveIndex, moves.length, playbackSpeed, onNavigateToMove]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = () => {
    // Cycle through speeds: 0.5s, 1s, 2s
    setPlaybackSpeed(current => {
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
    navigator.clipboard.writeText(historyString);
    // You could also trigger a download here
  };

  const handleCopyNotation = (notation: string) => {
    navigator.clipboard.writeText(notation);
  };

  return (
    <Card className="h-full min-h-0 flex flex-col bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-900 text-sm flex items-center justify-between">
          <span>Move History</span>
          {moves.length > 0 && (
            <span className="text-xs font-normal text-amber-700">
              Move {currentMoveIndex + 1} of {moves.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0 flex flex-col gap-2 p-3">
        {/* Navigation Controls - Always Visible */}
        {
          <div className="flex flex-col gap-1">
            <div className="flex gap-1 items-center">
              <Button
                onClick={handleFirst}
                disabled={currentMoveIndex < 0 || moves.length === 0}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  currentMoveIndex < 0 && "opacity-30"
                )}
                title="Start position"
              >
                <ChevronFirst className="w-3 h-3" />
              </Button>
              <Button
                onClick={handlePrevious}
                disabled={currentMoveIndex < 0}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  currentMoveIndex < 0 && "opacity-30"
                )}
                title="Previous move"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                onClick={handlePlayPause}
                disabled={currentMoveIndex >= moves.length - 1 || winner !== null}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  (currentMoveIndex >= moves.length - 1 || winner !== null) && "opacity-30"
                )}
                title={isPlaying ? "Pause" : "Auto-play"}
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </Button>
              <Button
                onClick={handleNext}
                disabled={currentMoveIndex >= moves.length - 1}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  currentMoveIndex >= moves.length - 1 && "opacity-30"
                )}
                title="Next move"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
              <Button
                onClick={handleLast}
                disabled={currentMoveIndex >= moves.length - 1}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  currentMoveIndex >= moves.length - 1 && "opacity-30"
                )}
                title="Latest position"
              >
                <ChevronLast className="w-3 h-3" />
              </Button>
              
              <div className="flex-1 text-center">
                <span className="text-xs text-gray-500">
                  {currentMoveIndex === -1 ? "Start" : `Move ${currentMoveIndex + 1}/${moves.length}`}
                </span>
              </div>
              
              <Button
                onClick={handleExport}
                disabled={moves.length === 0}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  moves.length === 0 && "opacity-30"
                )}
                title="Copy notation"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            
            {/* Playback Speed */}
            {isPlaying && (
              <Button
                onClick={handleSpeedChange}
                variant="ghost"
                size="sm"
                className="text-xs h-6 mt-1"
              >
                Speed: {playbackSpeed / 1000}s
              </Button>
            )}
          </div>
        }

        {/* Move List */}
        <ScrollArea className="flex-1 border rounded-md bg-white/50 min-h-0 overflow-hidden" ref={scrollAreaRef}>
          <div className="p-2 space-y-1 pr-3">
            {gameHistory.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                No moves yet
              </p>
            ) : (
              gameHistory.map((entry, entryIndex) => {
                const redMoveIndex = entryIndex * 2;
                const blackMoveIndex = entryIndex * 2 + 1;
                
                return (
                  <div
                    key={entry.moveNumber}
                    className="flex items-center gap-1 text-xs font-mono"
                  >
                    {/* Move number */}
                    <span className="w-6 text-gray-500 text-right">
                      {entry.moveNumber}.
                    </span>
                    
                    {/* Red move */}
                    {entry.redMove && (
                      <div
                        ref={currentMoveIndex === redMoveIndex ? currentMoveRef : null}
                        className={cn(
                          "flex items-center gap-1 flex-1 px-1 py-0.5 rounded cursor-pointer hover:bg-amber-100 transition-colors",
                          currentMoveIndex === redMoveIndex && "bg-amber-200 font-bold",
                          redMoveIndex > currentMoveIndex && "opacity-40"
                        )}
                        onClick={() => handleMoveClick(redMoveIndex)}
                        onDoubleClick={() => handleCopyNotation(entry.redMove!.notation)}
                        title="Click to jump to this move"
                      >
                        {showAnalysis && analysis && analysis.moves[redMoveIndex] && (
                          <span 
                            className="text-xs w-4"
                            title={MOVE_INDICATORS[analysis.moves[redMoveIndex]!.category].description}
                          >
                            {MOVE_INDICATORS[analysis.moves[redMoveIndex]!.category].icon}
                          </span>
                        )}
                        <span className={cn(
                          entry.redMove.isCapture && "text-red-700",
                          entry.redMove.isKinging && "font-bold"
                        )}>
                          {entry.redMove.notation}
                        </span>
                      </div>
                    )}
                    
                    {/* Black move */}
                    {entry.blackMove && (
                      <div
                        ref={currentMoveIndex === blackMoveIndex ? currentMoveRef : null}
                        className={cn(
                          "flex items-center gap-1 flex-1 px-1 py-0.5 rounded cursor-pointer hover:bg-amber-100 transition-colors",
                          currentMoveIndex === blackMoveIndex && "bg-amber-200 font-bold",
                          blackMoveIndex > currentMoveIndex && "opacity-40"
                        )}
                        onClick={() => handleMoveClick(blackMoveIndex)}
                        onDoubleClick={() => handleCopyNotation(entry.blackMove!.notation)}
                        title="Click to jump to this move"
                      >
                        {showAnalysis && analysis && analysis.moves[blackMoveIndex] && (
                          <span 
                            className="text-xs w-4"
                            title={MOVE_INDICATORS[analysis.moves[blackMoveIndex]!.category].description}
                          >
                            {MOVE_INDICATORS[analysis.moves[blackMoveIndex]!.category].icon}
                          </span>
                        )}
                        <span className={cn(
                          entry.blackMove.isCapture && "text-gray-900",
                          entry.blackMove.isKinging && "font-bold"
                        )}>
                          {entry.blackMove.notation}
                        </span>
                      </div>
                    )}
                    
                    {/* Placeholder for missing black move */}
                    {!entry.blackMove && entry.redMove && (
                      <div className="flex-1 px-1 py-0.5">
                        {currentPlayer === 'black' && currentMoveIndex === redMoveIndex && (
                          <span className="text-gray-400 animate-pulse">...</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Position indicator */}
        {currentMoveIndex < moves.length - 1 && moves.length > 0 && (
          <div className="text-[10px] text-amber-600 text-center bg-amber-50 rounded px-2 py-1">
            Viewing position after move {currentMoveIndex + 1}
          </div>
        )}
      </CardContent>
    </Card>
  );
}