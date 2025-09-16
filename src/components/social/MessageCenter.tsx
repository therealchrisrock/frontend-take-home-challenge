"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { toast } from "~/hooks/use-toast";
import { createSSEClient, type SSEClient } from "~/lib/sse/enhanced-client";
import { api } from "~/trpc/react";

export function MessageCenter() {
  const { data: session } = useSession();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseClientRef = useRef<SSEClient | null>(null);

  // API queries
  const { data: conversations, refetch: refetchConversations } =
    api.message.getConversations.useQuery(undefined, {
      enabled: !!session?.user,
      refetchInterval: 30000,
    });

  const { data: conversation, refetch: refetchConversation } =
    api.message.getConversation.useQuery(
      { userId: selectedUserId ?? "", limit: 50 },
      { enabled: !!selectedUserId, refetchInterval: 5000 },
    );

  // Enhanced SSE subscription for real-time message updates
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

    const tabId = `message_center_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = `/api/messages/stream?tabId=${tabId}`;

    sseClientRef.current = createSSEClient({
      url,
      onMessage: (event) => {
        try {
          const payload = JSON.parse(event.data) as { type: string; data?: any };
          if (payload.type === "MESSAGE_CREATED") {
            const { senderId, receiverId } = payload.data ?? {};
            // Always refresh conversation list for unread counts and last message
            void refetchConversations();
            // If event is from/to the selected user, refresh thread
            if (
              selectedUserId &&
              (senderId === selectedUserId || receiverId === selectedUserId)
            ) {
              void refetchConversation();
            }
          }
          if (payload.type === "MESSAGE_READ") {
            // Refresh counts and thread
            void refetchConversations();
            if (selectedUserId) void refetchConversation();
          }
        } catch (error) {
          console.error("Error processing message center SSE message:", error);
        }
      },
      onOpen: () => {
        console.log("Message center SSE connected");
      },
      onError: (error) => {
        console.error("Message center SSE error:", error);
      },
      autoConnect: true,
    });

    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.destroy();
        sseClientRef.current = null;
      }
    };
  }, [session?.user?.id, selectedUserId, refetchConversations, refetchConversation]);

  // API mutations
  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      void refetchConversation();
      void refetchConversations();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = api.message.markAsRead.useMutation({
    onSuccess: () => {
      void refetchConversations();
    },
  });

  // Auto-scroll to bottom when new messages arrive or when conversation changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages, selectedUserId]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedUserId && conversation?.messages) {
      const unreadMessages = conversation.messages.filter(
        (msg) => msg.receiverId === session?.user?.id && !msg.read,
      );

      unreadMessages.forEach((msg) => {
        markAsReadMutation.mutate({ messageId: msg.id });
      });
    }
  }, [
    selectedUserId,
    conversation?.messages,
    session?.user?.id,
    markAsReadMutation,
  ]);

  if (!session?.user) return null;

  const handleSendMessage = () => {
    if (!selectedUserId || !messageInput.trim()) return;

    sendMessageMutation.mutate({
      receiverId: selectedUserId,
      content: messageInput.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedConversation = conversations?.find(
    (c) => c.userId === selectedUserId,
  );

  // Filter conversations based on search
  const filteredConversations = conversations?.filter(
    (conv) =>
      (conv.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false) ||
      conv.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.content
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <div
        className={`${selectedUserId ? "hidden md:block" : "block"} flex w-full flex-col border-r md:w-80`}
      >
        <div className="border-b p-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations?.length === 0 && !searchQuery && (
            <div className="text-muted-foreground px-4 py-8 text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">
                Send a message to a friend to start chatting
              </p>
            </div>
          )}

          {filteredConversations?.length === 0 && searchQuery && (
            <div className="text-muted-foreground px-4 py-8 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No conversations found</p>
            </div>
          )}

          <div className="space-y-1">
            {filteredConversations?.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => setSelectedUserId(conv.userId)}
                className={`hover:bg-accent w-full p-3 text-left transition-colors ${selectedUserId === conv.userId ? "bg-accent" : ""
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.user.image ?? undefined} />
                      <AvatarFallback>
                        {conv.user.name?.[0] ?? conv.user.username?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                      >
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between">
                      <p className="truncate text-sm font-medium">
                        {conv.user.name ?? conv.user.username}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDistanceToNow(conv.lastMessage.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {conv.lastMessage.senderId === session.user.id
                        ? "You: "
                        : ""}
                      {conv.lastMessage.content}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Message View */}
      <div
        className={`${selectedUserId ? "flex" : "hidden md:flex"} flex-1 flex-col`}
      >
        {selectedUserId && selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserId(null)}
                  className="md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar>
                  <AvatarImage
                    src={selectedConversation.user.image ?? undefined}
                  />
                  <AvatarFallback>
                    {selectedConversation.user.name?.[0] ??
                      selectedConversation.user.username?.[0] ??
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {selectedConversation.user.name ??
                      selectedConversation.user.username}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    @{selectedConversation.user.username}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear conversation
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all messages in this conversation.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            toast({
                              title: "Feature coming soon",
                              description:
                                "Conversation clearing will be implemented soon",
                            });
                          }}
                        >
                          Clear
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {conversation?.messages.map((msg, index) => {
                  const isOwn = msg.senderId === session.user.id;
                  const showAvatar =
                    index === 0 ||
                    conversation.messages[index - 1]?.senderId !== msg.senderId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex max-w-[70%] gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        {showAvatar && !isOwn && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={msg.sender.image ?? undefined} />
                            <AvatarFallback>
                              {msg.sender.name?.[0] ??
                                msg.sender.username?.[0] ??
                                "U"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!showAvatar && !isOwn && <div className="w-8" />}

                        <div
                          className={`rounded-lg p-3 ${isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent"
                            }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`mt-1 text-xs ${isOwn ? "opacity-70" : "text-muted-foreground"}`}
                          >
                            {formatDistanceToNow(msg.createdAt, {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    !messageInput.trim() || sendMessageMutation.isPending
                  }
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-4 h-16 w-16 opacity-50" />
              <p className="mb-2 text-lg">Select a conversation</p>
              <p className="text-sm">Choose a friend to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
