"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

interface BlockedUserItemProps {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
}

export function BlockedUserItem({ user }: BlockedUserItemProps) {
  const utils = api.useUtils();
  
  const unblockUserMutation = api.user.unblockUser.useMutation({
    onSuccess: () => {
      void utils.user.getBlockedUsers.invalidate();
    },
  });

  return (
    <div className="flex items-center justify-between rounded-lg p-3 hover:bg-accent">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>
            {user.name?.[0] ?? user.username?.[0] ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{user.name ?? user.username}</p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => unblockUserMutation.mutate({ userId: user.id })}
        disabled={unblockUserMutation.isPending}
      >
        Unblock
      </Button>
    </div>
  );
}