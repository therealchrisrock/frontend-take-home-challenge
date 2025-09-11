"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { GameProvider } from "~/lib/game/state/game-context";
import { GameScreen } from "~/app/(checkers)/_components/game/GameScreen";
import { MultiplayerGameProvider } from "~/app/(checkers)/_components/game/MultiplayerGameProvider";
import { MultiplayerGameScreen } from "~/app/(checkers)/_components/game/MultiplayerGameScreen";
import { api } from "~/trpc/react";
import TextSpinnerLoader from "~/components/ui/text-spinner-loader";

interface GameControllerProps {
  gameId?: string;
}

export function GameController({ gameId }: GameControllerProps) {
  const { data: session } = useSession();

  // If no gameId, create a new local game by default
  if (!gameId) {
    return (
      <GameProvider gameId={undefined} initialConfig={null}>
        <GameScreen />
      </GameProvider>
    );
  }

  // Fetch game data from the database
  const {
    data: gameData,
    isLoading,
    error,
  } = api.game.getById.useQuery(
    { id: gameId },
    {
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <TextSpinnerLoader />
        </div>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Game Not Found
          </h2>
          <p className="text-gray-600">
            The game you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Link
            href="/game"
            className="mt-4 inline-block text-amber-600 hover:text-amber-700"
          >
            Return to Game Menu
          </Link>
        </div>
      </div>
    );
  }

  // Determine if this is a multiplayer game
  const isMultiplayerGame = gameData.gameMode === 'online' || 
    (gameData.player1Id && gameData.player2Id) ||
    (gameData.player1Id && !gameData.player2Id); // Allow single player to be in multiplayer mode

  // For multiplayer games, use the enhanced multiplayer components
  if (isMultiplayerGame) {
    return (
      <GameProvider gameId={gameId} initialConfig={gameData}>
        <MultiplayerGameProvider gameId={gameId} userId={session?.user?.id}>
          <MultiplayerGameScreen />
        </MultiplayerGameProvider>
      </GameProvider>
    );
  }

  // For non-multiplayer games, use the standard components
  return (
    <GameProvider gameId={gameId} initialConfig={gameData}>
      <GameScreen />
    </GameProvider>
  );
}
