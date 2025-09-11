"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";
import { UserPlus, UserMinus, Check, X, MessageSquare } from "lucide-react";

export default function FriendsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friends, refetch: refetchFriends } =
    api.user.getFriends.useQuery({ enabled: !!session?.user });

  const { data: pendingRequests, refetch: refetchRequests } =
    api.user.getPendingFriendRequests.useQuery({
      enabled: !!session?.user,
    });

  const { data: blockedUsers, refetch: refetchBlocked } =
    api.user.getBlockedUsers.useQuery({ enabled: !!session?.user });

  const { data: searchResults } = api.user.searchUsers.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 },
  );

  const sendRequestMutation = api.user.sendFriendRequest.useMutation({
    onSuccess: () => refetchRequests(),
  });

  const respondRequestMutation = api.user.respondToFriendRequest.useMutation({
    onSuccess: () => {
      void refetchRequests();
      void refetchFriends();
    },
  });

  const removeFriendMutation = api.user.removeFriend.useMutation({
    onSuccess: () => refetchFriends(),
  });

  const unblockUserMutation = api.user.unblockUser.useMutation({
    onSuccess: () => refetchBlocked(),
  });

  if (!session?.user) {
    router.push("/auth/signin");
    return null;
  }

  const isFriend = (userId: string) => friends?.some((f) => f.id === userId);
  const isPending = (userId: string) =>
    pendingRequests?.some((r) => r.sender.id === userId);
  const isBlocked = (userId: string) =>
    blockedUsers?.some((u) => u.id === userId);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Friends</CardTitle>
          <CardDescription>Manage your friends and connections</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="friends">
                Friends {friends && friends.length > 0 && `(${friends.length})`}
              </TabsTrigger>
              <TabsTrigger value="requests">
                Requests{" "}
                {pendingRequests &&
                  pendingRequests.length > 0 &&
                  `(${pendingRequests.length})`}
              </TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="blocked">Blocked</TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-2">
              {friends?.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  You haven&apos;t added any friends yet
                </p>
              )}
              {friends?.map((friend) => (
                <div
                  key={friend.id}
                  className="hover:bg-accent flex items-center justify-between rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={friend.image ?? undefined} />
                      <AvatarFallback>
                        {friend.name?.[0] ?? friend.username?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {friend.name ?? friend.username}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        @{friend.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/messages?user=${friend.username}`)
                      }
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        removeFriendMutation.mutate({ userId: friend.id })
                      }
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="requests" className="space-y-2">
              {pendingRequests?.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No pending friend requests
                </p>
              )}
              {pendingRequests?.map((request) => (
                <div
                  key={request.id}
                  className="hover:bg-accent flex items-center justify-between rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.sender.image ?? undefined} />
                      <AvatarFallback>
                        {request.sender.name?.[0] ??
                          request.sender.username?.[0] ??
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {request.sender.name ?? request.sender.username}
                      </p>
                      <p className="text-muted-foreground text-sm">
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
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="search" className="space-y-2">
              <Input
                placeholder="Search for users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />
              {searchResults?.map((user) => (
                <div
                  key={user.id}
                  className="hover:bg-accent flex items-center justify-between rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback>
                        {user.name?.[0] ?? user.username?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {user.name ?? user.username}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                  <div>
                    {isFriend(user.id) ? (
                      <Button size="sm" variant="outline" disabled>
                        Friends
                      </Button>
                    ) : isPending(user.id) ? (
                      <Button size="sm" variant="outline" disabled>
                        Pending
                      </Button>
                    ) : isBlocked(user.id) ? (
                      <Button size="sm" variant="outline" disabled>
                        Blocked
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          sendRequestMutation.mutate({ userId: user.id })
                        }
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="blocked" className="space-y-2">
              {blockedUsers?.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No blocked users
                </p>
              )}
              {blockedUsers?.map((user) => (
                <div
                  key={user.id}
                  className="hover:bg-accent flex items-center justify-between rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback>
                        {user.name?.[0] ?? user.username?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {user.name ?? user.username}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      unblockUserMutation.mutate({ userId: user.id })
                    }
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
