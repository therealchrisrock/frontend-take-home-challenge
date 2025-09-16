"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { UserPlus, X, UserCheck } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/components/ui/use-toast";

interface SearchResultItemProps {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
  isFriend: boolean;
  isPendingReceived: boolean;
  isPendingSent: boolean;
  sentRequestId?: string;
  isBlocked: boolean;
  currentUserId?: string;
}

export function SearchResultItem({ 
  user, 
  isFriend, 
  isPendingReceived,
  isPendingSent,
  sentRequestId,
  isBlocked,
  currentUserId
}: SearchResultItemProps) {
  const utils = api.useUtils();
  const isOwnProfile = currentUserId === user.id;
  
  const sendRequestMutation = api.friendRequest.send.useMutation({
    onSuccess: () => {
      toast({
        title: "Friend request sent!",
        description: `Request sent to ${user.name ?? user.username}`,
      });
      void utils.user.getPendingFriendRequests.invalidate();
      void utils.user.searchUsers.invalidate();
      void utils.friendRequest.getSent.invalidate();
      void utils.friendRequest.getPending.invalidate();
    },
    onError: (error) => {
      // If error says request already exists, invalidate to get latest status
      if (error.message.includes("already exists")) {
        void utils.friendRequest.getSent.invalidate();
        void utils.user.searchUsers.invalidate();
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelRequestMutation = api.friendRequest.cancel.useMutation({
    onSuccess: () => {
      toast({
        title: "Request cancelled",
        description: "Friend request has been cancelled",
      });
      void utils.friendRequest.getSent.invalidate();
      void utils.user.searchUsers.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      <div>
        {isOwnProfile ? (
          <Button size="sm" variant="outline" disabled>
            This is you
          </Button>
        ) : isFriend ? (
          <Button size="sm" variant="outline" disabled>
            Friends
          </Button>
        ) : isPendingReceived ? (
          <Button size="sm" variant="outline" disabled>
            <UserCheck className="h-4 w-4" />
            Respond
          </Button>
        ) : isPendingSent ? (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => sentRequestId && cancelRequestMutation.mutate({ friendRequestId: sentRequestId })}
            disabled={cancelRequestMutation.isPending}
          >
            <X className="h-4 w-4" />
            Cancel Request
          </Button>
        ) : isBlocked ? (
          <Button size="sm" variant="outline" disabled>
            Blocked
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => sendRequestMutation.mutate({ userId: user.id })}
            disabled={sendRequestMutation.isPending}
          >
            <UserPlus className="h-4 w-4" />
            Add Friend
          </Button>
        )}
      </div>
    </div>
  );
}