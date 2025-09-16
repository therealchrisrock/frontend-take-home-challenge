"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { MessageSquare, UserMinus } from "lucide-react";
import { api } from "~/trpc/react";

interface FriendItemProps {
  friend: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
}

export function FriendItem({ friend }: FriendItemProps) {
  const router = useRouter();
  const utils = api.useUtils();
  
  const removeFriendMutation = api.user.removeFriend.useMutation({
    onSuccess: () => {
      void utils.user.getFriends.invalidate();
    },
  });

  return (
    <div className="flex items-center justify-between rounded-lg p-3 hover:bg-accent">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={friend.image ?? undefined} />
          <AvatarFallback>
            {friend.name?.[0] ?? friend.username?.[0] ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{friend.name ?? friend.username}</p>
          <p className="text-sm text-muted-foreground">@{friend.username}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/messages?user=${friend.username}`)}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => removeFriendMutation.mutate({ userId: friend.id })}
          disabled={removeFriendMutation.isPending}
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}