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
import { useEffect, useRef, useState } from "react";
import { GameSettings } from "~/app/(checkers)/_components/game/GameSettings";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { PieceColor } from "~/lib/game/logic";
import { useGame } from "~/lib/game/state/game-context";

interface GameControlPanelProps { }

export function GameControlPanel({ }: GameControlPanelProps) {
  const { state, dispatch } = useGame();
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play functionality (history review)
  useEffect(() => {
    if (isPlaying && state.moveHistory.length > 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        const nextMove = state.currentMoveIndex + 1;
        if (nextMove >= state.moveHistory.length) {
          setIsPlaying(false);
        } else {
          dispatch({ type: "NAVIGATE_TO_MOVE", payload: nextMove });
        }
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isPlaying, state.currentMoveIndex, state.moveHistory.length, dispatch]);

  // Game controls state
  const canInteract = !state.winner && !state.isViewingHistory && !state.isReviewMode;
  const canRequestDraw = canInteract && state.gameMode === "online";
  const canResign =
    canInteract &&
    !!state.currentPlayer &&
    (state.gameMode === "local" ||
      (state.gameMode === "ai" && state.currentPlayer === state.playerColor));

  const handleResign = () => {
    if (!state.currentPlayer) return;
    if (state.gameMode === "local") {
      dispatch({ type: "RESIGN", payload: state.currentPlayer });
    } else if (state.gameMode === "ai") {
      dispatch({ type: "RESIGN", payload: state.playerColor as PieceColor });
    }
    setShowResignDialog(false);
  };

  const handleDrawRequest = () => {
    dispatch({ type: "REQUEST_DRAW" });
  };

  return (
    <>
      {/* Hardware-Style Control Grid */}
      <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Move Counter Overlay */}
        {state.moveHistory.length > 0 && (
          <div className="flex justify-between items-center p-2 border-b">
            <div>
              {state.currentMoveIndex !== state.moveHistory.length - 1 && (
                <button className="text-xs text-gray-500  cursor-pointer underline" onClick={() =>
                  dispatch({
                    type: "NAVIGATE_TO_MOVE",
                    payload: state.moveHistory.length - 1,
                  })
                }>Return to Game</button>
              )}
            </div>
            <span className="text-xs text-gray-500"> Move {Math.max(0, state.currentMoveIndex + 1)} of {state.moveHistory.length}</span>
          </div>
        )}
        {/* Top Row - Playback Controls (5 buttons) */}
        {true && (
          <div className="flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch({ type: "NAVIGATE_TO_MOVE", payload: -1 })}
                  disabled={state.currentMoveIndex <= -1 || state.moveHistory.length === 0}
                  className="h-12 flex-1 rounded-none border-0 border-r border-gray-200 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 disabled:opacity-100 disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-700 dark:disabled:bg-gray-900 dark:disabled:text-gray-600"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go to start</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch({ type: "NAVIGATE_TO_MOVE", payload: state.currentMoveIndex - 1 })}
                  disabled={state.currentMoveIndex <= -1 || state.moveHistory.length === 0}
                  className="h-12 flex-1 rounded-none border-0 border-r border-gray-200 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 disabled:opacity-100 disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-700 dark:disabled:bg-gray-900 dark:disabled:text-gray-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous move</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={state.moveHistory.length === 0 || state.currentMoveIndex >= state.moveHistory.length - 1}
                  className="h-12 flex-1 rounded-none border-0 border-r border-gray-200 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 disabled:opacity-100 disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-700 dark:disabled:bg-gray-900 dark:disabled:text-gray-600"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch({ type: "NAVIGATE_TO_MOVE", payload: state.currentMoveIndex + 1 })}
                  disabled={state.moveHistory.length === 0 || state.currentMoveIndex >= state.moveHistory.length - 1}
                  className="h-12 flex-1 rounded-none border-0 border-r border-gray-200 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 disabled:opacity-100 disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-700 dark:disabled:bg-gray-900 dark:disabled:text-gray-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next move</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch({ type: "NAVIGATE_TO_MOVE", payload: state.moveHistory.length - 1 })}
                  disabled={state.moveHistory.length === 0 || state.currentMoveIndex >= state.moveHistory.length - 1}
                  className="h-12 flex-1 rounded-none border-0 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 disabled:opacity-100 disabled:cursor-not-allowed dark:hover:bg-gray-700 dark:disabled:bg-gray-900 dark:disabled:text-gray-600"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go to end</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Bottom Row - Game Actions (flexible width) */}
        <div className="flex border-t border-gray-200 dark:border-gray-700">

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleDrawRequest}
                variant="ghost"
                size="icon"
                disabled={!canRequestDraw}
                className="h-12 flex-1 rounded-none border-0 border-r border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-700"
              >
                <Handshake className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Request draw</TooltipContent>
          </Tooltip>



          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setShowResignDialog(true)}
                variant="ghost"
                size="icon"
                disabled={!canResign}
                className={`h-12 flex-1 rounded-none border-0 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed dark:hover:bg-red-950 border-r border-gray-200 dark:border-gray-700`}
              >
                <Flag className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resign</TooltipContent>
          </Tooltip>


          <GameSettings>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 flex-1 rounded-none border-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </GameSettings>
        </div>


      </div>

      {/* Resign Confirmation Dialog */}
      {canResign && (
        <AlertDialog open={showResignDialog} onOpenChange={setShowResignDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Resignation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to resign? This will end the game and
                declare{" "}
                {state.gameMode === "local"
                  ? `${state.currentPlayer === "red" ? "Black" : "Red"}`
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

      {/* Draw Request Dialog (for online play only) */}
      {state.gameMode === "online" && (
        <AlertDialog open={state.showDrawDialog} onOpenChange={() => dispatch({ type: "DIALOGS", payload: { showDrawDialog: false } })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Draw Requested</AlertDialogTitle>
              <AlertDialogDescription>
                {state.drawRequestedBy === state.currentPlayer
                  ? "Waiting for opponent to accept draw..."
                  : `${state.drawRequestedBy === "red" ? "Red" : "Black"} has requested a draw. Do you accept?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {state.drawRequestedBy !== state.currentPlayer && (
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => dispatch({ type: "DIALOGS", payload: { showDrawDialog: false } })}>
                  Decline
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => dispatch({ type: "ACCEPT_DRAW" })}>
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