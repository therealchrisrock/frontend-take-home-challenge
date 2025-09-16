import { api } from "~/trpc/server";
import { FriendItem } from "./FriendItem";

export async function FriendsList() {
  const friends = await api.user.getFriends();

  if (friends.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        You haven&apos;t added any friends yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {friends.map((friend) => (
        <FriendItem key={friend.id} friend={friend} />
      ))}
    </div>
  );
}