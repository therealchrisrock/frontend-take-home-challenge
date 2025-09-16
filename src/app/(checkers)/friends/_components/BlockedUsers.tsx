import { api } from "~/trpc/server";
import { BlockedUserItem } from "./BlockedUserItem";

export async function BlockedUsers() {
  const blockedUsers = await api.user.getBlockedUsers();

  if (blockedUsers.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No blocked users
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {blockedUsers.map((user) => (
        <BlockedUserItem key={user.id} user={user} />
      ))}
    </div>
  );
}