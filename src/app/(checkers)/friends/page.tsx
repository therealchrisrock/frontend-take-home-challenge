import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { FriendsClient } from "./_components/FriendsClient";
import { FriendsList } from "./_components/FriendsList";
import { PendingRequests } from "./_components/PendingRequests";
import { SentRequests } from "./_components/SentRequests";
import { BlockedUsers } from "./_components/BlockedUsers";

export default async function FriendsPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Pre-fetch data for initial render and counts
  const [friends, pendingRequests, sentRequests] = await Promise.all([
    api.user.getFriends(),
    api.user.getPendingFriendRequests(),
    api.friendRequest.getSent(),
  ]);

  return (
    <HydrateClient>
      <FriendsClient 
        friendsCount={friends.length} 
        requestsCount={pendingRequests.length}
        sentRequestsCount={sentRequests.length}
      >
        {{
          friends: <FriendsList />,
          requests: <PendingRequests />,
          sent: <SentRequests />,
          blocked: <BlockedUsers />,
        }}
      </FriendsClient>
    </HydrateClient>
  );
}
