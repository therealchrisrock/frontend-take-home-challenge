"use client";

import React from "react";
import { X, User, UserCheck, UserX } from "lucide-react";
import { m } from "framer-motion";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { useNotifications } from "~/hooks/useNotifications";
import {
  getNotificationIcon,
  getRelativeTime,
  truncateMessage,
} from "~/lib/notifications/utils";
import type { NotificationState } from "~/lib/notifications/types";

interface NotificationItemProps {
  notification: NotificationState;
  onClose?: () => void;
  showDismiss?: boolean;
}

export function NotificationItem({
  notification,
  onClose,
  showDismiss = true,
}: NotificationItemProps) {
  const { markAsRead, dismissNotification } = useNotifications();

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dismissNotification(notification.id);
      onClose?.();
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  };

  const handleClick = async () => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === "FRIEND_REQUEST" && notification.relatedEntityId) {
      window.location.href = "/friends/requests";
    }
    
    onClose?.();
  };

  const getNotificationAvatar = () => {
    const metadata = notification.metadata as { senderName?: string; senderEmail?: string } | undefined;
    const senderName = metadata?.senderName;
    
    if (senderName) {
      return (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {senderName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    }

    // Default icon based on notification type
    const IconComponent = 
      notification.type === "FRIEND_REQUEST" ? User :
      notification.type === "FRIEND_REQUEST_ACCEPTED" ? UserCheck :
      notification.type === "FRIEND_REQUEST_DECLINED" ? UserX :
      User;

    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  };

  const getNotificationVariant = () => {
    if (notification.type === "FRIEND_REQUEST_ACCEPTED") return "success";
    if (notification.type === "FRIEND_REQUEST_DECLINED") return "warning";
    return "default";
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`group relative cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
        notification.read 
          ? "bg-background border-border" 
          : "bg-accent/20 border-accent-foreground/20"
      }`}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500" />
      )}

      <div className="flex items-start gap-3">
        {getNotificationAvatar()}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-5 ${notification.read ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-4">
                {truncateMessage(notification.message, 100)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {getRelativeTime(notification.createdAt)}
                </span>
                <span className="text-xs">
                  {getNotificationIcon(notification.type)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  className="h-6 w-6 p-0"
                  title="Mark as read"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                </Button>
              )}
              
              {showDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  title="Dismiss"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Special styling for different notification types */}
      <div className={`absolute inset-0 rounded-lg pointer-events-none ${
        getNotificationVariant() === "success" ? "ring-1 ring-green-500/20" :
        getNotificationVariant() === "warning" ? "ring-1 ring-yellow-500/20" :
        ""
      }`} />
    </m.div>
  );
}