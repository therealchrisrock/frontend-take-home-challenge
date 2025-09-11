"use client";

import React from "react";
import { UserPlus, Mail, AlertCircle, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { FriendRequestCard, FriendRequestCardSkeleton } from "./friend-request-card";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";

interface FriendRequestListProps {
  type: "received" | "sent";
  className?: string;
}

export function FriendRequestList({ type, className }: FriendRequestListProps) {
  const {
    data: requests,
    isLoading,
    error,
    refetch,
  } = type === "received" 
    ? api.friendRequest.getPending.useQuery()
    : api.friendRequest.getSent.useQuery();

  const handleRefresh = () => {
    void refetch();
  };

  const handleUpdate = () => {
    void refetch();
  };

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load friend requests. {error.message}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="ml-2"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <FriendRequestCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="flex flex-col items-center gap-4">
          {type === "received" ? (
            <>
              <Mail className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg mb-2">No friend requests</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  You don't have any pending friend requests at the moment.
                </p>
                <p className="text-muted-foreground text-xs">
                  When someone sends you a friend request, it will appear here.
                </p>
              </div>
            </>
          ) : (
            <>
              <UserPlus className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg mb-2">No sent requests</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  You haven't sent any friend requests yet.
                </p>
                <p className="text-muted-foreground text-xs">
                  Start connecting with other players by sending friend requests!
                </p>
              </div>
            </>
          )}
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="mt-4"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {type === "received" ? "Received Requests" : "Sent Requests"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {requests.length} {type === "received" ? "pending" : "sent"} request
            {requests.length !== 1 ? "s" : ""}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <FriendRequestCard
            key={request.id}
            friendRequest={request}
            variant={type}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </div>
  );
}