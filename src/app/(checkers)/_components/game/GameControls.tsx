"use client";

import { Flag, Handshake } from "lucide-react";
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

interface GameControlsProps {
  currentPlayer: PieceColor;
  winner: PieceColor | "draw" | null;
  isViewingHistory: boolean;
  isReviewMode: boolean;
  gameMode: "ai" | "local" | "online";
  playerColor: PieceColor;
  onResign: (player: PieceColor) => void;
  onRequestDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  showDrawDialog: boolean;
  drawRequestedBy: PieceColor | null;
}

export function GameControls({
  currentPlayer,
  winner,
  isViewingHistory,
  isReviewMode,
  gameMode,
  playerColor,
  onResign,
  onRequestDraw,
  onAcceptDraw,
  onDeclineDraw,
  showDrawDialog,
  drawRequestedBy,
}: GameControlsProps) {
  const [showResignDialog, setShowResignDialog] = useState(false);

  const canInteract = !winner && !isViewingHistory && !isReviewMode;

  const canRequestDraw = canInteract && (gameMode === "local" || gameMode === "online");

  const canResign = canInteract && (gameMode === "local" || gameMode === "ai");

  const handleResign = () => {
    if (gameMode === "local") {
      onResign(currentPlayer);
    } else if (gameMode === "ai") {
      // In AI mode, the human player can always resign regardless of turn
      onResign(playerColor);
    }
    setShowResignDialog(false);
  };

  const handleDrawRequest = () => {
    onRequestDraw();
  };

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full gap-2">
          {canRequestDraw && (
            <Button
              onClick={handleDrawRequest}
              variant="ghost"
              size="default"
              className="flex items-center justify-center gap-2"
            >
              <Handshake className="h-4 w-4" />
              Draw
            </Button>
          )}

          {canResign && (
            <Button
              onClick={() => setShowResignDialog(true)}
              variant="ghost"
              size="default"
              className="flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Flag className="h-4 w-4" />
              Resign
            </Button>
          )}
        </div>
      </div>

      {/* Resign Confirmation Dialog */}
      <AlertDialog open={showResignDialog} onOpenChange={setShowResignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Resignation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to resign? This will end the game and
              declare{" "}
              {gameMode === "local"
                ? `${currentPlayer === "red" ? "Black" : "Red"}`
                : playerColor === "red" ? "Black (AI)" : "Red (AI)"}{" "}
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

      {/* Draw Request Dialog (for local and online play) */}
      {(gameMode === "local" || gameMode === "online") && (
        <AlertDialog open={showDrawDialog} onOpenChange={() => onDeclineDraw()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Draw Requested</AlertDialogTitle>
              <AlertDialogDescription>
                {drawRequestedBy === currentPlayer || (gameMode === "online" && drawRequestedBy === playerColor)
                  ? "Waiting for opponent to accept draw..."
                  : `${drawRequestedBy === "red" ? "Red" : "Black"} has requested a draw. Do you accept?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {drawRequestedBy !== currentPlayer && (gameMode === "local" || drawRequestedBy !== playerColor) && (
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
