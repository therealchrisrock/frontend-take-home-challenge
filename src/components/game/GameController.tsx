"use client";
import { GameProvider } from "~/features/game/state/game-context";
import { GameScreen } from "~/features/game/ui/GameScreen";
import { api } from "~/trpc/react";
import TextSpinnerLoader from "~/components/ui/text-spinner-loader";

interface GameControllerProps {
  gameId?: string;
}

export function GameController({ gameId }: GameControllerProps) {
  // If no gameId, create a new local game by default
  if (!gameId) {
    return (
      <GameProvider gameId={undefined} initialConfig={null}>
        <GameScreen />
      </GameProvider>
    );
  }

  // Fetch game data from the database
  const { data: gameData, isLoading, error } = api.game.getById.useQuery(
    { id: gameId },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <TextSpinnerLoader />
        </div>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Game Not Found</h2>
          <p className="text-gray-600">The game you're looking for doesn't exist or has been deleted.</p>
          <a href="/game" className="mt-4 inline-block text-amber-600 hover:text-amber-700">
            Return to Game Menu
          </a>
        </div>
      </div>
    );
  }

  // Pass the fetched game configuration to the GameProvider
  return (
    <GameProvider gameId={gameId} initialConfig={gameData}>
      <GameScreen />
    </GameProvider>
  );
}