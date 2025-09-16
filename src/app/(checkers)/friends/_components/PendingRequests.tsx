import { api } from "~/trpc/server";
import { PendingRequestItem } from "./PendingRequestItem";

export async function PendingRequests() {
  const pendingRequests = await api.user.getPendingFriendRequests();

  if (pendingRequests.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No pending friend requests
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {pendingRequests.map((request: any) => (
        <PendingRequestItem key={request.id} request={request} />
      ))}
    </div>
  );
}