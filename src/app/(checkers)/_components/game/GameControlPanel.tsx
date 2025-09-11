"use client";

import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Handshake,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import type { PieceColor } from "~/lib/game/logic";

interface GameControlPanelProps {
  // History navigation props
  currentMoveIndex: number;
  totalMoves: number;
  isPlaying?: boolean;
  canNavigateHistory?: boolean;
  onGoToStart: () => void;
  onPreviousMove: () => void;
  onTogglePlay: () => void;
  onNextMove: () => void;
  onGoToEnd: () => void;
  
  // Game action props
  currentPlayer?: PieceColor;
  winner?: PieceColor | "draw" | null;
  isViewingHistory?: boolean;
  isReviewMode?: boolean;
  gameMode?: "ai" | "local" | "online";
  playerColor?: PieceColor;
  onResign?: (player: PieceColor) => void;
  onRequestDraw?: () => void;
  onAcceptDraw?: () => void;
  onDeclineDraw?: () => void;
  showDrawDialog?: boolean;
  drawRequestedBy?: PieceColor | null;
  onOpenSettings?: () => void;
}

export function GameControlPanel({
  // History navigation props
  currentMoveIndex,
  totalMoves,
  isPlaying = false,
  canNavigateHistory = true,
  onGoToStart,
  onPreviousMove,
  onTogglePlay,
  onNextMove,
  onGoToEnd,
  
  // Game action props
  currentPlayer,
  winner,
  isViewingHistory = false,
  isReviewMode = false,
  gameMode = "local",
  playerColor = "red",
  onResign,
  onRequestDraw,
  onAcceptDraw,
  onDeclineDraw,
  showDrawDialog = false,
  drawRequestedBy = null,
  onOpenSettings,
}: GameControlPanelProps) {
  const [showResignDialog, setShowResignDialog] = useState(false);

  // Game controls state
  const canInteract = !winner && !isViewingHistory && !isReviewMode;
  const canRequestDraw = canInteract && gameMode === "local" && onRequestDraw;
  const canResign =
    canInteract &&
    onResign &&
    currentPlayer &&
    (gameMode === "local" ||
      (gameMode === "ai" && currentPlayer === playerColor));

  const handleResign = () => {
    if (!onResign || !currentPlayer) return;
    
    if (gameMode === "local") {
      onResign(currentPlayer);
    } else if (gameMode === "ai") {
      onResign(playerColor);
    }
    setShowResignDialog(false);
  };

  const handleDrawRequest = () => {
    if (onRequestDraw) {
      onRequestDraw();
    }
  };

  return (
    <>
      {/* Hardware-Style Control Grid */}
      <div className="relative inline-block overflow-hidden rounded-lg bg-gray-200 shadow-inner dark:bg-gray-700">
        {/* Top Row - Playback Controls (5 buttons) */}
        {canNavigateHistory && (
          <div className="flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={onGoToStart}
              disabled={currentMoveIndex === 0}
              className="h-12 w-12 rounded-none border-0 border-r border-gray-300 hover:bg-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              title="Go to start"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onPreviousMove}
              disabled={currentMoveIndex === 0}
              className="h-12 w-12 rounded-none border-0 border-r border-gray-300 hover:bg-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              title="Previous move"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePlay}
              disabled={currentMoveIndex >= totalMoves}
              className="h-12 w-12 rounded-none border-0 border-r border-gray-300 hover:bg-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNextMove}
              disabled={currentMoveIndex >= totalMoves}
              className="h-12 w-12 rounded-none border-0 border-r border-gray-300 hover:bg-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              title="Next move"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onGoToEnd}
              disabled={currentMoveIndex >= totalMoves}
              className="h-12 w-12 rounded-none border-0 hover:bg-gray-300 dark:hover:bg-gray-600"
              title="Go to end"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Bottom Row - Game Actions (flexible width) */}
        <div className="flex border-t border-gray-300 dark:border-gray-600">
          {canRequestDraw && (
            <Button
              onClick={handleDrawRequest}
              variant="ghost"
              size="icon"
              className="h-12 flex-1 rounded-none border-0 border-r border-gray-300 hover:bg-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              title="Request draw"
            >
              <Handshake className="h-5 w-5" />
            </Button>
          )}

          {canResign && (
            <Button
              onClick={() => setShowResignDialog(true)}
              variant="ghost"
              size="icon"
              className={`h-12 flex-1 rounded-none border-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 ${
                canRequestDraw && onOpenSettings ? "border-r border-gray-300 dark:border-gray-600" : 
                onOpenSettings ? "border-r border-gray-300 dark:border-gray-600" : ""
              }`}
              title="Resign"
            >
              <Flag className="h-5 w-5" />
            </Button>
          )}

          {onOpenSettings && (
            <Button
              onClick={onOpenSettings}
              variant="ghost"
              size="icon"
              className="h-12 flex-1 rounded-none border-0 hover:bg-gray-300 dark:hover:bg-gray-600"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Move Counter Overlay */}
        {canNavigateHistory && totalMoves > 0 && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded bg-gray-800 px-1 py-0.5 text-xs text-white dark:bg-gray-200 dark:text-gray-800">
            {currentMoveIndex}/{totalMoves}
          </div>
        )}
      </div>

      {/* Resign Confirmation Dialog */}
      {onResign && (
        <AlertDialog open={showResignDialog} onOpenChange={setShowResignDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Resignation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to resign? This will end the game and
                declare{" "}
                {gameMode === "local"
                  ? `${currentPlayer === "red" ? "Black" : "Red"}`
                  : "your opponent"}{" "}
                as the winner.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResign}
                className="bg-red-600 hover:bg-red-700"
              >
                Resign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Draw Request Dialog (for local play) */}
      {gameMode === "local" && onAcceptDraw && onDeclineDraw && (
        <AlertDialog open={showDrawDialog} onOpenChange={() => onDeclineDraw()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Draw Requested</AlertDialogTitle>
              <AlertDialogDescription>
                {drawRequestedBy === currentPlayer
                  ? "Waiting for opponent to accept draw..."
                  : `${drawRequestedBy === "red" ? "Red" : "Black"} has requested a draw. Do you accept?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {drawRequestedBy !== currentPlayer && (
              <AlertDialogFooter>
                <AlertDialogCancel onClick={onDeclineDraw}>
                  Decline
                </AlertDialogCancel>
                <AlertDialogAction onClick={onAcceptDraw}>
                  Accept Draw
                </AlertDialogAction>
              </AlertDialogFooter>
            )}
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}