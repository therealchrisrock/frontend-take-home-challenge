"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Bell, Check, X, UserPlus, MessageSquare } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface NotificationDropdownProps {
  messageCount: number;
}

export function NotificationDropdown({
  messageCount,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Queries
  const { data: friendRequestCount, refetch: refetchFriendRequestCount } =
    api.user.getFriendRequestNotificationCount.useQuery({
      refetchInterval: 30000,
    });

  const {
    data: friendRequestNotifications,
    refetch: refetchFriendRequestNotifications,
  } = api.user.getFriendRequestNotifications.useQuery({
    enabled: isOpen,
    refetchInterval: 10000,
  });

  // Mutations
  const respondRequestMutation = api.user.respondToFriendRequest.useMutation({
    onSuccess: (_, variables) => {
      void refetchFriendRequestCount();
      void refetchFriendRequestNotifications();
      toast({
        title: "Success",
        description: variables.accept
          ? "Friend request accepted"
          : "Friend request declined",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Listen for friend request events to trigger refetch
  useEffect(() => {
    const handleFriendRequestEvent = () => {
      void refetchFriendRequestCount();
      void refetchFriendRequestNotifications();
    };

    window.addEventListener("friendRequestSent", handleFriendRequestEvent);

    return () => {
      window.removeEventListener("friendRequestSent", handleFriendRequestEvent);
    };
  }, [refetchFriendRequestCount, refetchFriendRequestNotifications]);

  const totalCount = (friendRequestCount?.count ?? 0) + messageCount;

  const handleAcceptRequest = (friendshipId: string) => {
    respondRequestMutation.mutate({ friendshipId, accept: true });
  };

  const handleDeclineRequest = (friendshipId: string) => {
    respondRequestMutation.mutate({ friendshipId, accept: false });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
              {totalCount > 99 ? "99+" : totalCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80" sideOffset={5}>
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Notifications</span>
            {totalCount > 0 && <Badge variant="secondary">{totalCount}</Badge>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="max-h-96">
          {/* Friend Request Notifications */}
          {friendRequestNotifications &&
            friendRequestNotifications.length > 0 && (
              <>
                <div className="px-2 py-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Friend Requests
                  </p>
                </div>
                {friendRequestNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border-b p-3 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={notification.sender.image ?? undefined}
                        />
                        <AvatarFallback>
                          {notification.sender.name?.[0] ??
                            notification.sender.username?.[0] ??
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-1">
                          <UserPlus className="h-4 w-4 text-blue-500" />
                          <p className="text-sm">
                            <Link
                              href={`/users/${notification.sender.username}`}
                              className="font-medium hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                              }}
                            >
                              {notification.sender.name ??
                                notification.sender.username}
                            </Link>
                            {" sent you a friend request"}
                          </p>
                        </div>
                        <p className="text-muted-foreground mb-2 text-xs">
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                          })}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(notification.id)}
                            disabled={respondRequestMutation.isPending}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDeclineRequest(notification.id)
                            }
                            disabled={respondRequestMutation.isPending}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

          {/* Message Notifications */}
          {messageCount > 0 && (
            <>
              <div className="px-2 py-1">
                <p className="text-muted-foreground text-sm font-medium">
                  Messages
                </p>
              </div>
              <div className="border-b p-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <p className="text-sm">
                    You have{" "}
                    <span className="font-medium">
                      {messageCount} unread message
                      {messageCount === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Go to Messages to read them
                </p>
              </div>
            </>
          )}

          {/* Empty State */}
          {totalCount === 0 && (
            <div className="text-muted-foreground py-6 text-center">
              <Bell className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p className="text-sm">No new notifications</p>
            </div>
          )}
        </ScrollArea>

        {totalCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer justify-center text-center">
              <span className="text-muted-foreground text-sm">
                View all notifications
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
