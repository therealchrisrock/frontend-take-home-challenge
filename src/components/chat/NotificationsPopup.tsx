"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { 
  Bell,
  Check,
  X,
  Trash2,
  UserPlus,
  MessageSquare,
  Settings as SettingsIcon,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "./types";

interface NotificationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onNotificationRead: (id: string) => void;
  theme: 'light' | 'dark' | 'system';
}

export function NotificationsPopup({ 
  isOpen, 
  onClose, 
  notifications, 
  onNotificationRead,
  theme 
}: NotificationsPopupProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || !n.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationAction = (notification: Notification, action: 'accept' | 'decline') => {
    // Handle friend request actions
    if (notification.type === 'friend_request' && notification.actionData) {
      // This would call the appropriate API endpoint
      console.log(`${action} friend request from ${notification.actionData.userId!}`);
    }
    
    // Mark as read
    onNotificationRead(notification.id);
  };

  const handleMarkAllRead = () => {
    notifications.forEach(n => {
      if (!n.read) {
        onNotificationRead(n.id);
      }
    });
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'system':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const themeClasses = theme === 'dark' 
    ? 'bg-gray-900 text-white border-gray-700' 
    : 'bg-white text-black border-gray-200';

  const itemHoverClasses = theme === 'dark'
    ? 'hover:bg-gray-800'
    : 'hover:bg-gray-50';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md h-[500px] ${themeClasses}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                className="text-xs"
              >
                {filter === 'all' ? 'Show Unread' : 'Show All'}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs"
                >
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6">
          {filteredNotifications.length === 0 ? (
            <div className={`text-center py-12 px-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
              <p className="text-sm">
                {filter === 'unread' 
                  ? 'All caught up! 🎉' 
                  : 'New notifications will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`
                      flex items-start gap-3 p-4 cursor-pointer transition-colors
                      ${itemHoverClasses}
                      ${!notification.read ? (theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50') : ''}
                    `}
                    onClick={() => onNotificationRead(notification.id)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
                        )}
                      </div>
                      
                      <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </span>
                        
                        {notification.type === 'friend_request' && !notification.read && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationAction(notification, 'accept');
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationAction(notification, 'decline');
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < filteredNotifications.length - 1 && (
                    <Separator className={theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer with actions */}
        <div className={`
          flex items-center justify-between pt-4 border-t
          ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-gray-400" />
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Notification Settings
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}