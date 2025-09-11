"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  UserCheck,
  Eye,
  PlayCircle,
  RefreshCw,
  X
} from "lucide-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { cn } from "~/lib/utils";

interface Participant {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  role: 'inviter' | 'invitee' | 'guest';
  status: 'pending' | 'joined' | 'ready';
  joinedAt?: Date;
}

interface InviteStatusIndicatorProps {
  inviteId: string;
  onGameReady?: (gameId: string) => void;
  onCancel?: () => void;
  className?: string;
  autoRefresh?: boolean;
}

export function InviteStatusIndicator({ 
  inviteId, 
  onGameReady, 
  onCancel,
  className,
  autoRefresh = true
}: InviteStatusIndicatorProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch invitation status
  const { 
    data: invitationStatus, 
    isLoading, 
    refetch,
    error 
  } = api.gameInvite.getInvitationStatus.useQuery(
    { invitationId: inviteId },
    { 
      enabled: !!inviteId,
      refetchInterval: autoRefresh ? 3000 : false, // Poll every 3 seconds
      refetchOnWindowFocus: true,
    }
  );

  // Cancel invitation mutation
  const cancelInvitation = api.gameInvite.cancelInvitation.useMutation({
    onSuccess: () => {
      onCancel?.();
    },
    onError: (error) => {
      console.error("Failed to cancel invitation:", error);
    },
  });

  useEffect(() => {
    if (invitationStatus) {
      setParticipants(invitationStatus.participants || []);
      
      if (invitationStatus.gameId) {
        setGameId(invitationStatus.gameId);
        // Auto-navigate to game if ready
        if (invitationStatus.status === 'ready' && onGameReady) {
          onGameReady(invitationStatus.gameId);
        }
      }
    }
  }, [invitationStatus, onGameReady]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelInvitation.mutateAsync({ invitationId: inviteId });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleJoinGame = () => {
    if (gameId) {
      router.push(`/game/${gameId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'ready': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      case 'expired': return <Clock className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getStatusMessage = (status: string, participantCount: number) => {
    switch (status) {
      case 'pending': 
        return participantCount === 0 
          ? "Waiting for someone to join..."
          : `${participantCount} participant${participantCount !== 1 ? 's' : ''} joined. Waiting for game to start.`;
      case 'ready': return "Game is ready to start!";
      case 'cancelled': return "This invitation has been cancelled.";
      case 'expired': return "This invitation has expired.";
      default: return "Checking invitation status...";
    }
  };

  const getDisplayName = (participant: Participant) => {
    return participant.username || participant.name || "Anonymous";
  };

  const getRoleBadge = (participant: Participant) => {
    switch (participant.role) {
      case 'inviter': return <Badge variant="default" className="text-xs">Host</Badge>;
      case 'invitee': return <Badge variant="secondary" className="text-xs">Invited</Badge>;
      case 'guest': return <Badge variant="outline" className="text-xs">Guest</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !invitationStatus) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <X className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load invitation status</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = invitationStatus.status;
  const participantCount = participants.length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            Invitation Status
          </div>
          <div className={cn("px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1", getStatusColor(status))}>
            {status === 'pending' && <Clock className="h-3 w-3" />}
            {status === 'ready' && <CheckCircle className="h-3 w-3" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Message */}
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            {getStatusMessage(status, participantCount)}
          </p>
        </div>

        {/* Participants List */}
        {participants.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({participants.length})
            </h4>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getDisplayName(participant)[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {getDisplayName(participant)}
                      </span>
                      {getRoleBadge(participant)}
                    </div>
                    {participant.joinedAt && (
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(participant.joinedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    {participant.status === 'joined' && (
                      <Badge variant="outline" className="text-xs">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Joined
                      </Badge>
                    )}
                    {participant.status === 'ready' && (
                      <Badge className="text-xs bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {status === 'ready' && gameId && (
            <Button 
              onClick={handleJoinGame}
              className="flex-1"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Join Game
            </Button>
          )}
          
          {status === 'pending' && (
            <>
              <Button 
                variant="outline"
                onClick={() => refetch()}
                size="sm"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              
              <Button 
                variant="destructive"
                onClick={handleCancel}
                disabled={isCancelling}
                size="sm"
              >
                {isCancelling ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <X className="h-3 w-3 mr-1" />
                )}
                Cancel
              </Button>
            </>
          )}
        </div>

        {/* Additional Info */}
        {status === 'pending' && (
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-1 mb-1">
              <Eye className="h-3 w-3" />
              <span className="font-medium">Waiting Room</span>
            </div>
            <p>Players who join via your invitation link or accept your friend request will appear here. The game will start automatically when someone joins.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}