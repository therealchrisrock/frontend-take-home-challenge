import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";

function FriendItemSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg p-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="mb-1 h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

export default function FriendsLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Friends</CardTitle>
          <CardDescription>Manage your friends and connections</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-4" variant="underline">
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="blocked">Blocked</TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <FriendItemSkeleton key={i} />
              ))}
            </TabsContent>

            <TabsContent value="requests" className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <FriendItemSkeleton key={i} />
              ))}
            </TabsContent>

            <TabsContent value="search" className="space-y-2">
              <Skeleton className="mb-4 h-10 w-full" />
              <div className="py-4 text-center">
                <Skeleton className="mx-auto h-4 w-48" />
              </div>
            </TabsContent>

            <TabsContent value="blocked" className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <FriendItemSkeleton key={i} />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}