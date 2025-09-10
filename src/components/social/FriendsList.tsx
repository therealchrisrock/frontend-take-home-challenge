"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { 
  UserPlus, 
  UserMinus, 
  Check, 
  X, 
  MessageSquare, 
  Search,
  Ban,
  Shield
} from "lucide-react";
import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { toast } from "~/hooks/use-toast";

export function FriendsList() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  // API queries
  const { data: friends, refetch: refetchFriends } = api.user.getFriends.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  const { data: pendingRequests, refetch: refetchRequests } = api.user.getPendingFriendRequests.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  const { data: blockedUsers, refetch: refetchBlocked } = api.user.getBlockedUsers.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  const { data: searchResults } = api.user.searchUsers.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  // API mutations
  const sendRequestMutation = api.user.sendFriendRequest.useMutation({
    onSuccess: () => {
      void refetchRequests();
      toast({
        title: "Success",
        description: "Friend request sent successfully",
      });
      // Trigger a refetch of the friend request count in the notification system
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('friendRequestSent'));
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const respondRequestMutation = api.user.respondToFriendRequest.useMutation({
    onSuccess: (_, variables) => {
      void refetchRequests();
      void refetchFriends();
      toast({
        title: "Success",
        description: variables.accept ? "Friend request accepted" : "Friend request declined",
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

  const removeFriendMutation = api.user.removeFriend.useMutation({
    onSuccess: () => {
      void refetchFriends();
      toast({
        title: "Success",
        description: "Friend removed successfully",
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

  const blockUserMutation = api.user.blockUser.useMutation({
    onSuccess: () => {
      void refetchFriends();
      void refetchBlocked();
      toast({
        title: "Success",
        description: "User blocked successfully",
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

  const unblockUserMutation = api.user.unblockUser.useMutation({
    onSuccess: () => {
      void refetchBlocked();
      toast({
        title: "Success",
        description: "User unblocked successfully",
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

  if (!session?.user) return null;

  // Helper functions
  const isFriend = (userId: string) => friends?.some(f => f.id === userId);
  const isPending = (userId: string) => pendingRequests?.some(r => r.sender.id === userId);
  const isBlocked = (userId: string) => blockedUsers?.some(u => u.id === userId);

  const handleSendMessage = (username: string) => {
    // This would typically open the message center with the user selected
    // For now, we'll show a toast
    toast({
      title: "Message",
      description: `Opening conversation with ${username}`,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="friends" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="friends">
            Friends {friends && friends.length > 0 && `(${friends.length})`}
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests {pendingRequests && pendingRequests.length > 0 && `(${pendingRequests.length})`}
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-1" />
            Search
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Blocked
          </TabsTrigger>
        </TabsList>

        {/* Friends List */}
        <TabsContent value="friends" className="flex-1">
          <ScrollArea className="h-[400px]">
            {friends?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No friends yet</p>
                <p className="text-sm">Search for users to add as friends</p>
              </div>
            )}
            <div className="space-y-2">
              {friends?.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
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
                      onClick={() => handleSendMessage(friend.username)}
                      title="Send message"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => blockUserMutation.mutate({ userId: friend.id })}
                      title="Block user"
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" title="Remove friend">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Friend</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {friend.name ?? friend.username} as a friend?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeFriendMutation.mutate({ userId: friend.id })}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Friend Requests */}
        <TabsContent value="requests" className="flex-1">
          <ScrollArea className="h-[400px]">
            {pendingRequests?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending requests</p>
              </div>
            )}
            <div className="space-y-2">
              {pendingRequests?.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.sender.image ?? undefined} />
                      <AvatarFallback>
                        {request.sender.name?.[0] ?? request.sender.username?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.sender.name ?? request.sender.username}</p>
                      <p className="text-sm text-muted-foreground">@{request.sender.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => respondRequestMutation.mutate({ friendshipId: request.id, accept: true })}
                      title="Accept request"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => respondRequestMutation.mutate({ friendshipId: request.id, accept: false })}
                      title="Decline request"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Search Users */}
        <TabsContent value="search" className="flex-1">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[350px]">
              {searchQuery.length > 2 && searchResults?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
              {searchQuery.length <= 2 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Type at least 3 characters to search</p>
                </div>
              )}
              <div className="space-y-2">
                {searchResults?.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
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
                      {isFriend(user.id) ? (
                        <Badge variant="secondary">Friends</Badge>
                      ) : isPending(user.id) ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : isBlocked(user.id) ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => sendRequestMutation.mutate({ userId: user.id })}
                          disabled={sendRequestMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Blocked Users */}
        <TabsContent value="blocked" className="flex-1">
          <ScrollArea className="h-[400px]">
            {blockedUsers?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No blocked users</p>
              </div>
            )}
            <div className="space-y-2">
              {blockedUsers?.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
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
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}