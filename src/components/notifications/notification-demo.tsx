"use client";

import React from "react";
import { Bell, Users, Send } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { NotificationBell } from "./notification-bell";
import { FriendRequestList, SendFriendRequestDialog } from "../social";
import { useNotifications } from "~/hooks/useNotifications";
import { getConnectionStatusMessage } from "~/lib/notifications/utils";

export function NotificationDemo() {
  const { unreadCount, connectionState } = useNotifications();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification System Demo
          </CardTitle>
          <CardDescription>
            Real-time friend request notifications and management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  connectionState.connected
                    ? "bg-green-500"
                    : connectionState.reconnecting
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              />
              <div>
                <p className="text-sm font-medium">Notification System</p>
                <p className="text-xs text-muted-foreground">
                  {getConnectionStatusMessage(
                    connectionState.connected,
                    connectionState.reconnecting,
                    connectionState.error
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {unreadCount} unread
              </Badge>
              <NotificationBell />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <SendFriendRequestDialog>
              <Button variant="outline" className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Send Friend Request
              </Button>
            </SendFriendRequestDialog>
            <Button variant="outline" asChild className="flex-1">
              <a href="/friends/requests">
                <Users className="h-4 w-4 mr-2" />
                View All Requests
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Friend Request Management */}
      <Card>
        <CardHeader>
          <CardTitle>Friend Request Management</CardTitle>
          <CardDescription>
            Manage incoming and outgoing friend requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="received" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received">Received</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
            </TabsList>
            <TabsContent value="received" className="mt-4">
              <FriendRequestList type="received" />
            </TabsContent>
            <TabsContent value="sent" className="mt-4">
              <FriendRequestList type="sent" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}