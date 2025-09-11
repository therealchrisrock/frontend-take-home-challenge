"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { motion, AnimatePresence, Reorder } from "motion/react";
import {
  TabsUnderline,
  TabsUnderlineList,
  TabsUnderlineTrigger,
} from "~/components/ui/tabs";

interface FriendsMiniDrawerProps {
  className?: string;
}

const COLLAPSED = 64;
const EXPANDED = 336;

export function FriendsMiniDrawer({ className }: FriendsMiniDrawerProps) {
  // Basic data: friends with presence + unread count
  const { data: session } = useSession();
  const { data: friends, isLoading: friendsLoading } =
    api.user.getFriendsWithStatus.useQuery(undefined, {
      enabled: !!session?.user,
    });
  const { data: unread } = api.message.getUnreadCount.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const { data: conversations, isLoading: conversationsLoading } =
    api.message.getConversations.useQuery(undefined, {
      enabled: !!session?.user,
    });

  // Manage reorderable friends list
  const [reorderableFriends, setReorderableFriends] = useState<typeof friends>(
    [],
  );

  // Update reorderable list when friends data changes
  useMemo(() => {
    if (friends && friends.length > 0) {
      const sorted = [...friends].sort(
        (a, b) => Number(b.online) - Number(a.online),
      );
      setReorderableFriends(sorted);
    }
  }, [friends]);

  // Hover/open state controls staging and ensures we always open on Friends tab
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"friends" | "notifications">(
    "friends",
  );
  // Track avatar image load states to show per-avatar skeletons
  const [avatarLoadedMap, setAvatarLoadedMap] = useState<
    Record<string, boolean>
  >({});
  const markAvatarLoaded = (id: string) =>
    setAvatarLoadedMap((prev) => (prev[id] ? prev : { ...prev, [id]: true }));

  return (
    <motion.aside
      aria-label="Friends mini drawer"
      className={cn(
        "group fixed top-0 right-0 z-40 hidden h-screen overflow-hidden lg:flex",
        className,
      )}
      initial={false}
      animate={{ width: COLLAPSED }}
      whileHover={{ width: EXPANDED }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      onHoverStart={() => {
        setIsOpen(true);
        setActiveTab("friends");
      }}
      onHoverEnd={() => setIsOpen(false)}
    >
      <div className="flex h-full w-full flex-col border-l border-gray-200 bg-white shadow-xl">
        {/* Header: use global header height so separators align perfectly */}
        <div className="relative h-[var(--header-height)] overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {!isOpen ? (
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
                  {unread?.count ? (
                    <Badge className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full border-0 bg-red-600 px-1 text-[10px] text-white">
                      {unread.count > 99 ? "99+" : unread.count}
                    </Badge>
                  ) : null}
                </motion.div>
                {/* Shared underline with the tabs underline */}
                <motion.span
                  layoutId="drawer-underline"
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
                  layoutId="drawer-underline"
                  underlineColor="#7c3aed"
                  className="h-full"
                >
                  <TabsUnderlineList className="h-full">
                    <TabsUnderlineTrigger value="friends">
                      Friends
                    </TabsUnderlineTrigger>
                    <TabsUnderlineTrigger value="notifications">
                      Notifications
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
            {!isOpen ? (
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
                  isOpen={isOpen}
                  activeTab={activeTab}
                  friendsLoading={friendsLoading}
                  conversationsLoading={conversationsLoading}
                  avatarLoadedMap={avatarLoadedMap}
                  markAvatarLoaded={markAvatarLoaded}
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
  image?: string | null;
  name?: string | null;
  online?: boolean;
  lastMessage?: string;
  timestamp?: Date;
}

interface Conversation {
  id: string;
  username: string;
  image?: string | null;
  name?: string | null;
  lastMessage?: string;
  timestamp?: Date;
}

function ExpandedContent({
  friends,
  setFriends,
  conversations,
  activeTab,
  friendsLoading,
  conversationsLoading,
  avatarLoadedMap = {},
  markAvatarLoaded,
}: {
  friends: Friend[];
  setFriends: (friends: Friend[]) => void;
  conversations: Conversation[];
  activeTab: "friends" | "notifications";
  friendsLoading?: boolean;
  conversationsLoading?: boolean;
  avatarLoadedMap?: Record<string, boolean>;
  markAvatarLoaded?: (id: string) => void;
}) {
  const router = useRouter();
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
                      <div
                        className="flex h-12 cursor-pointer items-center gap-3 overflow-hidden rounded-lg p-2 transition-colors hover:bg-gray-50"
                        onClick={() => router.push(`/users/${f.username}`)}
                      >
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
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            )
          ) : conversationsLoading ? (
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
          ) : conversations.length === 0 ? (
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
            conversations.map((c) => (
              <motion.div
                key={c.userId}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
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
            ))
          )}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
