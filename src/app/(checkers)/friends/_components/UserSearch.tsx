"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { SearchResultItem } from "./SearchResultItem";
import { FriendListSkeleton } from "./skeletons";
import { useDebounce } from "~/hooks/useDebounce";

export function UserSearch() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [friendStatuses, setFriendStatuses] = useState<Record<string, any>>({});
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  const { data: friends } = api.user.getFriends.useQuery();
  const { data: pendingRequests } = api.user.getPendingFriendRequests.useQuery();
  const { data: sentRequests } = api.friendRequest.getSent.useQuery();
  const { data: blockedUsers } = api.user.getBlockedUsers.useQuery();
  
  const { data: searchResults, isLoading } = api.user.searchUsers.useQuery(
    { query: debouncedQuery },
    { 
      enabled: debouncedQuery.length > 2,
    }
  );

  const isFriend = useCallback(
    (userId: string) => friends?.some((f) => f.id === userId) ?? false,
    [friends]
  );

  const isPendingReceived = useCallback(
    (userId: string) => pendingRequests?.some((r: any) => r.sender.id === userId) ?? false,
    [pendingRequests]
  );

  const isPendingSent = useCallback(
    (userId: string) => sentRequests?.some((r: any) => r.receiver.id === userId) ?? false,
    [sentRequests]
  );

  const getSentRequestId = useCallback(
    (userId: string) => {
      const request = sentRequests?.find((r: any) => r.receiver.id === userId);
      return request?.id;
    },
    [sentRequests]
  );

  const isBlocked = useCallback(
    (userId: string) => blockedUsers?.some((u) => u.id === userId) ?? false,
    [blockedUsers]
  );

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search for users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />
      
      {searchQuery.length > 2 && isLoading && (
        <FriendListSkeleton count={3} />
      )}
      
      {searchQuery.length <= 2 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Type at least 3 characters to search
        </p>
      )}
      
      {searchResults && searchResults.length === 0 && searchQuery.length > 2 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No users found
        </p>
      )}
      
      {searchResults && searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map((user) => (
            <SearchResultItem
              key={user.id}
              user={user}
              isFriend={isFriend(user.id)}
              isPendingReceived={isPendingReceived(user.id)}
              isPendingSent={isPendingSent(user.id)}
              sentRequestId={getSentRequestId(user.id)}
              isBlocked={isBlocked(user.id)}
              currentUserId={session?.user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}