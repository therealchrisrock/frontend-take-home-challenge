"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameScreen } from "~/app/(checkers)/_components/game/GameScreen";
import TextSpinnerLoader from "~/components/ui/text-spinner-loader";
import { GameProvider } from "~/lib/game/state/game-context";
import { api } from "~/trpc/react";

interface GameControllerProps {
  gameId?: string;
}

export function GameController({ gameId }: GameControllerProps) {
  const router = useRouter();
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
            className="mt-4 inline-block text-primary-600 hover:text-primary-700"
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

  // For non-multiplayer games, use the standard components
  return (
    <GameProvider gameId={gameId} initialConfig={gameData}>
      <GameScreen />
    </GameProvider>
  );
}
