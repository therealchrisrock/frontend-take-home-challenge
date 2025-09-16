"use client";

import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  Gamepad2,
  MinusIcon,
  Send,
  X
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useMessages } from "~/hooks/useMessages";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface User {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

interface PopupChatProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onExternalOpen: () => void;
  onChallenge?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function PopupChat({
  user,
  isOpen,
  onClose,
  onMinimize,
  onExternalOpen,
  onChallenge,
  className,
  style,
}: PopupChatProps) {
  const { data: session } = useSession();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef(isOpen);
  const prevMessageCountRef = useRef(0);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: conversation, refetch: refetchConversation } =
    api.message.getConversation.useQuery(
      { userId: user.id, limit: 50 },
      { enabled: isOpen && !!session?.user }
    );

  // Live messages from EventContext for instant UI updates
  const { messages: liveMessages, unreadCount, markAsRead } = useMessages(user.id);

  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      void refetchConversation();
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    sendMessageMutation.mutate({
      receiverId: user.id,
      content: messageInput.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom when chat first opens
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    const isNowOpen = isOpen;

    if (!wasOpen && isNowOpen && messagesEndRef.current) {
      // Chat just opened, scroll to bottom and reset user scroll state
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setUserHasScrolled(false);
    }

    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive (only if user hasn't manually scrolled up)
  useEffect(() => {
    if (!isOpen) return;

    const currentMessageCount = (conversation?.messages?.length ?? 0) + liveMessages.length;
    const prevMessageCount = prevMessageCountRef.current;

    if (currentMessageCount > prevMessageCount && !userHasScrolled && messagesEndRef.current) {
      // New message(s) added and user hasn't scrolled up, scroll to bottom
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    prevMessageCountRef.current = currentMessageCount;
  }, [isOpen, conversation?.messages?.length, liveMessages.length, userHasScrolled]);

  // Auto-scroll when user sends a message
  useEffect(() => {
    if (sendMessageMutation.isSuccess && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setUserHasScrolled(false); // Reset scroll state when user sends message
    }
  }, [sendMessageMutation.isSuccess]);

  // Detect when user manually scrolls up
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50; // 50px threshold

    if (!isAtBottom && !userHasScrolled) {
      setUserHasScrolled(true);
    } else if (isAtBottom && userHasScrolled) {
      setUserHasScrolled(false); // Reset when user scrolls back to bottom
    }
  };

  // Mark as read in EventContext when the chat is open and there are unread messages
  useEffect(() => {
    if (!isOpen) return;
    if (unreadCount > 0) {
      markAsRead();
    }
  }, [isOpen, unreadCount, markAsRead]);

  // Merge server conversation with live EventContext messages for display
  const displayMessages = (() => {
    const serverMsgs = (conversation?.messages ?? []).map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      createdAt: new Date(m.createdAt),
    }));
    const live = liveMessages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      createdAt: new Date(m.createdAt),
    }));

    // Simple deduplication by ID - both server and live messages should have valid IDs
    const byId = new Map<string, { id: string; senderId: string; content: string; createdAt: Date }>();

    // Add server messages first
    for (const m of serverMsgs) {
      if (m.id) {
        byId.set(m.id, m);
      }
    }

    // Add live messages, only if not already present (server messages take precedence)
    for (const m of live) {
      if (m.id && !byId.has(m.id)) {
        byId.set(m.id, m);
      }
    }

    const merged = Array.from(byId.values());
    merged.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return merged;
  })();

  if (!session?.user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.95, y: 0, originY: 1 }}
          animate={{ opacity: 1, scale: 1, y: 0, originY: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 0, originY: 1 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className={cn(
            "fixed bottom-4 left-4 z-50 flex h-[500px] w-80 flex-col overflow-hidden rounded-lg border bg-background shadow-2xl origin-bottom transform-gpu",
            className
          )}
          style={style}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-muted/30 px-3 py-2">
            <Link
              href={`/users/${user.username}`}
              className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback>
                  {user.name?.[0] ?? user.username?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {user.name ?? user.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{user.username}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              {onChallenge && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onChallenge}
                  className="h-6 w-6 p-0"
                  title="Challenge to a game"
                >
                  <Gamepad2 className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onMinimize}
                className="h-6 w-6 p-0"
                title="Minimize chat"
              >
                <MinusIcon className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExternalOpen}
                className="h-6 w-6 p-0"
                title="Open in messages page"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
                title="Close chat"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3" onScrollCapture={handleScroll}>
            <div className="space-y-3">
              {displayMessages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Start a conversation with {user.name ?? user.username}
                </div>
              )}
              {displayMessages.map((msg) => {
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.senderId === session.user.id
                        ? "justify-end"
                        : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2",
                        msg.senderId === session.user.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm leading-relaxed break-all overflow-wrap-anywhere whitespace-pre-wrap">{msg.content}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {formatDistanceToNow(msg.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${user.name ?? user.username}...`}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendMessageMutation.isPending}
                size="sm"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MinimizedChatTabProps {
  user: User;
  unreadCount: number;
  onClick: () => void;
  onClose: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function MinimizedChatTab({
  user,
  unreadCount,
  onClick,
  onClose,
  style,
  className,
}: MinimizedChatTabProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scaleY: 0.9, originY: 1 }}
      animate={{ opacity: 1, scaleY: 1, originY: 1 }}
      exit={{ opacity: 0, scaleY: 0.9, originY: 1 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn(
        "fixed bottom-4 z-40 flex h-12 w-80 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 shadow-lg transition-all hover:shadow-xl origin-bottom transform-gpu",
        unreadCount > 0 && "ring-2 ring-primary animate-pulse-subtle",
        className
      )}
      style={style}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>
            {user.name?.trim()?.[0] || user.username?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <Badge className="absolute -right-1 -top-1 h-5 min-w-[20px] rounded-full px-1 text-[10px] bg-destructive text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          </motion.div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {user.name?.trim() || user.username}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
        title="Close chat"
      >
        <X className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}