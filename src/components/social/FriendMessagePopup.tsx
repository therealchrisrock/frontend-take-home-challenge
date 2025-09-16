"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Users, MessageCircle, X, Minus, Maximize2 } from "lucide-react";
import { FriendsList } from "./FriendsList";
import { MessageCenter } from "./MessageCenter";
import { useUnreadMessageCounts } from "~/hooks/useMessages";
import { useFriendRequests } from "~/hooks/useFriendRequests";
import type { SocialPopupProps, SocialTab } from "./types";

export function FriendMessagePopup({ isOpen, onClose }: SocialPopupProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<SocialTab>("friends");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Get real-time unread message count
  const { totalUnread } = useUnreadMessageCounts();

  // Get real-time pending friend requests count  
  const { requests: pendingRequests } = useFriendRequests();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "1" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setActiveTab("friends");
      } else if (event.key === "2" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setActiveTab("messages");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!session?.user) return null;

  const pendingCount = pendingRequests?.length ?? 0;
  const messageCount = totalUnread ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={` ${
          isMaximized
            ? "h-[95vh] w-full max-w-[95vw]"
            : "max-h-[80vh] w-full max-w-4xl"
        } ${isMinimized ? "h-16" : ""} overflow-hidden transition-all duration-200 ease-in-out`}
        showCloseButton={false}
      >
        {/* Custom Header with Controls */}
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b pb-4">
          <DialogTitle className="text-xl font-semibold">
            Social Center
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {!isMinimized && (
          <div className="flex-1 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as SocialTab)}
            >
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="friends" className="relative">
                  <Users className="mr-2 h-4 w-4" />
                  Friends
                  {pendingCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="messages" className="relative">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Messages
                  {messageCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                    >
                      {messageCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="h-full overflow-hidden">
                <FriendsList />
              </TabsContent>

              <TabsContent value="messages" className="h-full overflow-hidden">
                <MessageCenter />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="text-muted-foreground mt-4 border-t pt-2 text-xs">
          <span>Shortcuts: </span>
          <span className="font-mono">Esc</span> to close,
          <span className="font-mono"> Ctrl+1/2</span> to switch tabs
        </div>
      </DialogContent>
    </Dialog>
  );
}
