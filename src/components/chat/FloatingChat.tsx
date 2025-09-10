"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Users,
  Bell,
  Settings,
  Send,
  Minimize2,
  Hash,
  AtSign,
} from "lucide-react";
import { ChatFriendsPopup } from "./ChatFriendsPopup";
import { NotificationsPopup } from "./NotificationsPopup";
import { ChatSettingsPopup } from "./ChatSettingsPopup";
import { ChatMessages } from "./ChatMessages";
import type {
  FloatingChatProps,
  ChatChannel,
  ChatMessage,
  Notification,
  ThemeSettings,
} from "./types";

export function FloatingChat({ initialPosition }: FloatingChatProps) {
  const { data: session } = useSession();
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized
  const [position, setPosition] = useState(() => {
    if (initialPosition) return initialPosition;
    // Default to bottom right corner
    return {
      x: typeof window !== "undefined" ? window.innerWidth - 420 : 20,
      y: typeof window !== "undefined" ? window.innerHeight - 100 : 20,
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState("");
  const [currentChannel, setCurrentChannel] = useState<ChatChannel>({
    id: "general",
    name: "General",
    type: "general",
    unreadCount: 0,
  });

  // Popup states
  const [showFriends, setShowFriends] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  const [settings, setSettings] = useState<ThemeSettings>({
    theme: "dark",
    chatOpacity: 0.95,
    fontSize: "medium",
    soundEnabled: true,
  });

  const chatRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!headerRef.current?.contains(e.target as Node)) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 400, e.clientX - dragOffset.x),
      );
      const newY = Math.max(
        0,
        Math.min(
          window.innerHeight - (isMinimized ? 60 : 400),
          e.clientY - dragOffset.y,
        ),
      );

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, isMinimized]);

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

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const totalUnread = channels.reduce(
    (sum, channel) => sum + channel.unreadCount,
    0,
  );

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
    setShowFriends(false);
  };

  if (!session?.user) return null;

  const chatStyle = {
    left: `${position.x}px`,
    top: `${position.y}px`,
    opacity: settings.chatOpacity,
    backgroundColor:
      settings.theme === "dark"
        ? "rgba(0, 0, 0, 0.9)"
        : "rgba(255, 255, 255, 0.9)",
  };

  return (
    <>
      <Card
        ref={chatRef}
        className={`fixed z-50 w-96 transition-all duration-200 select-none ${isMinimized ? "h-16" : "h-96"} ${settings.theme === "dark" ? "border-gray-600 text-white" : "border-gray-300"} ${isDragging ? "cursor-grabbing" : "cursor-auto"} `}
        style={chatStyle}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className={`flex cursor-grab items-center justify-between border-b p-3 active:cursor-grabbing ${settings.theme === "dark" ? "border-gray-600 bg-gray-800/50" : "border-gray-200 bg-gray-50/50"} `}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            {currentChannel.type === "dm" ? (
              <AtSign className="h-4 w-4" />
            ) : (
              <Hash className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{currentChannel.name}</span>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-5 text-xs">
                {totalUnread}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Channel Switcher for DMs */}
            {channels.length > 1 && (
              <select
                value={currentChannel.id}
                onChange={(e) => {
                  const channel = channels.find((c) => c.id === e.target.value);
                  if (channel) setCurrentChannel(channel);
                }}
                className={`cursor-pointer rounded border-0 bg-transparent px-2 py-1 text-xs ${settings.theme === "dark" ? "text-white" : "text-black"} `}
              >
                {channels.map((channel) => (
                  <option
                    key={channel.id}
                    value={channel.id}
                    className="bg-gray-800 text-white"
                  >
                    {channel.type === "dm"
                      ? `@${channel.name}`
                      : `#${channel.name}`}
                    {channel.unreadCount > 0 && ` (${channel.unreadCount})`}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0 hover:bg-gray-700/50"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
              <ChatMessages
                messages={messages.filter((m) =>
                  currentChannel.type === "general"
                    ? m.type === "general"
                    : m.channelId === currentChannel.id,
                )}
                currentUserId={session.user.id}
                theme={settings.theme}
                fontSize={settings.fontSize}
              />
            </div>

            {/* Input and Navigation Bar */}
            <div
              className={`space-y-2 border-t p-3 ${settings.theme === "dark" ? "border-gray-600 bg-gray-800/50" : "border-gray-200 bg-gray-50/50"} `}
            >
              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${currentChannel.type === "dm" ? `@${currentChannel.name}` : "#" + currentChannel.name}`}
                  className={`h-8 flex-1 text-sm ${
                    settings.theme === "dark"
                      ? "border-gray-600 bg-gray-700 text-white placeholder:text-gray-400"
                      : "border-gray-300 bg-white"
                  } `}
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

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFriends(true)}
                    className={`h-8 px-2 text-xs ${
                      settings.theme === "dark"
                        ? "text-gray-300 hover:bg-gray-700"
                        : "hover:bg-gray-200"
                    } `}
                  >
                    <Users className="mr-1 h-4 w-4" />
                    Friends
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotifications(true)}
                    className={`relative h-8 px-2 text-xs ${
                      settings.theme === "dark"
                        ? "text-gray-300 hover:bg-gray-700"
                        : "hover:bg-gray-200"
                    } `}
                  >
                    <Bell className="mr-1 h-4 w-4" />
                    {unreadNotifications > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center p-0 text-xs"
                      >
                        {unreadNotifications}
                      </Badge>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs ${settings.theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                  >
                    21:39
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className={`h-8 w-8 p-0 ${
                      settings.theme === "dark"
                        ? "text-gray-300 hover:bg-gray-700"
                        : "hover:bg-gray-200"
                    } `}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Popups */}
      <ChatFriendsPopup
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
        onOpenDM={handleOpenDM}
        theme={settings.theme}
      />

      <NotificationsPopup
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onNotificationRead={(id) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
          );
        }}
        theme={settings.theme}
      />

      <ChatSettingsPopup
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </>
  );
}
