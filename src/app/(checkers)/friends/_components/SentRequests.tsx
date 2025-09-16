import { api } from "~/trpc/server";
import { SentRequestItem } from "./SentRequestItem";

export async function SentRequests() {
  const sentRequests = await api.friendRequest.getSent();

  if (sentRequests.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No sent friend requests
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sentRequests.map((request: any) => (
        <SentRequestItem key={request.id} request={request} />
      ))}
    </div>
  );
}