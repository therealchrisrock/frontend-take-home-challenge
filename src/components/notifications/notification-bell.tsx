"use client";

import React from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import { m } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useNotifications } from "~/hooks/useNotifications";
import { useUnreadMessageCounts } from "~/hooks/useMessages";
import { NotificationItem } from "./notification-item";
import { getConnectionStatusMessage } from "~/lib/notifications/utils";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    connectionState,
    markAllAsRead,
    refetch,
  } = useNotifications();

  // Get unread message counts to include in the badge
  const { totalUnread: unreadMessageCount } = useUnreadMessageCounts();

  // Calculate total unread count (notifications + messages)
  const totalUnreadCount = unreadCount + unreadMessageCount;

  const [isOpen, setIsOpen] = React.useState(false);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Failed to refresh notifications:", error);
    }
  };

  const recentNotifications = notifications.slice(0, 5);
  const hasNotifications = notifications.length > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative h-10 w-10 rounded-full hover:bg-accent ${className}`}
          aria-label={`Notifications ${totalUnreadCount > 0 ? `(${totalUnreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute -right-1 -top-1"
            >
              <Badge
                variant="destructive"
                className="h-5 min-w-[1.25rem] px-1 text-xs"
              >
                {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
              </Badge>
            </m.div>
          )}
          
          {/* Connection indicator */}
          <div className="absolute -bottom-1 -right-1">
            <div
              className={`h-3 w-3 rounded-full border-2 border-background ${
                connectionState.connected
                  ? "bg-green-500"
                  : connectionState.reconnecting
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              title={getConnectionStatusMessage(
                connectionState.connected,
                connectionState.reconnecting,
                connectionState.error
              )}
            />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[70vh]"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">
            Notifications
            {totalUnreadCount > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({totalUnreadCount} unread)
              </span>
            )}
          </DropdownMenuLabel>
          
          <div className="flex items-center gap-1">
            {hasNotifications && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-8 px-2 text-xs"
                title="Mark all as read"
              >
                <CheckCheck className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 px-2 text-xs"
              title="Refresh"
            >
              <Bell className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Connection Status */}
        {(!connectionState.connected || connectionState.error) && (
          <>
            <div className="px-2 py-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className={`h-2 w-2 rounded-full ${
                    connectionState.connected
                      ? "bg-green-500"
                      : connectionState.reconnecting
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                />
                {getConnectionStatusMessage(
                  connectionState.connected,
                  connectionState.reconnecting,
                  connectionState.error
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Notifications List */}
        {hasNotifications ? (
          <>
            <ScrollArea className="max-h-96">
              <div className="space-y-1 p-1">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </div>
            </ScrollArea>
            
            {notifications.length > 5 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a
                    href="/notifications"
                    className="w-full text-center font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    View all notifications ({notifications.length})
                  </a>
                </DropdownMenuItem>
              </>
            )}
          </>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No notifications yet</p>
            <p className="text-xs mt-1">
              You'll be notified about friend requests and other activities
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}