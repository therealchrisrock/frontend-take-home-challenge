"use client";

import { m } from "framer-motion";
import { Handshake, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import type { DrawResult } from "~/lib/game/draw-detection";
import type { PieceColor } from "~/lib/game/logic";
import { api } from "~/trpc/react";

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
  gameId?: string;
}

// Confetti particle component
function Confetti() {
  const colors = ["#FFD700", "#FFA500", "#FF69B4", "#00CED1", "#98FB98"];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <m.div
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{
            background: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
          }}
          initial={{
            y: -20,
            opacity: 0,
            scale: 0,
            rotate: 0,
          }}
          animate={{
            y: 300,
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0.5],
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: Math.random() * 0.5,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export function WinnerDialog({
  winner,
  drawReason,
  open,
  onOpenChange,
  onStartAnalysis,
  gameMode,
  playerColor = "red",
  boardVariant = "american",
  aiDifficulty = "medium",
  timeControl = null,
  gameId,
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

  const getWinnerText = () => {
    if (!winner) {
      return {
        title: "",
        description: "",
        icon: null,
        isVictory: false,
      };
    }
    if (winner === "draw") {
      // Use the draw reason explanation if available
      const description =
        drawReason?.explanation ?? "The game has ended in a draw.";

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
        isVictory: false,
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
        isVictory: playerWon,
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
        isVictory: playerWon,
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
      isVictory: true, // Both players see celebration in local mode
    };
  };

  const { title, description, icon, isVictory } = getWinnerText();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="relative flex flex-col items-center gap-4 py-4">
            {/* Confetti for victories */}
            {isVictory && winner !== "draw" && <Confetti />}

            {/* Animated icon */}
            <m.div
              initial={{ scale: 0, rotate: -180 }}
              animate={
                isVictory && winner !== "draw"
                  ? {
                    scale: [0, 1.2, 1],
                    rotate: [180, 360, 360],
                  }
                  : {
                    scale: [0, 1],
                    rotate: 0,
                  }
              }
              transition={
                isVictory && winner !== "draw"
                  ? {
                    duration: 0.6,
                    ease: "easeOut",
                  }
                  : {
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    duration: 0.6,
                  }
              }
            >
              {/* Glow effect for victory */}
              {isVictory && winner !== "draw" && (
                <m.div
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{
                    background:
                      winner === "red"
                        ? "radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)",
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}

              {/* Trophy bounce animation for victory */}
              {icon && (
                isVictory && winner !== "draw" ? (
                  <m.div
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {icon}
                  </m.div>
                ) : (
                  icon
                )
              )}
            </m.div>

            <AlertDialogTitle className="relative z-10 text-2xl">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="relative z-10 text-center">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <div className="flex w-full gap-2">
            {gameId && (
              <Button
                onClick={() => router.push(`/game/${gameId}/replay?analysis=true`)}
                variant="outline"
                className="flex-1"
              >
                Analyze Game
              </Button>
            )}
            <Button
              onClick={() => router.push("/game")}
              variant="outline"
              className="flex-1"
            >
              Main Menu
            </Button>
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
