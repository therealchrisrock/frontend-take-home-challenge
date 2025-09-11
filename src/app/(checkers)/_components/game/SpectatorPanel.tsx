"use client";

import React, { useState } from "react";
import { Eye, Users, UserPlus, Settings, MessageCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { useMultiplayerGame } from "./MultiplayerGameProvider";

interface SpectatorPanelProps {
  className?: string;
  variant?: "full" | "compact";
}

export function SpectatorPanel({ 
  className, 
  variant = "full" 
}: SpectatorPanelProps) {
  const { state, actions } = useMultiplayerGame();
  const [showSpectatorList, setShowSpectatorList] = useState(false);

  const isSpectator = state.playerRole === 'SPECTATOR';
  const spectatorCount = state.spectatorCount;

  // Placeholder spectator data (will be replaced when Group 4 implements real spectator management)
  const mockSpectators = Array.from({ length: Math.min(spectatorCount, 5) }, (_, i) => ({
    id: `spectator-${i}`,
    name: `Spectator ${i + 1}`,
    avatar: null,
    joinedAt: Date.now() - (i * 60000), // Staggered join times
  }));

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {isSpectator && (
          <Badge variant="outline" className="text-purple-600">
            <Eye className="mr-1 h-3 w-3" />
            Spectating
          </Badge>
        )}
        {spectatorCount > 0 && (
          <Badge variant="secondary">
            <Users className="mr-1 h-3 w-3" />
            {spectatorCount} watching
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border-l-4 border-l-purple-500", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-600" />
            Spectator Mode
            {spectatorCount > 0 && (
              <Badge variant="secondary">
                {spectatorCount} watching
              </Badge>
            )}
          </div>
          
          {spectatorCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSpectatorList(!showSpectatorList)}
              className="h-7 text-xs"
            >
              <Users className="mr-1 h-3 w-3" />
              {showSpectatorList ? 'Hide' : 'Show'} List
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {isSpectator ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-purple-50 p-3 text-sm text-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">You are spectating this game</span>
              </div>
              <p className="text-xs text-purple-600">
                You can watch the game but cannot make moves. You'll see all moves in real-time.
              </p>
            </div>

            {/* Spectator Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => actions.promoteFromSpectator()}
                className="text-xs"
              >
                <UserPlus className="mr-1 h-3 w-3" />
                Join Game
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
              >
                <Settings className="mr-1 h-3 w-3" />
                Settings
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">Others are watching</span>
              </div>
              <p className="text-xs text-blue-600">
                {spectatorCount === 0 
                  ? "No spectators currently watching this game"
                  : `${spectatorCount} spectator${spectatorCount !== 1 ? 's' : ''} watching this game`
                }
              </p>
            </div>

            {/* Invite Spectators */}
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => {
                // This would open a share dialog or copy game link
                console.log("Invite spectators");
              }}
            >
              <UserPlus className="mr-1 h-3 w-3" />
              Invite Spectators
            </Button>
          </div>
        )}

        {/* Spectator List */}
        {showSpectatorList && spectatorCount > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">
                Spectators ({spectatorCount})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {mockSpectators.map((spectator, index) => (
                  <div
                    key={spectator.id}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 p-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={spectator.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {spectator.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-xs font-medium">
                      {spectator.name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={() => {
                        console.log("Chat with spectator", spectator.id);
                      }}
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                {spectatorCount > mockSpectators.length && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{spectatorCount - mockSpectators.length} more
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface SpectatorIndicatorProps {
  className?: string;
  showCount?: boolean;
}

export function SpectatorIndicator({ 
  className,
  showCount = true 
}: SpectatorIndicatorProps) {
  const { state } = useMultiplayerGame();
  
  if (state.playerRole !== 'SPECTATOR' && state.spectatorCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {state.playerRole === 'SPECTATOR' && (
        <Badge variant="outline" className="text-purple-600">
          <Eye className="mr-1 h-3 w-3" />
          Spectating
        </Badge>
      )}
      
      {showCount && state.spectatorCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          <Users className="mr-1 h-3 w-3" />
          {state.spectatorCount}
        </Badge>
      )}
    </div>
  );
}

interface SpectatorToolbarProps {
  className?: string;
  onToggleChat?: () => void;
  onInviteSpectators?: () => void;
  onLeaveGame?: () => void;
}

export function SpectatorToolbar({ 
  className,
  onToggleChat,
  onInviteSpectators,
  onLeaveGame
}: SpectatorToolbarProps) {
  const { state, actions } = useMultiplayerGame();

  if (state.playerRole !== 'SPECTATOR') return null;

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border bg-card p-2", className)}>
      <Badge variant="outline" className="text-purple-600">
        <Eye className="mr-1 h-3 w-3" />
        Spectating
      </Badge>
      
      <Separator orientation="vertical" className="h-4" />
      
      <div className="flex items-center gap-1">
        {onToggleChat && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleChat}
            className="h-7 text-xs"
          >
            <MessageCircle className="mr-1 h-3 w-3" />
            Chat
          </Button>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => actions.promoteFromSpectator()}
          className="h-7 text-xs"
        >
          <UserPlus className="mr-1 h-3 w-3" />
          Join
        </Button>
        
        {onInviteSpectators && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onInviteSpectators}
            className="h-7 text-xs"
          >
            <Users className="mr-1 h-3 w-3" />
            Invite
          </Button>
        )}
      </div>
      
      <Separator orientation="vertical" className="h-4" />
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onLeaveGame || actions.leaveGame}
        className="h-7 text-xs text-red-600 hover:bg-red-50"
      >
        Leave
      </Button>
    </div>
  );
}

// Hook for spectator functionality
export function useSpectator() {
  const { state, actions } = useMultiplayerGame();

  const isSpectator = state.playerRole === 'SPECTATOR';
  const canJoinAsPlayer = isSpectator; // This would need more complex logic in real implementation
  const spectatorCount = state.spectatorCount;

  const joinAsSpectator = async () => {
    await actions.joinAsSpectator();
  };

  const promoteToPlayer = async () => {
    if (isSpectator) {
      await actions.promoteFromSpectator();
    }
  };

  const inviteSpectators = () => {
    // This would generate and share a spectator link
    console.log("Invite spectators functionality");
  };

  return {
    isSpectator,
    canJoinAsPlayer,
    spectatorCount,
    hasSpectators: spectatorCount > 0,
    joinAsSpectator,
    promoteToPlayer,
    inviteSpectators,
    leaveGame: actions.leaveGame
  };
}