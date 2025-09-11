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
import { Badge } from "~/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: conversations, refetch: refetchConversations } =
    api.message.getConversations.useQuery({
      enabled: !!session?.user,
    });

  const { data: conversation, refetch: refetchConversation } =
    api.message.getConversation.useQuery(
      { userId: selectedUserId ?? "", limit: 50 },
      { enabled: !!selectedUserId },
    );

  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      void refetchConversation();
      void refetchConversations();
    },
  });

  if (!session?.user) {
    router.push("/auth/signin");
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
                    setIsSheetOpen(true);
                  }}
                  className={`hover:bg-accent w-full rounded-lg p-2 text-left transition-colors ${
                    selectedUserId === conv.userId ? "bg-accent" : ""
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
                  <div className="mb-2 border-b pb-2">
                    <p className="font-semibold">
                      {selectedConversation?.user.name ??
                        selectedConversation?.user.username}
                    </p>
                  </div>
                  <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
                    {conversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.senderId === session.user.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-2 ${
                            msg.senderId === session.user.id
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
                <SheetTitle>
                  {selectedConversation?.user.name ??
                    selectedConversation?.user.username}
                </SheetTitle>
              </SheetHeader>
              {selectedUserId && conversation && (
                <div className="mt-4 flex h-[calc(100vh-120px)] flex-col">
                  <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
                    {conversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.senderId === session.user.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-2 ${
                            msg.senderId === session.user.id
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
