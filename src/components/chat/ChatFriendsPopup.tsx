"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
  Shield,
  Users,
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

interface ChatFriendsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDM: (userId: string, userName: string) => void;
  theme: "light" | "dark" | "system";
}

export function ChatFriendsPopup({
  isOpen,
  onClose,
  onOpenDM,
  theme,
}: ChatFriendsPopupProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  // API queries - reusing existing social endpoints
  const { data: friends, refetch: refetchFriends } =
    api.user.getFriends.useQuery({
      enabled: !!session?.user && isOpen,
    });

  const { data: pendingRequests, refetch: refetchRequests } =
    api.user.getPendingFriendRequests.useQuery({
      enabled: !!session?.user && isOpen,
    });

  const { data: blockedUsers, refetch: refetchBlocked } =
    api.user.getBlockedUsers.useQuery({
      enabled: !!session?.user && isOpen,
    });

  const { data: searchResults } = api.user.searchUsers.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 && isOpen },
  );

  // API mutations
  const sendRequestMutation = api.friendRequest.send.useMutation({
    onSuccess: () => {
      void refetchRequests();
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully",
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

  const respondRequestMutation = api.user.respondToFriendRequest.useMutation({
    onSuccess: (_, variables) => {
      void refetchRequests();
      void refetchFriends();
      toast({
        title: variables.accept ? "Friend added" : "Request declined",
        description: variables.accept
          ? "You are now friends!"
          : "Friend request declined",
      });
    },
  });

  const removeFriendMutation = api.user.removeFriend.useMutation({
    onSuccess: () => {
      void refetchFriends();
      toast({
        title: "Friend removed",
        description: "Friend has been removed from your list",
      });
    },
  });

  const blockUserMutation = api.user.blockUser.useMutation({
    onSuccess: () => {
      void refetchFriends();
      void refetchBlocked();
      toast({
        title: "User blocked",
        description: "User has been blocked successfully",
      });
    },
  });

  const unblockUserMutation = api.user.unblockUser.useMutation({
    onSuccess: () => {
      void refetchBlocked();
      toast({
        title: "User unblocked",
        description: "User has been unblocked",
      });
    },
  });

  if (!session?.user) return null;

  const isFriend = (userId: string) => friends?.some((f) => f.id === userId);
  const isPending = (userId: string) =>
    pendingRequests?.some((r) => r.sender.id === userId);
  const isBlocked = (userId: string) =>
    blockedUsers?.some((u) => u.id === userId);

  const themeClasses =
    theme === "dark"
      ? "bg-gray-900 text-white border-gray-700"
      : "bg-white text-black border-gray-200";

  const tabClasses =
    theme === "dark"
      ? "data-[state=active]:bg-gray-800 data-[state=active]:text-white"
      : "data-[state=active]:bg-gray-100";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`h-[600px] max-w-2xl ${themeClasses}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends & Social
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="flex flex-1 flex-col">
          <TabsList
            className={`grid grid-cols-4 ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <TabsTrigger value="friends" className={tabClasses}>
              Friends {friends && friends.length > 0 && `(${friends.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests" className={tabClasses}>
              Requests{" "}
              {pendingRequests &&
                pendingRequests.length > 0 &&
                `(${pendingRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="search" className={tabClasses}>
              <Search className="mr-1 h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="blocked" className={tabClasses}>
              Blocked
            </TabsTrigger>
          </TabsList>

          {/* Friends List */}
          <TabsContent value="friends" className="mt-4 flex-1">
            <ScrollArea className="h-[450px]">
              {friends?.length === 0 && (
                <div
                  className={`py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                >
                  <UserPlus className="mx-auto mb-4 h-16 w-16 opacity-50" />
                  <p className="mb-2 text-lg">No friends yet</p>
                  <p className="text-sm">Search for users to add as friends</p>
                </div>
              )}
              <div className="space-y-3">
                {friends?.map((friend) => (
                  <div
                    key={friend.id}
                    className={`flex items-center justify-between rounded-lg p-4 transition-colors ${
                      theme === "dark"
                        ? "border border-gray-700 hover:bg-gray-800"
                        : "border border-gray-200 hover:bg-gray-50"
                    } `}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.image ?? undefined} />
                        <AvatarFallback>
                          {friend.name?.[0] ?? friend.username?.[0] ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/users/${friend.username}`}
                          className="font-medium hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                          }}
                        >
                          {friend.name ?? friend.username}
                        </Link>
                        <p
                          className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                        >
                          @{friend.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onOpenDM(friend.id, friend.name ?? friend.username)
                        }
                        title="Send direct message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          blockUserMutation.mutate({ userId: friend.id })
                        }
                        title="Block user"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            title="Remove friend"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className={themeClasses}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
                            <AlertDialogDescription
                              className={
                                theme === "dark" ? "text-gray-300" : ""
                              }
                            >
                              Are you sure you want to remove{" "}
                              {friend.name ?? friend.username} as a friend?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                removeFriendMutation.mutate({
                                  userId: friend.id,
                                })
                              }
                              className="bg-red-600 hover:bg-red-700"
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
          <TabsContent value="requests" className="mt-4 flex-1">
            <ScrollArea className="h-[450px]">
              {pendingRequests?.length === 0 && (
                <div
                  className={`py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                >
                  <Check className="mx-auto mb-4 h-16 w-16 opacity-50" />
                  <p className="mb-2 text-lg">No pending requests</p>
                </div>
              )}
              <div className="space-y-3">
                {pendingRequests?.map((request) => (
                  <div
                    key={request.id}
                    className={`flex items-center justify-between rounded-lg p-4 transition-colors ${
                      theme === "dark"
                        ? "border border-gray-700 hover:bg-gray-800"
                        : "border border-gray-200 hover:bg-gray-50"
                    } `}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.sender.image ?? undefined} />
                        <AvatarFallback>
                          {request.sender.name?.[0] ??
                            request.sender.username?.[0] ??
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/users/${request.sender.username}`}
                          className="font-medium hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                          }}
                        >
                          {request.sender.name ?? request.sender.username}
                        </Link>
                        <p
                          className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                        >
                          @{request.sender.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          respondRequestMutation.mutate({
                            friendshipId: request.id,
                            accept: true,
                          })
                        }
                        title="Accept request"
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          respondRequestMutation.mutate({
                            friendshipId: request.id,
                            accept: false,
                          })
                        }
                        title="Decline request"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Search Users */}
          <TabsContent value="search" className="mt-4 flex-1">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Search for users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 ${theme === "dark" ? "border-gray-700 bg-gray-800" : ""}`}
                />
              </div>
              <ScrollArea className="h-[400px]">
                {searchQuery.length > 2 && searchResults?.length === 0 && (
                  <div
                    className={`py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                  >
                    <Search className="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p className="mb-2 text-lg">No users found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                )}
                {searchQuery.length <= 2 && (
                  <div
                    className={`py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                  >
                    <Search className="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p className="mb-2 text-lg">Search for friends</p>
                    <p className="text-sm">
                      Type at least 3 characters to search
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {searchResults?.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between rounded-lg p-4 transition-colors ${
                        theme === "dark"
                          ? "border border-gray-700 hover:bg-gray-800"
                          : "border border-gray-200 hover:bg-gray-50"
                      } `}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.image ?? undefined} />
                          <AvatarFallback>
                            {user.name?.[0] ?? user.username?.[0] ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.name ?? user.username}
                          </p>
                          <p
                            className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                          >
                            @{user.username}
                          </p>
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
                            onClick={() =>
                              sendRequestMutation.mutate({ userId: user.id })
                            }
                            disabled={sendRequestMutation.isPending}
                          >
                            <UserPlus className="mr-1 h-4 w-4" />
                            Add Friend
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
          <TabsContent value="blocked" className="mt-4 flex-1">
            <ScrollArea className="h-[450px]">
              {blockedUsers?.length === 0 && (
                <div
                  className={`py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                >
                  <Shield className="mx-auto mb-4 h-16 w-16 opacity-50" />
                  <p className="mb-2 text-lg">No blocked users</p>
                </div>
              )}
              <div className="space-y-3">
                {blockedUsers?.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between rounded-lg p-4 transition-colors ${
                      theme === "dark"
                        ? "border border-gray-700 hover:bg-gray-800"
                        : "border border-gray-200 hover:bg-gray-50"
                    } `}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback>
                          {user.name?.[0] ?? user.username?.[0] ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.name ?? user.username}
                        </p>
                        <p
                          className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                        >
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
      </DialogContent>
    </Dialog>
  );
}
