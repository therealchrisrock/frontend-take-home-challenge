"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Users, Bell, Send, MessageCircle, Check, X } from "lucide-react";
import { ChatMessages } from "./ChatMessages";
import type {
  ChatChannel,
  ChatMessage,
  Notification,
  ThemeSettings,
} from "./types";

interface IntegratedChatProps {
  gameId?: string;
}

export function IntegratedChat({}: IntegratedChatProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [currentChannel, setCurrentChannel] = useState<ChatChannel>({
    id: "general",
    name: "General",
    type: "general",
    unreadCount: 0,
  });

  // Mock data - would be replaced with real API calls
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Friend Request",
      message: "John wants to be your friend",
      type: "friend_request",
      timestamp: new Date(),
      read: false,
      actionData: { userId: "john123" },
    },
    {
      id: "2",
      title: "Game Invite",
      message: "Sarah invited you to play",
      type: "system" as const,
      timestamp: new Date(),
      read: false,
      actionData: { gameId: "game456" },
    },
  ]);

  const [friends] = useState([
    { id: "1", name: "Alice", status: "online", avatar: "" },
    { id: "2", name: "Bob", status: "offline", avatar: "" },
    { id: "3", name: "Charlie", status: "in-game", avatar: "" },
  ]);

  const [channels, setChannels] = useState<ChatChannel[]>([
    {
      id: "general",
      name: "General",
      type: "general",
      unreadCount: 0,
    },
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: "Welcome to the general chat!",
      senderId: "system",
      senderName: "System",
      timestamp: new Date(),
      type: "general",
    },
  ]);

  const [settings] = useState<ThemeSettings>({
    theme: "light",
    chatOpacity: 0.95,
    fontSize: "medium",
    soundEnabled: true,
  });

  const handleSendMessage = () => {
    if (!message.trim() || !session?.user) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      senderId: session.user.id,
      senderName: session.user.name ?? session.user.username ?? "You",
      timestamp: new Date(),
      type: currentChannel.type,
      channelId: currentChannel.id,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOpenDM = (userId: string, userName: string) => {
    const dmChannelId = `dm_${userId}`;
    let dmChannel = channels.find((c) => c.id === dmChannelId);

    if (!dmChannel) {
      dmChannel = {
        id: dmChannelId,
        name: userName,
        type: "dm",
        participantId: userId,
        participantName: userName,
        unreadCount: 0,
      };
      setChannels((prev) => [...prev, dmChannel!]);
    }

    setCurrentChannel(dmChannel);
    setActiveTab("chat");
  };

  const handleNotificationAction = (
    notification: Notification,
    action: "accept" | "decline",
  ) => {
    // Handle notification actions
    if (notification.type === "friend_request") {
      // API call to accept/decline friend request
      if (notification.actionData?.userId) {
        console.log(
          `${action} friend request from ${notification.actionData.userId}`,
        );
      }
    } else if (notification.type === "game_invite") {
      // API call to accept/decline game invite
      if (notification.actionData?.gameId) {
        console.log(
          `${action} game invite for ${notification.actionData.gameId}`,
        );
      }
    }

    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );
  };

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const onlineFriends = friends.filter((f) => f.status === "online").length;
  console.log("session", session);
  if (!session?.user) return null;

  return (
    <Card className="flex h-full flex-col border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-amber-900">
          Communication Hub
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-1 flex-col"
        >
          <TabsList
            className="mx-4 mb-2 grid w-full grid-cols-3"
            style={{ width: "calc(100% - 2rem)" }}
          >
            <TabsTrigger value="chat" className="relative">
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat
              {channels.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
                <Badge variant="destructive" className="ml-2 h-4 px-1 text-xs">
                  {channels.reduce((sum, c) => sum + c.unreadCount, 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="friends" className="relative">
              <Users className="mr-2 h-4 w-4" />
              Friends
              {onlineFriends > 0 && (
                <Badge variant="secondary" className="ml-2 h-4 px-1 text-xs">
                  {onlineFriends}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="relative">
              <Bell className="mr-2 h-4 w-4" />
              Alerts
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="ml-2 h-4 px-1 text-xs">
                  {unreadNotifications}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="chat"
            className="flex flex-1 flex-col overflow-hidden px-4 pb-4"
          >
            {/* Channel Selector */}
            <div className="mb-2">
              <select
                value={currentChannel.id}
                onChange={(e) => {
                  const channel = channels.find((c) => c.id === e.target.value);
                  if (channel) setCurrentChannel(channel);
                }}
                className="w-full rounded border border-amber-300 bg-white/50 px-2 py-1 text-sm"
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.type === "dm"
                      ? `@${channel.name}`
                      : `#${channel.name}`}
                    {channel.unreadCount > 0 && ` (${channel.unreadCount})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Messages */}
            <div className="mb-2 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <ChatMessages
                  messages={messages.filter((m) =>
                    currentChannel.type === "general"
                      ? m.type === "general"
                      : m.channelId === currentChannel.id,
                  )}
                  currentUserId={session.user.id}
                  theme="light"
                  fontSize={settings.fontSize}
                />
              </ScrollArea>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${currentChannel.type === "dm" ? `@${currentChannel.name}` : "#" + currentChannel.name}`}
                className="h-8 flex-1 border-amber-300 bg-white/50 text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent
            value="friends"
            className="flex-1 overflow-hidden px-4 pb-4"
          >
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between rounded-lg bg-white/50 p-2 transition-colors hover:bg-white/70"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200">
                        {friend.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{friend.name}</p>
                        <p className="text-xs text-amber-600">
                          {friend.status === "online"
                            ? "🟢 Online"
                            : friend.status === "in-game"
                              ? "🎮 In Game"
                              : "⚫ Offline"}
                        </p>
                      </div>
                    </div>
                    {friend.status === "online" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDM(friend.id, friend.name)}
                        className="h-7 text-xs"
                      >
                        Message
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="notifications"
            className="flex-1 overflow-hidden px-4 pb-4"
          >
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-sm text-amber-600">
                    No new notifications
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-lg border p-3 ${
                        notification.read
                          ? "border-gray-200 bg-gray-50"
                          : "border-amber-300 bg-amber-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-xs text-amber-600">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(
                              notification.timestamp,
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.read &&
                          (notification.type === "friend_request" ||
                            notification.type === "game_invite") && (
                            <div className="ml-2 flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleNotificationAction(
                                    notification,
                                    "accept",
                                  )
                                }
                                className="h-6 w-6 p-0 hover:bg-green-100"
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleNotificationAction(
                                    notification,
                                    "decline",
                                  )
                                }
                                className="h-6 w-6 p-0 hover:bg-red-100"
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
