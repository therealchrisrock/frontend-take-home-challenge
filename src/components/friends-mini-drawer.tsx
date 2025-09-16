"use client";

import { Bell, Gamepad2, MessageSquare, User, UserMinus } from "lucide-react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import {
  TabsUnderline,
  TabsUnderlineList,
  TabsUnderlineTrigger,
} from "~/components/ui/tabs";
import { useChatContext } from "~/contexts/ChatContext";
import { createSSEClient, type SSEClient } from "~/lib/sse/enhanced-client";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface FriendsMiniDrawerProps {
  className?: string;
}

const COLLAPSED = 64;
const EXPANDED = 336;

export function FriendsMiniDrawer({ className }: FriendsMiniDrawerProps) {
  // Basic data: friends with presence + unread count
  const { data: session } = useSession();
  const { data: friends, isLoading: friendsLoading } =
    api.user.getFriendsWithStatus.useQuery(
      undefined,
      {
        enabled: !!session?.user,
        staleTime: 10 * 1000, // 10 seconds - refresh presence data more frequently
        refetchInterval: 30 * 1000, // 30 seconds - periodic refetch for presence updates
      },
    );
  const { data: friendReqCount } = api.user.getFriendRequestNotificationCount.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    },
  );
  const {
    data: friendRequests,
    isLoading: friendRequestsLoading,
  } = api.user.getFriendRequestNotifications.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    },
  );
  const { data: conversations, isLoading: conversationsLoading } =
    api.message.getConversations.useQuery(
      undefined,
      {
        enabled: !!session?.user,
      },
    );

  // Unread messages count for bell badge
  const { data: unreadMsgCount } = api.message.getUnreadCount.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    },
  );

  const utils = api.useContext();
  const removeFriendMutation = api.friendRequest.removeFriend.useMutation({
    onMutate: async ({ userId }) => {
      // Cancel outgoing refetches
      await utils.user.getFriendsWithStatus.cancel();

      // Snapshot the previous value
      const previousFriends = utils.user.getFriendsWithStatus.getData();

      // Optimistically update by removing the friend
      if (previousFriends) {
        const updatedFriends = previousFriends.filter(friend => friend.id !== userId);
        utils.user.getFriendsWithStatus.setData(undefined, updatedFriends);

        // Also update local state immediately
        setReorderableFriends(updatedFriends);
      }

      return { previousFriends };
    },
    onError: (err, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousFriends) {
        utils.user.getFriendsWithStatus.setData(undefined, context.previousFriends);
        setReorderableFriends(context.previousFriends);
      }
    },
    onSuccess: () => {
      // Refetch friends data to ensure consistency
      void utils.user.getFriendsWithStatus.invalidate();
    },
  });

  // Manage reorderable friends list
  const [reorderableFriends, setReorderableFriends] = useState<Friend[]>([]);

  // Update reorderable list when friends data changes
  useMemo(() => {
    if (friends && friends.length > 0) {
      const sorted = [...friends].sort(
        (a, b) => Number(b.online) - Number(a.online),
      );
      setReorderableFriends(sorted);
    }
  }, [friends]);

  // Enhanced SSE subscription for real-time notifications
  const sseClientRef = useRef<SSEClient | null>(null);
  const tabIdRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && !tabIdRef.current) {
      tabIdRef.current = `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      // Clean up connection if user logs out
      if (sseClientRef.current) {
        sseClientRef.current.destroy();
        sseClientRef.current = null;
      }
      return;
    }

    // Disconnect existing client if any
    if (sseClientRef.current) {
      sseClientRef.current.destroy();
      sseClientRef.current = null;
    }

    const url = `/api/notifications/stream?tabId=${tabIdRef.current}`;

    sseClientRef.current = createSSEClient({
      url,
      onMessage: (event) => {
        console.log("friends drawer notification stream event", event);
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === "NOTIFICATION_CREATED") {
            const payload = msg?.payload ?? msg?.data; // accept either key during transition
            const ntype = payload?.type as string | undefined;
            if (
              ntype === "FRIEND_REQUEST" ||
              ntype === "FRIEND_REQUEST_ACCEPTED" ||
              ntype === "FRIEND_REQUEST_DECLINED"
            ) {
              void utils.user.getFriendRequestNotificationCount.invalidate();
              void utils.user.getFriendRequestNotifications.invalidate();
              if (ntype === "FRIEND_REQUEST_ACCEPTED") {
                void utils.user.getFriendsWithStatus.invalidate();
              }
            }
            if (ntype === "MESSAGE") {
              // Refresh unread message count
              void utils.message.getUnreadCount.invalidate();
            }
          }
          if (msg?.type === "presence") {
            void utils.user.getFriendsWithStatus.invalidate();
          }
        } catch (error) {
          console.error("Error processing friends drawer notification:", error);
        }
      },
      onOpen: () => {
        console.log("Friends drawer notification SSE connected");
      },
      onError: (error) => {
        console.error("Friends drawer notification SSE error:", error);
      },
      autoConnect: true,
    });

    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.destroy();
        sseClientRef.current = null;
      }
    };
  }, [session?.user?.id, utils.user, utils.message]);

  // Hover/open state controls staging and ensures we always open on Friends tab
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"friends" | "notifications">(
    "friends",
  );
  // Track which friend's dropdown is open to prevent drawer collapse
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  // Track avatar image load states to show per-avatar skeletons
  const [avatarLoadedMap, setAvatarLoadedMap] = useState<
    Record<string, boolean>
  >({});
  const markAvatarLoaded = (id: string) =>
    setAvatarLoadedMap((prev) => (prev[id] ? prev : { ...prev, [id]: true }));

  // Effect to close drawer when dropdown closes if not hovering
  useMemo(() => {
    if (!openDropdownId && !isOpen) {
      setIsOpen(false);
    }
  }, [openDropdownId, isOpen]);

  return (
    <motion.aside
      aria-label="Friends mini drawer"
      className={cn(
        "group fixed top-0 right-0 z-40 hidden h-screen overflow-hidden lg:flex",
        className,
      )}
      initial={false}
      animate={{ width: (isOpen || openDropdownId) ? EXPANDED : COLLAPSED }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      onHoverStart={() => {
        setIsOpen(true);
        setActiveTab("friends");
      }}
      onHoverEnd={() => {
        // Only close if no dropdown is open
        if (!openDropdownId) {
          setIsOpen(false);
        }
      }}
    >
      <div className="flex h-full w-full flex-col border-l border-gray-200 bg-white shadow-xl">
        {/* Header: use global header height so separators align perfectly */}
        <div className="relative h-[var(--header-height)] overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {!(isOpen || openDropdownId) ? (
              <motion.div
                key="collapsed-header"
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <motion.div
                  className="relative"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Bell className="h-6 w-6 text-gray-700" />
                  {(() => {
                    const total = (friendReqCount?.count ?? 0) + (unreadMsgCount?.count ?? 0);
                    return total > 0 ? (
                      <Badge className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full border-0 bg-red-600 px-1 text-[10px] text-white">
                        {total > 99 ? "99+" : total}
                      </Badge>
                    ) : null;
                  })()}
                </motion.div>
                {/* Mini underline indicator for collapsed state */}
                <motion.span
                  layoutId="mini-drawer-tabs"
                  className="absolute bottom-0 left-1/2 h-px w-8 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: "#e5e7eb" }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="expanded-header"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <TabsUnderline
                  value={activeTab}
                  onValueChange={(v) =>
                    setActiveTab(v as "friends" | "notifications")
                  }
                  layoutId="mini-drawer-tabs"
                  underlineColor="#7c3aed"
                  className="h-full"
                >
                  <TabsUnderlineList className="h-full">
                    <TabsUnderlineTrigger value="friends">
                      Friends
                    </TabsUnderlineTrigger>
                    <TabsUnderlineTrigger value="notifications">
                      <span className="relative inline-flex items-center">
                        <span>Notifications</span>
                        <span aria-hidden className="absolute -top-2 -right-2">
                          {(() => {
                            const total = (friendReqCount?.count ?? 0) + (unreadMsgCount?.count ?? 0);
                            return total > 0 ? (
                              <Badge className="h-5 min-w-5 rounded-full border-0 bg-red-600 px-1 text-[10px] text-white">
                                {total > 99 ? "99+" : total}
                              </Badge>
                            ) : null;
                          })()}
                        </span>
                      </span>
                    </TabsUnderlineTrigger>
                  </TabsUnderlineList>
                </TabsUnderline>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content: absolute panels stacked to prevent layout shifts */}
        <div className="relative w-full flex-1 overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {!(isOpen || openDropdownId) ? (
              <motion.div
                key="collapsed-content"
                className="absolute inset-0"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ScrollArea className="h-full w-full [--scrollbar-size:6px]">
                  <div className="flex flex-col items-center gap-2 pt-2 pb-6">
                    {friendsLoading
                      ? Array.from({ length: 8 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="relative flex h-12 w-full items-center justify-center"
                        >
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      ))
                      : (reorderableFriends ?? []).map((f) => {
                        const loaded = avatarLoadedMap[f.id] ?? !f.image;
                        return (
                          <div
                            key={f.id}
                            className="relative flex h-12 w-full items-center justify-center"
                          >
                            <motion.div
                              layoutId={`friend-avatar-${f.id}`}
                              className="relative"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={f.image ?? undefined}
                                  onLoad={() => markAvatarLoaded(f.id)}
                                  onError={() => markAvatarLoaded(f.id)}
                                />
                                <AvatarFallback>
                                  {f.name?.[0] ?? f.username?.[0] ?? "U"}
                                </AvatarFallback>
                              </Avatar>
                              {!loaded && (
                                <motion.div
                                  initial={{ opacity: 1 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute inset-0"
                                >
                                  <Skeleton className="h-full w-full rounded-full" />
                                </motion.div>
                              )}
                              <span
                                className={cn(
                                  "absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white",
                                  f.online ? "bg-emerald-500" : "bg-gray-300",
                                )}
                                aria-label={f.online ? "online" : "offline"}
                              />
                            </motion.div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </motion.div>
            ) : (
              <motion.div
                key="expanded-content"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ExpandedContent
                  friends={reorderableFriends ?? []}
                  setFriends={setReorderableFriends}
                  conversations={conversations ?? []}
                  friendRequests={friendRequests ?? []}
                  friendRequestsLoading={friendRequestsLoading}
                  isOpen={isOpen}
                  activeTab={activeTab}
                  friendsLoading={friendsLoading}
                  conversationsLoading={conversationsLoading}
                  avatarLoadedMap={avatarLoadedMap}
                  markAvatarLoaded={markAvatarLoaded}
                  removeFriendMutation={removeFriendMutation}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

interface Friend {
  id: string;
  username: string;
  image: string | null;
  name: string | null;
  online: boolean;
}

interface Conversation {
  userId: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    createdAt: Date;
    read: boolean;
    sender: {
      id: string;
      username: string;
      name: string | null;
      image: string | null;
    };
    receiver: {
      id: string;
      username: string;
      name: string | null;
      image: string | null;
    };
  };
  unreadCount: number;
}

interface FriendRequestNotificationItem {
  id: string;
  type: "FRIEND_REQUEST_RECEIVED";
  sender: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  createdAt: Date;
  read: boolean;
}

function ExpandedContent({
  friends,
  setFriends,
  conversations,
  friendRequests,
  isOpen,
  activeTab,
  friendsLoading,
  conversationsLoading,
  friendRequestsLoading,
  avatarLoadedMap = {},
  markAvatarLoaded,
  removeFriendMutation,
  openDropdownId,
  setOpenDropdownId,
}: {
  friends: Friend[];
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
  conversations: Conversation[];
  friendRequests: FriendRequestNotificationItem[];
  isOpen: boolean;
  activeTab: "friends" | "notifications";
  friendsLoading?: boolean;
  conversationsLoading?: boolean;
  friendRequestsLoading?: boolean;
  avatarLoadedMap?: Record<string, boolean>;
  markAvatarLoaded?: (id: string) => void;
  removeFriendMutation: ReturnType<typeof api.friendRequest.removeFriend.useMutation>;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
}) {
  const router = useRouter();
  const { openChat } = useChatContext();
  const utils = api.useContext();

  const markConversationAsReadMutation = api.message.markConversationAsRead.useMutation({
    onSuccess: () => {
      // Invalidate conversations to update unread counts
      void utils.message.getConversations.invalidate();
    },
  });

  const acceptMutation = api.friendRequest.accept.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.user.getFriendRequestNotificationCount.invalidate(),
        utils.user.getFriendRequestNotifications.invalidate(),
        utils.user.getFriendsWithStatus.invalidate(),
      ]);
    },
  });

  const declineMutation = api.friendRequest.decline.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.user.getFriendRequestNotificationCount.invalidate(),
        utils.user.getFriendRequestNotifications.invalidate(),
      ]);
    },
  });

  function FriendRequestActions({ requestId }: { requestId: string }) {
    const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!!loading}
          onClick={async () => {
            setLoading("accept");
            try {
              await acceptMutation.mutateAsync({ friendRequestId: requestId });
            } finally {
              setLoading(null);
            }
          }}
        >
          {loading === "accept" ? "Accepting..." : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!!loading}
          onClick={async () => {
            setLoading("decline");
            try {
              await declineMutation.mutateAsync({ friendRequestId: requestId });
            } finally {
              setLoading(null);
            }
          }}
        >
          {loading === "decline" ? "Declining..." : "Decline"}
        </Button>
      </div>
    );
  }
  return (
    <ScrollArea className="w-full flex-1">
      <div className="space-y-2 p-3">
        <AnimatePresence initial={false} mode="popLayout">
          {activeTab === "friends" ? (
            friendsLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex h-12 items-center gap-3 rounded-lg p-2"
                >
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <div className="h-1" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))
            ) : friends.length === 0 ? (
              <motion.div
                key="empty-f"
                className="p-2 text-sm text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                No friends yet
              </motion.div>
            ) : (
              <Reorder.Group
                as="div"
                axis="y"
                values={friends}
                onReorder={setFriends}
                className="list-none space-y-2"
              >
                {friends.map((f, idx) => {
                  const loaded = avatarLoadedMap?.[f.id] ?? !f.image;
                  return (
                    <Reorder.Item
                      key={f.id}
                      value={f}
                      className="group"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{
                        duration: 0.15,
                        delay: 0.05 * Math.min(idx, 3),
                      }}
                    >
                      <DropdownMenu
                        open={openDropdownId === f.id}
                        onOpenChange={(open) => setOpenDropdownId(open ? f.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <div className="flex h-12 cursor-pointer items-center gap-3 overflow-hidden rounded-lg p-2 transition-colors hover:bg-gray-50">
                            <motion.div
                              layoutId={`friend-avatar-${f.id}`}
                              className="pointer-events-none relative"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={f.image ?? undefined}
                                  onLoad={() => markAvatarLoaded?.(f.id)}
                                  onError={() => markAvatarLoaded?.(f.id)}
                                />
                                <AvatarFallback>
                                  {f.name?.[0] ?? f.username?.[0] ?? "U"}
                                </AvatarFallback>
                              </Avatar>
                              {!loaded && (
                                <motion.div
                                  initial={{ opacity: 1 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute inset-0"
                                >
                                  <Skeleton className="h-full w-full rounded-full" />
                                </motion.div>
                              )}
                              <span
                                className={cn(
                                  "absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white",
                                  f.online ? "bg-emerald-500" : "bg-gray-300",
                                )}
                              />
                            </motion.div>
                            <motion.div
                              className="pointer-events-none min-w-0 flex-1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15, delay: 0.2 }}
                            >
                              <div className="truncate text-sm leading-4 font-medium">
                                {f.name ?? f.username}
                              </div>
                              <div className="text-xs leading-4 text-gray-500">
                                @{f.username}
                              </div>
                            </motion.div>
                            <div
                              className={cn(
                                "pointer-events-none text-xs font-medium",
                                f.online ? "text-emerald-600" : "text-gray-400",
                              )}
                            >
                              {f.online ? "Online" : "Offline"}
                            </div>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => router.push(`/game/online?username=${f.username}`)}
                          >
                            <Gamepad2 className="mr-2 h-4 w-4" />
                            Challenge to a game
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/users/${f.username}`)}
                          >
                            <User className="mr-2 h-4 w-4" />
                            View profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // Find if there's an active conversation with unread messages
                              const conversation = conversations.find(c => c.userId === f.id);
                              if (conversation && conversation.unreadCount > 0) {
                                markConversationAsReadMutation.mutate({ userId: f.id });
                              }

                              openChat({
                                id: f.id,
                                username: f.username,
                                name: f.name,
                                image: f.image,
                              });
                            }}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => removeFriendMutation.mutate({ userId: f.id })}
                            disabled={removeFriendMutation.isPending}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            {removeFriendMutation.isPending ? "Removing..." : "Remove friend"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            )
          ) : conversationsLoading && activeTab === "notifications" ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex h-12 items-center gap-3 rounded-lg p-2"
              >
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <div className="h-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="ml-auto h-5 w-6" />
              </div>
            ))
          ) : conversations.length === 0 && friendRequests.length === 0 ? (
            <motion.div
              key="empty-n"
              className="p-2 text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No notifications
            </motion.div>
          ) : (
            <div>
              {friendRequests.map((r) => (
                <motion.div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg p-2 bg-violet-50/50 border border-violet-100"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.sender.image ?? undefined} />
                    <AvatarFallback>
                      {r.sender.name?.[0] ?? r.sender.username?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {r.sender.name ?? r.sender.username}
                    </div>
                    <div className="text-xs text-gray-600">sent you a friend request</div>
                  </div>
                  <FriendRequestActions requestId={r.id} />
                </motion.div>
              ))}

              {conversations.map((c) => (
                <motion.div
                  key={c.userId}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 cursor-pointer"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => {
                    // Mark conversation as read if there are unread messages
                    if (c.unreadCount > 0) {
                      markConversationAsReadMutation.mutate({ userId: c.userId });
                    }

                    openChat({
                      id: c.userId,
                      username: c.user.username,
                      name: c.user.name,
                      image: c.user.image,
                    });
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.user.image ?? undefined} />
                    <AvatarFallback>
                      {c.user.name?.[0] ?? c.user.username?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {c.user.name ?? c.user.username}
                    </div>
                    <div className="max-w-[170px] truncate text-xs text-gray-500">
                      {c.lastMessage.content}
                    </div>
                  </div>
                  {c.unreadCount > 0 && (
                    <Badge className="ml-auto" variant="secondary">
                      {c.unreadCount}
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
