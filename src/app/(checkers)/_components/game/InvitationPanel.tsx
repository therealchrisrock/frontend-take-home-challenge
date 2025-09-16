"use client";

import {
  Check,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Share2,
  UserPlus,
  Users
} from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { toast } from "~/hooks/use-toast";
import { cn } from "~/lib/utils";

interface InvitationData {
  inviteId: string;
  inviteToken: string;
  inviteUrl: string;
  expiresAt: Date | null;
  gameMode: string;
  variant: string | null;
}

interface InvitationPanelProps {
  invitation: InvitationData;
  onInviteFriends?: (friendIds: string[]) => void;
  onGameReady?: (gameId: string) => void;
  className?: string;
}

export function InvitationPanel({
  invitation,
  onInviteFriends,
  onGameReady,
  className
}: InvitationPanelProps) {
  const [copied, setCopied] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isInvitingFriends, setIsInvitingFriends] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invitation.inviteUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleInviteFriends = async () => {
    if (selectedFriends.length === 0) return;

    setIsInvitingFriends(true);
    try {
      await onInviteFriends?.(selectedFriends);
      toast({
        title: "Invitations Sent",
        description: `Sent ${selectedFriends.length} friend invitation${selectedFriends.length !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      toast({
        title: "Failed to send invitations",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsInvitingFriends(false);
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Expires in ${hours}h ${minutes}m`;
    }
    return `Expires in ${minutes}m`;
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      color: "bg-green-500 hover:bg-green-600",
      action: () => {
        const message = `Join me for a game of checkers! ${invitation.inviteUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      },
    },
    {
      name: "SMS",
      color: "bg-blue-500 hover:bg-blue-600",
      action: () => {
        const message = `Join me for a game of checkers! ${invitation.inviteUrl}`;
        window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
      },
    },
    {
      name: "Email",
      color: "bg-purple-500 hover:bg-purple-600",
      action: () => {
        const subject = "Join me for a game of checkers!";
        const body = `I've invited you to play checkers with me. Click the link below to join:\\n\\n${invitation.inviteUrl}\\n\\nLet's play!`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
      },
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Shareable Link Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5" />
            Shareable Invitation Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Copy Link */}
          <div>
            <Label htmlFor="invite-url" className="text-sm font-medium">
              Anyone with this link can join your game
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="invite-url"
                value={invitation.inviteUrl}
                readOnly
                className="flex-1 font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                onClick={handleCopyLink}
                size="sm"
                className={cn(
                  "px-3 transition-all duration-200",
                  copied
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-primary hover:bg-primary"
                )}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Share Options */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Quick Share
            </Label>
            <div className="flex gap-2">
              {shareOptions.map((option) => (
                <Button
                  key={option.name}
                  onClick={option.action}
                  size="sm"
                  className={cn("text-white text-xs", option.color)}
                >
                  {option.name}
                </Button>
              ))}
              <Button
                onClick={() => window.open(invitation.inviteUrl, "_blank")}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Open
              </Button>
            </div>
          </div>

          {/* Game Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {invitation.gameMode} • {invitation.variant || "American"}
              </Badge>
              {invitation.expiresAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeRemaining(invitation.expiresAt)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-4" />

      {/* Friend Invitations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Invite Specific Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Friend List Component will be rendered here */}
          <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Direct Invitations</span>
            </div>
            <p className="text-blue-700">
              Send personal invitations to specific friends. They'll receive notifications and can join directly.
            </p>
          </div>

          {/* Placeholder for FriendInviteList component */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Select friends to invite
            </Label>
            <div className="text-sm text-muted-foreground p-4 border-2 border-dashed rounded-lg text-center">
              FriendInviteList component will be integrated here
            </div>
          </div>

          {/* Send Invitations Button */}
          <Button
            onClick={handleInviteFriends}
            disabled={selectedFriends.length === 0 || isInvitingFriends}
            className="w-full"
            variant={selectedFriends.length > 0 ? "default" : "outline"}
          >
            {isInvitingFriends ? (
              "Sending invitations..."
            ) : selectedFriends.length > 0 ? (
              `Send ${selectedFriends.length} invitation${selectedFriends.length !== 1 ? 's' : ''}`
            ) : (
              "Select friends to invite"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Status Panel */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Game Ready!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Waiting for someone to join via link or invitation acceptance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}