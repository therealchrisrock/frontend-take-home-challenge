"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: conversations, refetch: refetchConversations } = api.message.getConversations.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  const { data: conversation, refetch: refetchConversation } = api.message.getConversation.useQuery(
    { userId: selectedUserId ?? "", limit: 50 },
    { enabled: !!selectedUserId }
  );

  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: () => {
      setMessageInput("");
      refetchConversation();
      refetchConversations();
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

  const selectedConversation = conversations?.find(c => c.userId === selectedUserId);

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Chat with your friends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Conversations List */}
            <div className="space-y-2 md:border-r pr-4">
              <h3 className="font-semibold text-sm mb-2">Conversations</h3>
              {conversations?.length === 0 && (
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              )}
              {conversations?.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => {
                    setSelectedUserId(conv.userId);
                    setIsSheetOpen(true);
                  }}
                  className={`w-full text-left p-2 rounded-lg hover:bg-accent transition-colors ${
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
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conv.user.name ?? conv.user.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage.content}
                      </p>
                    </div>
                    <div className="text-right">
                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="mb-1">
                          {conv.unreadCount}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(conv.lastMessage.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop Message View */}
            <div className="hidden md:block md:col-span-2">
              {selectedUserId && conversation ? (
                <div className="flex flex-col h-[500px]">
                  <div className="border-b pb-2 mb-2">
                    <p className="font-semibold">
                      {selectedConversation?.user.name ?? selectedConversation?.user.username}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {conversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.senderId === session.user.id ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-2 rounded-lg ${
                            msg.senderId === session.user.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatDistanceToNow(msg.createdAt, { addSuffix: true })}
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
                    <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[500px] text-muted-foreground">
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
                  {selectedConversation?.user.name ?? selectedConversation?.user.username}
                </SheetTitle>
              </SheetHeader>
              {selectedUserId && conversation && (
                <div className="flex flex-col h-[calc(100vh-120px)] mt-4">
                  <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {conversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.senderId === session.user.id ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-2 rounded-lg ${
                            msg.senderId === session.user.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatDistanceToNow(msg.createdAt, { addSuffix: true })}
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
                    <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
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