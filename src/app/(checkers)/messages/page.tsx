"use client";

import { formatDistanceToNow } from "date-fns";
import { Gamepad2, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { toast } from "~/components/ui/use-toast";
import { createSSEClient, type SSEClient } from "~/lib/sse/enhanced-client";
import { api } from "~/trpc/react";

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const desktopMessagesEndRef = useRef<HTMLDivElement>(null);
  const mobileMessagesEndRef = useRef<HTMLDivElement>(null);
  const sseClientRef = useRef<SSEClient | null>(null);

  const { data: conversations, refetch: refetchConversations } =
    api.message.getConversations.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: conversation, refetch: refetchConversation } =
    api.message.getConversation.useQuery(
      { userId: selectedUserId ?? "", limit: 50 },
      { enabled: !!selectedUserId },
    );

  // Enhanced SSE subscription for live message updates
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

    const tabId = `messages_page_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = `/api/messages/stream?tabId=${tabId}`;

    sseClientRef.current = createSSEClient({
      url,
      onMessage: (event) => {
        try {
          const payload = JSON.parse(event.data) as { type: string; data?: any };
          if (payload.type === "MESSAGE_CREATED") {
            void refetchConversations();
            const { senderId, receiverId } = payload.data ?? {};
            if (
              selectedUserId &&
              (senderId === selectedUserId || receiverId === selectedUserId)
            ) {
              void refetchConversation();
            }
          }
          if (payload.type === "MESSAGE_READ") {
            void refetchConversations();
            if (selectedUserId) void refetchConversation();
          }
        } catch (error) {
          console.error("Error processing messages page SSE message:", error);
        }
      },
      onOpen: () => {
        console.log("Messages page SSE connected");
      },
      onError: (error) => {
        console.error("Messages page SSE error:", error);
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

  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      void refetchConversation();
      void refetchConversations();
    },
  });

  const createGameInviteMutation = api.gameInvite.createInvitation.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Game invite sent!",
        description: "Your friend has been invited to play a game.",
      });
      // Navigate to the game page
      router.push(data.inviteUrl);
    },
    onError: (error) => {
      toast({
        title: "Failed to send invite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (session === null) {
      router.push("/auth/signin");
    }
  }, [session, router]);

  // Auto-scroll to bottom when new messages arrive (desktop)
  useEffect(() => {
    if (desktopMessagesEndRef.current) {
      desktopMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages]);

  // Auto-scroll to bottom when new messages arrive (mobile)
  useEffect(() => {
    if (mobileMessagesEndRef.current) {
      mobileMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages]);

  // Show loading state while checking session
  if (session === undefined) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Don't render anything if user is not authenticated (redirect will happen)
  if (!session?.user) {
    return null;
  }

  const handleSendMessage = () => {
    if (!selectedUserId || !messageInput.trim()) return;

    sendMessageMutation.mutate({
      receiverId: selectedUserId,
      content: messageInput.trim(),
    });
  };

  const selectedConversation = conversations?.find(
    (c) => c.userId === selectedUserId,
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Chat with your friends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Conversations List */}
            <div className="space-y-2 pr-4 md:border-r">
              <h3 className="mb-2 text-sm font-semibold">Conversations</h3>
              {conversations?.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No conversations yet
                </p>
              )}
              {conversations?.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => {
                    setSelectedUserId(conv.userId);
                    // Only open sheet on mobile (screen width < 768px)
                    if (window.innerWidth < 768) {
                      setIsSheetOpen(true);
                    }
                  }}
                  className={`hover:bg-accent w-full rounded-lg p-2 text-left transition-colors ${selectedUserId === conv.userId ? "bg-accent" : ""
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conv.user.image ?? undefined} />
                      <AvatarFallback>
                        {conv.user.name?.[0] ?? conv.user.username?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {conv.user.name ?? conv.user.username}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {conv.lastMessage.content}
                      </p>
                    </div>
                    <div className="text-right">
                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="mb-1">
                          {conv.unreadCount}
                        </Badge>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {formatDistanceToNow(conv.lastMessage.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop Message View */}
            <div className="hidden md:col-span-2 md:block">
              {selectedUserId && conversation ? (
                <div className="flex h-[500px] flex-col">
                  <div className="mb-2 flex items-center justify-between border-b pb-2">
                    <p className="font-semibold">
                      {selectedConversation?.user.name ??
                        selectedConversation?.user.username}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedUserId) {
                          createGameInviteMutation.mutate({
                            friendIds: [selectedUserId],
                            message: "Let's play a game of checkers!",
                            expiresIn: 24, // 24 hours
                          });
                        }
                      }}
                      disabled={createGameInviteMutation.isPending}
                      title="Challenge to a game"
                    >
                      <Gamepad2 className="h-4 w-4 mr-2" />
                      Challenge
                    </Button>
                  </div>
                  <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
                    {conversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === session.user.id
                          ? "justify-end"
                          : "justify-start"
                          }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-2 ${msg.senderId === session.user.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent"
                            }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {formatDistanceToNow(msg.createdAt, {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={desktopMessagesEndRef} />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground flex h-[500px] items-center justify-center">
                  Select a conversation to start messaging
                </div>
              )}
            </div>
          </div>

          {/* Mobile Message Sheet */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>
                    {selectedConversation?.user.name ??
                      selectedConversation?.user.username}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedUserId) {
                        createGameInviteMutation.mutate({
                          friendIds: [selectedUserId],
                          message: "Let's play a game of checkers!",
                          expiresIn: 24, // 24 hours
                        });
                      }
                    }}
                    disabled={createGameInviteMutation.isPending}
                    title="Challenge to a game"
                  >
                    <Gamepad2 className="h-4 w-4" />
                  </Button>
                </SheetTitle>
              </SheetHeader>
              {selectedUserId && conversation && (
                <div className="mt-4 flex h-[calc(100vh-120px)] flex-col">
                  <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
                    {conversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === session.user.id
                          ? "justify-end"
                          : "justify-start"
                          }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-2 ${msg.senderId === session.user.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent"
                            }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {formatDistanceToNow(msg.createdAt, {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={mobileMessagesEndRef} />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>
    </div>
  );
}
