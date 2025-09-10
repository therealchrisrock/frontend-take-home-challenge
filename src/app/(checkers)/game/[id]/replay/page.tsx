import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import GameReplayController from "~/components/game/GameReplayController";

interface ReplayPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ analysis?: string }>;
}

export default async function GameReplayPage({
  params,
  searchParams,
}: ReplayPageProps) {
  const session = await getServerAuthSession();
  const { id } = await params;
  const { analysis } = await searchParams;

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const enableAnalysis = analysis === "true";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <GameReplayController
        gameId={id}
        userId={session.user.id}
        analysisMode={enableAnalysis}
      />
    </div>
  );
}
