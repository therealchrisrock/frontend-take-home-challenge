"use client";

import { useState, useRef } from "react";
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
  Maximize2,
  Hash,
  AtSign,
} from "lucide-react";
import { ChatFriendsPopup } from "./ChatFriendsPopup";
import { NotificationsPopup } from "./NotificationsPopup";
import { ChatSettingsPopup } from "./ChatSettingsPopup";
import { ChatMessages } from "./ChatMessages";
import { m, AnimatePresence, useMotionValue } from "framer-motion";
import type { FloatingChatProps, ChatChannel } from "./types";

/**
 * Animated Floating Chat component with drag physics and smooth animations
 * Features momentum-based dragging and minimization animations
 */
export function MotionFloatingChat({ initialPosition }: FloatingChatProps) {
  const { data: session } = useSession();
  const [isMinimized, setIsMinimized] = useState(true);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Motion values for smooth dragging
  const x = useMotionValue(initialPosition?.x ?? window.innerWidth - 420);
  const y = useMotionValue(initialPosition?.y ?? window.innerHeight - 100);

  const [message, setMessage] = useState("");
  const [currentChannel] = useState<ChatChannel>({
    id: "general",
    name: "General",
    type: "general",
    unreadCount: 0,
  });

  // Popup states
  const [showFriends, setShowFriends] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const chatVariants = {
    minimized: {
      width: 350,
      height: 60,
      borderRadius: 30,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 30,
      },
    },
    expanded: {
      width: 400,
      height: 500,
      borderRadius: 12,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 30,
      },
    },
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  return (
    <>
      {/* Constraints for dragging */}
      <div
        ref={constraintsRef}
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 999 }}
      />

      <m.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={true}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
        style={{ x, y }}
        variants={chatVariants}
        initial="minimized"
        animate={isMinimized ? "minimized" : "expanded"}
        className="pointer-events-auto fixed z-[1000]"
        whileDrag={{ scale: 1.02 }}
      >
        <Card className="relative h-full w-full overflow-hidden border-gray-200 shadow-2xl">
          {/* Minimized View */}
          <AnimatePresence mode="wait">
            {isMinimized ? (
              <m.div
                key="minimized"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex h-full items-center justify-between px-4"
              >
                <div className="flex items-center gap-3">
                  <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Hash className="h-5 w-5 text-gray-500" />
                  </m.div>
                  <span className="font-medium text-gray-700">Chat</span>
                  {currentChannel.unreadCount > 0 && (
                    <m.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <Badge variant="destructive" className="rounded-full">
                        {currentChannel.unreadCount}
                      </Badge>
                    </m.div>
                  )}
                </div>
                <m.button
                  onClick={() => setIsMinimized(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Maximize2 className="h-4 w-4 text-gray-600" />
                </m.button>
              </m.div>
            ) : (
              <m.div
                key="expanded"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex h-full flex-col"
              >
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b bg-gray-50 p-4">
                  <div className="flex items-center gap-2">
                    <m.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      {currentChannel.type === "dm" ? (
                        <AtSign className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Hash className="h-4 w-4 text-gray-500" />
                      )}
                    </m.div>
                    <span className="font-semibold text-gray-700">
                      {currentChannel.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <m.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowFriends(!showFriends)}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    </m.div>

                    <m.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-8 w-8"
                        onClick={() => setShowNotifications(!showNotifications)}
                      >
                        <Bell className="h-4 w-4" />
                        <m.span
                          className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                      </Button>
                    </m.div>

                    <m.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowSettings(!showSettings)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </m.div>

                    <m.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsMinimized(true)}
                      >
                        <Minimize2 className="h-4 w-4" />
                      </Button>
                    </m.div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                  <ChatMessages
                    messages={[]}
                    currentUserId={session?.user?.id ?? ""}
                    theme="light"
                    fontSize="medium"
                  />
                </div>

                {/* Message Input */}
                <m.div
                  className="border-t bg-white p-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      // Handle send message
                      setMessage("");
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <m.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button type="submit" size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </m.div>
                  </form>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>
        </Card>
      </m.div>

      {/* Popup Components */}
      <AnimatePresence>
        {showFriends && (
          <ChatFriendsPopup
            isOpen={showFriends}
            onClose={() => setShowFriends(false)}
            onOpenDM={() => {
              // Handle opening a DM
              setShowFriends(false);
            }}
            theme="light"
          />
        )}

        {showNotifications && (
          <NotificationsPopup
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            notifications={[]}
            onNotificationRead={() => {
              // Handle marking notification as read
            }}
            theme="light"
          />
        )}

        {showSettings && (
          <ChatSettingsPopup
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            settings={{
              theme: "light",
              chatOpacity: 1,
              fontSize: "medium",
              soundEnabled: true,
            }}
            onSettingsChange={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
