"use client";

import { AlertCircle, CheckCircle, Clock, Loader2, UserCheck, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BoardPreview } from "~/app/(checkers)/_components/game/BoardPreview";
import { GameWrapper } from "~/app/(checkers)/_components/game/game-wrapper";
import { GuestSessionManager } from "~/components/guest/GuestSessionManager";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import type { GuestSession } from "~/lib/guest/sessionStorage";
import { api } from "~/trpc/react";

interface InvitationData {
  id: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  inviter: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
  invitee?: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  } | null;
  message?: string | null;
  gameMode: string;
  variant?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
  game?: {
    id: string;
    gameMode: string;
    currentPlayer: string;
    winner?: string | null;
  } | null;
}

export default function InviteRedemptionPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const inviteToken = params.inviteId as string;

  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionError, setRedemptionError] = useState<string | null>(null);

  // Fetch invitation details
  const {
    data: invitation,
    isLoading: isLoadingInvitation,
    error: invitationError,
    refetch: refetchInvitation,
  } = api.gameInvite.getInvitationByToken.useQuery(
    { inviteToken },
    { enabled: !!inviteToken }
  );

  // Redeem invitation mutation
  const redeemInvitation = api.gameInvite.redeemInvitation.useMutation({
    onSuccess: (result) => {
      // Redirect to the game
      router.push(`/game/${result.gameId}`);
    },
    onError: (error) => {
      setRedemptionError(error.message);
      setIsRedeeming(false);
    },
  });

  const handleGuestSessionReady = (session: GuestSession) => {
    setGuestSession(session);
  };

  const handleRedeemInvitation = async () => {
    if (!invitation) return;

    setIsRedeeming(true);
    setRedemptionError(null);

    try {
      await redeemInvitation.mutateAsync({
        inviteToken,
        guestInfo: guestSession ? {
          displayName: guestSession.displayName,
        } : undefined,
      });
    } catch (error) {
      // Error handling is done in the mutation's onError
      console.error("Redemption failed:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "ACCEPTED":
        return <Badge>Accepted</Badge>;
      case "EXPIRED":
        return <Badge variant="destructive">Expired</Badge>;
      case "CANCELLED":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  // Loading state
  if (sessionStatus === "loading" || isLoadingInvitation) {
    return (
      <div className="flex min-h-screen justify-center overflow-hidden p-4">
        <GameWrapper>
          <BoardPreview size={8} />
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading invitation...
              </CardTitle>
            </CardHeader>
          </Card>
        </GameWrapper>
      </div>
    );
  }

  // Error state
  if (invitationError || !invitation) {
    return (
      <div className="flex min-h-screen justify-center overflow-hidden p-4">
        <GameWrapper>
          <BoardPreview size={8} />
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Invitation Not Found
              </CardTitle>
              <CardDescription>
                This invitation link is invalid or has been removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/game")} className="w-full">
                Browse Games
              </Button>
            </CardContent>
          </Card>
        </GameWrapper>
      </div>
    );
  }

  // If invitation is already accepted and has a game, redirect to it
  if ((invitation.status === "ACCEPTED" || invitation.status === "ready") && invitation.game) {
    router.push(`/game/${invitation.game.id}`);
    return null;
  }

  // Invalid status states
  if (["EXPIRED", "CANCELLED"].includes(invitation.status)) {
    return (
      <div className="flex min-h-screen justify-center overflow-hidden p-4">
        <GameWrapper>
          <BoardPreview size={8} />
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Invitation {invitation.status === "EXPIRED" ? "Expired" : "Cancelled"}
              </CardTitle>
              <CardDescription>
                {invitation.status === "EXPIRED"
                  ? "This invitation has expired and can no longer be accepted."
                  : "This invitation has been cancelled by the host."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/game")} className="w-full">
                Browse Games
              </Button>
            </CardContent>
          </Card>
        </GameWrapper>
      </div>
    );
  }

  const isGuest = !session?.user;
  const isTargetedInvite = invitation.invitee && session?.user?.id !== invitation.invitee.id;

  return (
    <div className="flex min-h-screen justify-center overflow-hidden p-4">
      <GameWrapper>
        <BoardPreview size={8} />

        <div className="w-full max-w-md space-y-4">
          {/* Main Invitation Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Game Invitation
                {getStatusBadge(invitation.status)}
              </CardTitle>
              <CardDescription>
                You've been invited to play checkers!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Inviter Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={invitation.inviter.image || undefined} />
                  <AvatarFallback>
                    {invitation.inviter.username?.[0]?.toUpperCase() ||
                      invitation.inviter.name?.[0]?.toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {invitation.inviter.username || invitation.inviter.name || "Anonymous"}
                  </div>
                  <div className="text-sm text-muted-foreground">Inviter</div>
                </div>
              </div>

              {/* Message */}
              {invitation.message && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Message:</div>
                  <div className="text-sm">{invitation.message}</div>
                </div>
              )}

              {/* Game Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-medium">Mode</div>
                  <div className="text-muted-foreground capitalize">{invitation.gameMode}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-medium">Variant</div>
                  <div className="text-muted-foreground capitalize">
                    {invitation.variant || "American"}
                  </div>
                </div>
              </div>

              {/* Expiration Info */}
              {invitation.expiresAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatTimeRemaining(new Date(invitation.expiresAt))}
                </div>
              )}

              {/* Error Display */}
              {redemptionError && (
                <Alert role="alert" aria-live="polite">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{redemptionError}</AlertDescription>
                </Alert>
              )}

              {/* Targeted Invite Warning */}
              {isTargetedInvite && (
                <Alert role="alert" aria-live="polite">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This invitation was sent to a specific user. You may not be able to accept it.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Guest Session Manager (only for guests) */}
          {isGuest && (
            <GuestSessionManager
              onSessionReady={handleGuestSessionReady}
              showStats={false}
            />
          )}

          {/* Join Game Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleRedeemInvitation}
                disabled={isRedeeming || !guestSession && isGuest}
                className="w-full"
                size="lg"
                aria-describedby={isGuest && !guestSession ? "guest-session-help" : undefined}
              >
                {isRedeeming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining Game...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept & Join Game
                  </>
                )}
              </Button>

              {isGuest && !guestSession && (
                <p
                  id="guest-session-help"
                  className="text-xs text-muted-foreground mt-2 text-center"
                  role="status"
                  aria-live="polite"
                >
                  Please set up your guest session above first
                </p>
              )}
            </CardContent>
          </Card>

          {/* Player Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                {isGuest ? (
                  <span>Playing as guest: {guestSession?.displayName || "Loading..."}</span>
                ) : (
                  <span>Playing as: {session?.user?.username || session?.user?.name}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </GameWrapper>
    </div>
  );
}