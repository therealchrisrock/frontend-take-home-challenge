import { SimplifiedGameController } from "~/components/game/SimplifiedGameController";

interface GamePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SimplifiedGamePage({ params }: GamePageProps) {
  const { id } = await params;
  
  return <SimplifiedGameController gameId={id} />;
}