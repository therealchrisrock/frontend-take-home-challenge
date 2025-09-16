"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Check, X } from "lucide-react";
import { api } from "~/trpc/react";

interface PendingRequestItemProps {
  request: {
    id: string;
    sender: {
      id: string;
      username: string | null;
      name: string | null;
      image: string | null;
    };
  };
}

export function PendingRequestItem({ request }: PendingRequestItemProps) {
  const utils = api.useUtils();
  
  const respondRequestMutation = api.user.respondToFriendRequest.useMutation({
    onSuccess: () => {
      void utils.user.getPendingFriendRequests.invalidate();
      void utils.user.getFriends.invalidate();
    },
  });

  return (
    <div className="flex items-center justify-between rounded-lg p-3 hover:bg-accent">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={request.sender.image ?? undefined} />
          <AvatarFallback>
            {request.sender.name?.[0] ?? request.sender.username?.[0] ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">
            {request.sender.name ?? request.sender.username}
          </p>
          <p className="text-sm text-muted-foreground">
            @{request.sender.username}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            respondRequestMutation.mutate({
              friendshipId: request.id,
              accept: true,
            })
          }
          disabled={respondRequestMutation.isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            respondRequestMutation.mutate({
              friendshipId: request.id,
              accept: false,
            })
          }
          disabled={respondRequestMutation.isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}