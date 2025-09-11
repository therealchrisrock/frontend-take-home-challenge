import { type Metadata } from "next";
import { GameInviteScreen } from "~/app/(checkers)/_components/game/GameInviteScreen";

export const metadata: Metadata = {
  title: "Invite a Friend",
  description:
    "Invite friends to online checkers matches. Create invitations or shareable links to play in real-time.",
  openGraph: {
    title: "Invite a Friend to Play Checkers - Birdseye Checkers",
    description: "Send game invitations or create shareable links for real-time checkers matches.",
  },
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FriendGamePage({ searchParams }: PageProps) {
  const params = await searchParams;
  // Extract query parameters for friend pre-selection
  const friendId = typeof params.friendId === "string" ? params.friendId : undefined;
  const username = typeof params.username === "string" ? params.username : undefined;

  return (
    <GameInviteScreen 
      preselectedFriendId={friendId}
      preselectedUsername={username}
    />
  );
}
