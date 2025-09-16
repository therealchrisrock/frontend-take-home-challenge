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
import { createSSEClient, type SSEClient } from "~/lib/sse/enhanced-client";
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
  const sseClientRef = useRef<SSEClient | null>(null);

  const { data: conversation, refetch: refetchConversation } =
    api.message.getConversation.useQuery(
      { userId: user.id, limit: 50 },
      { enabled: isOpen && !!session?.user }
    );

  // Enhanced SSE subscription for real-time message updates
  // Keep connection alive even when minimized for real-time updates
  useEffect(() => {
    if (!session?.user?.id) {
      // Clean up connection when user logs out
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

    const tabId = `popup_chat_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = `/api/messages/stream?tabId=${tabId}`;

    sseClientRef.current = createSSEClient({
      url,
      onMessage: (event) => {
        try {
          console.log("popup chat message stream event", event);
          const data = JSON.parse(event.data) as { type: string; data?: any };
          if (data.type === "MESSAGE_CREATED") {
            const { senderId, receiverId } = data.data ?? {};
            if (senderId === user.id || receiverId === user.id) {
              void refetchConversation();
            }
          }
          if (data.type === "MESSAGE_READ") {
            // Re-fetch to update read state if visible
            void refetchConversation();
          }
        } catch (error) {
          console.error("Error processing popup chat SSE message:", error);
        }
      },
      onOpen: () => {
        console.log(`Popup chat SSE connected for user ${user.username}`);
      },
      onError: (error) => {
        console.error(`Popup chat SSE error for user ${user.username}:`, error);
      },
      autoConnect: true,
    });

    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.destroy();
        sseClientRef.current = null;
      }
    };
  }, [session?.user?.id, user.id, user.username, refetchConversation]);

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages]);

  if (!session?.user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.95, y: 0, originY: 1 }}
          animate={{ opacity: 1, scale: 1, y: 0, originY: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 0, originY: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "fixed bottom-4 left-4 z-50 flex h-[500px] w-80 flex-col overflow-hidden rounded-lg border bg-background shadow-2xl origin-bottom transform-gpu",
            className
          )}
          style={style}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-muted/30 px-3 py-2">
            <Link
              href={`/profile/${user.username}`}
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
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {conversation?.messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Start a conversation with {user.name ?? user.username}
                </div>
              )}
              {conversation?.messages.map((msg) => (
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
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="mt-1 text-xs opacity-70">
                      {formatDistanceToNow(msg.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
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
            {user.name?.[0] ?? user.username?.[0] ?? "U"}
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
          {user.name ?? user.username}
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