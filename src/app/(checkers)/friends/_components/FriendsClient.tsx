"use client";

import { Suspense } from "react";
import { TabsUnderline, TabsContent, TabsUnderlineList, TabsUnderlineTrigger } from "~/components/ui/tabs";
import { FriendListSkeleton } from "./skeletons";
import { UserSearch } from "./UserSearch";

interface FriendsClientProps {
  friendsCount?: number;
  requestsCount?: number;
  sentRequestsCount?: number;
  children?: {
    friends: React.ReactNode;
    requests: React.ReactNode;
    sent: React.ReactNode;
    blocked: React.ReactNode;
  };
}

export function FriendsClient({ 
  friendsCount = 0, 
  requestsCount = 0,
  sentRequestsCount = 0,
  children 
}: FriendsClientProps) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
          <p className="text-muted-foreground">Manage your friends and connections</p>
        </div>
        
        <TabsUnderline defaultValue="friends" className="w-full">
          <TabsUnderlineList className="grid w-full grid-cols-5">
            <TabsUnderlineTrigger value="friends">
              Friends {friendsCount > 0 && `(${friendsCount})`}
            </TabsUnderlineTrigger>
            <TabsUnderlineTrigger value="requests">
              Received {requestsCount > 0 && `(${requestsCount})`}
            </TabsUnderlineTrigger>
            <TabsUnderlineTrigger value="sent">
              Sent {sentRequestsCount > 0 && `(${sentRequestsCount})`}
            </TabsUnderlineTrigger>
            <TabsUnderlineTrigger value="search">Search</TabsUnderlineTrigger>
            <TabsUnderlineTrigger value="blocked">Blocked</TabsUnderlineTrigger>
          </TabsUnderlineList>

          <TabsContent value="friends" className="space-y-2">
            <Suspense fallback={<FriendListSkeleton />}>
              {children?.friends}
            </Suspense>
          </TabsContent>

          <TabsContent value="requests" className="space-y-2">
            <Suspense fallback={<FriendListSkeleton count={3} />}>
              {children?.requests}
            </Suspense>
          </TabsContent>

          <TabsContent value="sent" className="space-y-2">
            <Suspense fallback={<FriendListSkeleton count={3} />}>
              {children?.sent}
            </Suspense>
          </TabsContent>

          <TabsContent value="search" className="space-y-2">
            <UserSearch />
          </TabsContent>

          <TabsContent value="blocked" className="space-y-2">
            <Suspense fallback={<FriendListSkeleton count={2} />}>
              {children?.blocked}
            </Suspense>
          </TabsContent>
        </TabsUnderline>
      </div>
    </div>
  );
}