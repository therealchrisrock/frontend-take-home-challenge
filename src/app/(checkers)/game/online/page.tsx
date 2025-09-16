import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { OnlineGameWizard } from "~/app/(checkers)/_components/game/OnlineGameWizard";
import { getServerAuthSession } from "~/server/auth";

export const metadata: Metadata = {
  title: "Play with Friends",
  description:
    "Challenge friends to online checkers matches. Send invitations or create shareable links to play in real-time.",
  openGraph: {
    title: "Play Checkers with Friends - Birdseye Checkers",
    description: "Challenge friends or share game invites for real-time checkers matches.",
  },
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OnlineGamePage({ searchParams }: PageProps) {
  const session = await getServerAuthSession();
  
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/game/online");
  }
  
  const params = await searchParams;
  // Extract query parameters for friend pre-selection
  const friendId = typeof params.friendId === "string" ? params.friendId : undefined;
  const username = typeof params.username === "string" ? params.username : undefined;

  return (
    <OnlineGameWizard 
      preselectedFriendId={friendId}
      preselectedUsername={username}
      initialSession={session}
    />
  );
}
