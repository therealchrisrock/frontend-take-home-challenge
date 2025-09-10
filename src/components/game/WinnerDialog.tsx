"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Trophy, Handshake } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { PieceColor } from "~/lib/game-logic";
import type { DrawResult } from "~/lib/draw-detection";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface WinnerDialogProps {
  winner: PieceColor | "draw" | null;
  drawReason?: DrawResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayAgain: () => void;
  onStartAnalysis?: () => void;
  gameMode: "ai" | "local" | "online";
  playerColor?: PieceColor;
  boardVariant?: "american" | "brazilian" | "international" | "canadian";
  aiDifficulty?: "easy" | "medium" | "hard" | "expert";
  timeControl?: {
    format: "X|Y" | "X+Y";
    initialMinutes: number;
    incrementSeconds: number;
    preset?: "bullet" | "blitz" | "rapid" | "classical" | "custom";
  } | null;
}

export function WinnerDialog({
  winner,
  drawReason,
  open,
  onOpenChange,
  onPlayAgain,
  onStartAnalysis,
  gameMode,
  playerColor = "red",
  boardVariant = "american",
  aiDifficulty = "medium",
  timeControl = null,
}: WinnerDialogProps) {
  const router = useRouter();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const createGameMutation = api.game.create.useMutation({
    onSuccess: (data) => {
      router.push(`/game/${data.id}`);
    },
    onError: () => {
      setIsCreatingGame(false);
    },
  });

  const handlePlayAgain = () => {
    setIsCreatingGame(true);
    createGameMutation.mutate({
      mode: gameMode,
      boardVariant,
      playerColor,
      aiDifficulty: gameMode === "ai" ? aiDifficulty : undefined,
      timeControl,
    });
  };

  if (!winner) return null;

  const getWinnerText = () => {
    if (winner === "draw") {
      // Use the draw reason explanation if available
      const description =
        drawReason?.explanation || "The game has ended in a draw.";

      // Create a more specific title based on the draw reason
      let title = "Game Drawn!";
      if (drawReason?.reason === "threefold-repetition") {
        title = "Draw by Repetition!";
      } else if (drawReason?.reason === "forty-move-rule") {
        title = "Draw by Forty-Move Rule!";
      } else if (drawReason?.reason === "twenty-five-move-rule") {
        title = "Draw by Twenty-Five-Move Rule!";
      } else if (drawReason?.reason === "insufficient-material") {
        title = "Draw by Insufficient Material!";
      } else if (drawReason?.reason === "stalemate") {
        title = "Draw by Agreement!";
      }

      return {
        title,
        description,
        icon: <Handshake className="h-12 w-12 text-blue-500" />,
      };
    }

    if (gameMode === "ai") {
      const playerWon = winner === playerColor;
      return {
        title: playerWon ? "You Win!" : "AI Wins!",
        description: playerWon
          ? "Congratulations! You have defeated the AI opponent."
          : "The AI has won this game. Better luck next time!",
        icon: (
          <Trophy
            className={`h-12 w-12 ${playerWon ? "text-yellow-500" : "text-gray-500"}`}
          />
        ),
      };
    }

    if (gameMode === "online") {
      const playerWon = winner === playerColor;
      return {
        title: playerWon ? "You Win!" : "You Lose!",
        description: playerWon
          ? "Congratulations! You have defeated your opponent."
          : "Your opponent has won this game. Better luck next time!",
        icon: (
          <Trophy
            className={`h-12 w-12 ${playerWon ? "text-yellow-500" : "text-gray-500"}`}
          />
        ),
      };
    }

    // Local game
    const winnerName = winner === "red" ? "Red" : "Black";
    return {
      title: `${winnerName} Wins!`,
      description: `${winnerName} player has won the game!`,
      icon: (
        <Trophy
          className={`h-12 w-12 ${winner === "red" ? "text-red-500" : "text-gray-700"}`}
        />
      ),
    };
  };

  const { title, description, icon } = getWinnerText();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {icon}
            <AlertDialogTitle className="text-2xl">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <div className="flex w-full gap-2">
            {onStartAnalysis && (
              <Button
                onClick={onStartAnalysis}
                variant="outline"
                className="flex-1"
              >
                Analyze Game
              </Button>
            )}
            <AlertDialogAction
              onClick={handlePlayAgain}
              className="flex-1"
              disabled={isCreatingGame}
            >
              {isCreatingGame ? "Creating..." : "Play Again"}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
