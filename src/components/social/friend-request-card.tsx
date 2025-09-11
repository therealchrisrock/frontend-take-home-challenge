"use client";

import React from "react";
import { Check, X, Clock, MessageCircle } from "lucide-react";
import { m } from "framer-motion";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { getRelativeTime } from "~/lib/notifications/utils";
import { toast } from "~/hooks/use-toast";

interface FriendRequestCardProps {
  friendRequest: {
    id: string;
    senderId: string;
    receiverId: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
    message?: string | null;
    createdAt: Date;
    sender: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
    receiver: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  };
  variant?: "received" | "sent";
  onUpdate?: () => void;
}

export function FriendRequestCard({
  friendRequest,
  variant = "received",
  onUpdate,
}: FriendRequestCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const respondMutation = api.friendRequest.respond.useMutation({
    onSuccess: () => {
      onUpdate?.();
      toast({
        title: "Success",
        description: `Friend request ${friendRequest.status.toLowerCase()}ed`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to friend request",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = api.friendRequest.cancel.useMutation({
    onSuccess: () => {
      onUpdate?.();
      toast({
        title: "Success",
        description: "Friend request cancelled",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to cancel friend request",
        variant: "destructive",
      });
    },
  });

  const handleAccept = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      await respondMutation.mutateAsync({
        friendRequestId: friendRequest.id,
        response: "ACCEPTED",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      await respondMutation.mutateAsync({
        friendRequestId: friendRequest.id,
        response: "DECLINED",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      await cancelMutation.mutateAsync({
        friendRequestId: friendRequest.id,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const user = variant === "received" ? friendRequest.sender : friendRequest.receiver;
  const displayName = user.name || user.email || "Unknown User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const getStatusBadge = () => {
    switch (friendRequest.status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "ACCEPTED":
        return (
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
            <Check className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case "DECLINED":
        return (
          <Badge variant="secondary" className="gap-1 bg-red-100 text-red-800">
            <X className="h-3 w-3" />
            Declined
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <X className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.image || undefined} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-sm leading-none mb-1">
                    {displayName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                {getStatusBadge()}
              </div>

              {friendRequest.message && (
                <div className="flex items-start gap-2 mb-3 p-2 bg-muted/50 rounded-md">
                  <MessageCircle className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground leading-4">
                    "{friendRequest.message}"
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {getRelativeTime(friendRequest.createdAt.toISOString())}
                </span>

                {friendRequest.status === "PENDING" && (
                  <div className="flex items-center gap-2">
                    {variant === "received" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDecline}
                          disabled={isLoading}
                          className="h-8 px-3 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAccept}
                          disabled={isLoading}
                          className="h-8 px-3 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="h-8 px-3 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}

export function FriendRequestCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}