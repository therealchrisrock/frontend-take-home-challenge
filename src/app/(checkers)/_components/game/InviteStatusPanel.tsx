"use client";

import {
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Share2,
  Users,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { toast } from "~/hooks/use-toast";
import { cn } from "~/lib/utils";

type InviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

interface InviteStatusPanelProps {
  inviteId: string;
  selectedFriendId: string | null;
  onGameReady: (gameId: string) => void;
  onInviteExpired?: () => void;
}

export function InviteStatusPanel({
  inviteId,
  selectedFriendId,
  onGameReady,
  onInviteExpired,
}: InviteStatusPanelProps) {
  const { data: session } = useSession();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("PENDING");

  // Mock API queries (will be replaced by Working Group 1 backend)
  const inviteData = {
    status: inviteStatus,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    gameId: inviteStatus === "ACCEPTED" ? "mock-game-123" : null,
  };

  const refetchInvite = () => {
    // Mock refetch - simulate status changes for demo
    console.log("Mock refetch invite status");
  };

  const isLoadingInvite = false;

  // Mock friend data for now (will be replaced with actual API)
  const friendData: any[] = [];

  // Mock API mutations
  const cancelInviteMutation = {
    mutate: (input: { inviteId: string }) => {
      toast({
        title: "Invitation Cancelled (Mock)",
        description: "The game invitation has been cancelled.",
      });
    },
    isPending: false,
  };

  // Initialize timer for mock expiry
  useEffect(() => {
    if (inviteData?.expiresAt) {
      const now = new Date().getTime();
      const expiry = new Date(inviteData.expiresAt).getTime();
      const remaining = Math.max(0, expiry - now);
      setTimeRemaining(remaining);
    }
  }, [inviteData]);

  const selectedFriend = friendData?.find((friend) => friend.id === selectedFriendId);

  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          setInviteStatus("EXPIRED");
          if (onInviteExpired) onInviteExpired();
        }
        return Math.max(0, newTime);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, onInviteExpired]);

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getStatusConfig = (status: InviteStatus) => {
    switch (status) {
      case "PENDING":
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
          title: selectedFriend ? "Waiting for Response" : "Invitation Ready",
          description: selectedFriend
            ? `${selectedFriend.name ?? selectedFriend.username} hasn't responded yet`
            : "Share the invitation link to start playing",
          badgeVariant: "default" as const,
          badgeText: "Pending",
          color: "primary",
        };
      case "ACCEPTED":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          title: "Invitation Accepted!",
          description: selectedFriend
            ? `${selectedFriend.name ?? selectedFriend.username} has accepted your invitation`
            : "Someone has accepted your invitation",
          badgeVariant: "default" as const,
          badgeText: "Accepted",
          color: "green",
        };
      case "DECLINED":
        return {
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          title: "Invitation Declined",
          description: selectedFriend
            ? `${selectedFriend.name ?? selectedFriend.username} declined your invitation`
            : "The invitation was declined",
          badgeVariant: "destructive" as const,
          badgeText: "Declined",
          color: "red",
        };
      case "EXPIRED":
        return {
          icon: <Clock className="h-5 w-5 text-gray-600" />,
          title: "Invitation Expired",
          description: "This invitation has expired",
          badgeVariant: "secondary" as const,
          badgeText: "Expired",
          color: "gray",
        };
    }
  };

  const statusConfig = getStatusConfig(inviteStatus);
  const progressPercentage = timeRemaining > 0
    ? ((timeRemaining / (15 * 60 * 1000)) * 100) // Assume 15 min expiry
    : 0;

  const handleCancelInvite = () => {
    cancelInviteMutation.mutate({ inviteId });
  };

  const handleRefreshStatus = () => {
    void refetchInvite();
  };

  if (isLoadingInvite) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Loading invitation status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="mb-1 text-xl font-bold text-gray-900">
          {statusConfig.title}
        </h2>
        <p className="text-gray-600">{statusConfig.description}</p>
      </div>

      {/* Status Card */}
      <Card className={cn("p-4 border-l-4", {
        "border-l-primary/50 bg-primary/10": statusConfig.color === "primary",
        "border-l-green-400 bg-green-50": statusConfig.color === "green",
        "border-l-red-400 bg-red-50": statusConfig.color === "red",
        "border-l-gray-400 bg-gray-50": statusConfig.color === "gray",
      })}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusConfig.icon}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">
                  Invitation Status
                </p>
                <Badge variant={statusConfig.badgeVariant}>
                  {statusConfig.badgeText}
                </Badge>
              </div>
              {timeRemaining > 0 && inviteStatus === "PENDING" && (
                <p className="text-sm text-gray-600">
                  Expires in {formatTimeRemaining(timeRemaining)}
                </p>
              )}
            </div>
          </div>

          {inviteStatus === "PENDING" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshStatus}
              disabled={isLoadingInvite}
            >
              <RefreshCw className={cn("h-4 w-4", isLoadingInvite && "animate-spin")} />
            </Button>
          )}
        </div>

        {/* Timer Progress Bar */}
        {timeRemaining > 0 && inviteStatus === "PENDING" && (
          <div className="mt-3">
            <Progress
              value={progressPercentage}
              className="h-2"
            />
          </div>
        )}
      </Card>

      {/* Player Card */}
      {selectedFriend && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={selectedFriend.image ?? undefined} />
              <AvatarFallback>
                {selectedFriend.name?.[0] ?? selectedFriend.username?.[0] ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {selectedFriend.name ?? selectedFriend.username}
              </p>
              <p className="text-sm text-gray-600">
                @{selectedFriend.username}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary">Invited Player</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {inviteStatus === "PENDING" && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancelInvite}
            disabled={cancelInviteMutation.isPending}
          >
            {cancelInviteMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Cancel Invitation
          </Button>
        )}

        {inviteStatus === "ACCEPTED" && (
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => inviteData?.gameId && onGameReady(inviteData.gameId)}
          >
            <Users className="mr-2 h-4 w-4" />
            Start Game
          </Button>
        )}

        {(inviteStatus === "DECLINED" || inviteStatus === "EXPIRED") && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Create New Invitation
          </Button>
        )}
      </div>

      {/* Invitation Link Display */}
      {!selectedFriend && inviteStatus === "PENDING" && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Share2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Share this link to invite someone to play:
              </p>
              <code className="block text-xs bg-white border rounded px-2 py-1 text-blue-800 break-all">
                {`${window.location.origin}/game/invite/${inviteId}`}
              </code>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}