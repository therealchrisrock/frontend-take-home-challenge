"use client";

import {
  BookMarkedIcon,
  ChevronLeft,
  ChevronRight,
  Flag,
  Handshake,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { PieceColor } from "~/lib/game/logic";
import { useGame } from "~/lib/game/state/game-context";
import { useOnlineMultiplayer } from "~/lib/game/hooks/use-online-multiplayer";
import { useSession } from "next-auth/react";

interface GameControlPanelProps { }

export function GameControlPanel({ }: GameControlPanelProps) {
  const { state, dispatch } = useGame();
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session } = useSession();
  const { sendDrawRequest, sendDrawResponse } = useOnlineMultiplayer({ 
    gameId: state.gameMode === "online" ? state.gameId : undefined 
  });

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
    (state.gameMode === "local" || state.gameMode === "ai");

  const handleResign = () => {
    if (!state.currentPlayer) return;
    if (state.gameMode === "local") {
      dispatch({ type: "RESIGN", payload: state.currentPlayer });
    } else if (state.gameMode === "ai") {
      // In AI mode, the human player can always resign regardless of turn
      dispatch({ type: "RESIGN", payload: state.playerColor as PieceColor });
    }
    setShowResignDialog(false);
  };

  const handleDrawRequest = async () => {
    if (state.gameMode === "online") {
      // Send draw request to server
      const playerId = session?.user?.id ?? null;
      const success = await sendDrawRequest(playerId);
      if (success) {
        dispatch({ type: "REQUEST_DRAW" });
      }
    } else {
      // Local draw request
      dispatch({ type: "REQUEST_DRAW" });
    }
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

          {state.gameMode === "online" && (
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
          )}



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


          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setShowRulesDialog(true)}
                variant="ghost"
                size="icon"
                className="h-12 flex-1 rounded-none border-0 border-r border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                <BookMarkedIcon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rules</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setShowSettingsDialog(true)}
                variant="ghost"
                size="icon"
                className="h-12 flex-1 rounded-none border-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
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
                  : state.playerColor === "red" ? "Black (AI)" : "Red (AI)"}{" "}
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
                {state.drawRequestedBy === state.playerColor
                  ? "Waiting for opponent to accept draw..."
                  : `${state.drawRequestedBy === "red" ? "Red" : "Black"} has requested a draw. Do you accept?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {state.drawRequestedBy !== state.playerColor && (
              <AlertDialogFooter>
                <AlertDialogCancel onClick={async () => {
                  const playerId = session?.user?.id ?? null;
                  await sendDrawResponse(false, playerId);
                  dispatch({ type: "DIALOGS", payload: { showDrawDialog: false } });
                }}>
                  Decline
                </AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  const playerId = session?.user?.id ?? null;
                  await sendDrawResponse(true, playerId);
                  dispatch({ type: "ACCEPT_DRAW" });
                }}>
                  Accept Draw
                </AlertDialogAction>
              </AlertDialogFooter>
            )}
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Settings Dialog */}
      <GameSettings open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />

      {/* Rules Dialog */}
      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{state.rules.metadata.displayName} Rules</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 text-sm">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <strong>Origin:</strong> {state.rules.metadata.origin}
                  </p>
                  <p className="text-sm">{state.rules.metadata.description}</p>
                  {state.rules.metadata.aliases && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <strong>Also known as:</strong> {state.rules.metadata.aliases.join(", ")}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Board Setup</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Played on a {state.rules.board.size}×{state.rules.board.size} board</li>
                    <li>Each player starts with {state.rules.board.pieceCount} pieces</li>
                    <li>Red moves first, then players alternate turns</li>
                    <li>Pieces are placed on the dark squares</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Movement</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Regular pieces can only move diagonally forward</li>
                    {state.rules.movement.regularPieces.canMoveBackward && (
                      <li>Regular pieces can also move backward</li>
                    )}
                    {state.rules.movement.regularPieces.canCaptureBackward && (
                      <li>Regular pieces can capture backward</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Captures</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {state.rules.capture.mandatory && (
                      <li>You must capture if a capture move is available</li>
                    )}
                    {state.rules.capture.requireMaximum && (
                      <li>You must make the capture that takes the maximum number of pieces</li>
                    )}
                    {state.rules.capture.kingPriority && (
                      <li>Capturing with a king takes priority over regular pieces</li>
                    )}
                    {state.rules.capture.chainCaptures && (
                      <li>Multiple captures in sequence are required if possible</li>
                    )}
                    <li>Captured pieces are removed from the board</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Kings</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Pieces become kings when they reach the opposite end</li>
                    <li>Kings can move and capture both forward and backward</li>
                    {state.rules.movement.kings.canFly && (
                      <li>Kings can move multiple squares diagonally (flying kings)</li>
                    )}
                    <li>Kings are indicated by a crown symbol</li>
                    {state.rules.capture.promotion.stopsCaptureChain && (
                      <li>Promoting to king stops any capture chain</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Winning & Draws</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Win by capturing all opponent pieces</li>
                    <li>Win if opponent has no legal moves</li>
                    {state.rules.draws.fortyMoveRule && (
                      <li>Game is a draw if no progress is made for 40 moves</li>
                    )}
                    {state.rules.draws.twentyFiveMoveRule && (
                      <li>Game is a draw if no capture is made for 25 moves</li>
                    )}
                    {state.rules.draws.repetitionLimit && (
                      <li>Game is a draw after {state.rules.draws.repetitionLimit} position repetitions</li>
                    )}
                    {state.rules.draws.insufficientMaterial && (
                      <li>Game is a draw with insufficient material to win</li>
                    )}
                  </ul>
                </div>

                {state.rules.metadata.officialRules && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-xs">
                    <p><strong>Official Rules:</strong> {state.rules.metadata.officialRules.organization}</p>
                    <p>Version: {state.rules.metadata.officialRules.version} ({state.rules.metadata.officialRules.lastUpdated})</p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}