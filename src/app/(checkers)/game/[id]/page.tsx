import { GameController } from "~/app/(checkers)/_components/game/GameController";

interface GamePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params;

  return <GameController gameId={id} />;
}
