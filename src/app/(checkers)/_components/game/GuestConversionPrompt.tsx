"use client";

import {
  ArrowRight,
  Clock,
  Gift,
  Star,
  Trophy,
  User,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { PostGameAccountFlow } from "~/components/guest/PostGameAccountFlow";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { getGuestStats, type GuestSession } from "~/lib/guest/sessionStorage";

interface GuestConversionPromptProps {
  guestSession: GuestSession;
  onDismiss: () => void;
  trigger?: "time-based" | "win-streak" | "games-played" | "manual";
  className?: string;
}

export function GuestConversionPrompt({
  guestSession,
  onDismiss,
  trigger = "manual",
  className
}: GuestConversionPromptProps) {
  const [showFullFlow, setShowFullFlow] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const guestStats = getGuestStats();

  // Auto-dismiss logic based on trigger
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (trigger === "time-based") {
      // Auto-dismiss after 10 seconds if user doesn't interact
      timer = setTimeout(() => {
        handleDismiss();
      }, 10000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [trigger]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => {
      onDismiss();
    }, 300); // Allow exit animation
  };

  const handleCreateAccount = () => {
    setShowFullFlow(true);
  };

  const handleCloseFlow = () => {
    setShowFullFlow(false);
    handleDismiss();
  };

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  // Get trigger-specific messaging
  const getTriggerMessage = () => {
    switch (trigger) {
      case "time-based":
        return "You've been playing for a while!";
      case "win-streak":
        return "Great winning streak!";
      case "games-played":
        return `${guestStats?.gamesPlayed || 0} games played!`;
      case "manual":
      default:
        return "Enjoying the game?";
    }
  };

  const getTriggerDescription = () => {
    switch (trigger) {
      case "time-based":
        return "Don't lose your progress - create an account to save your stats.";
      case "win-streak":
        return "Save your winning streak by creating an account!";
      case "games-played":
        return "You're getting good at this! Save your progress with an account.";
      case "manual":
      default:
        return "Create an account to save your game history and compete with friends.";
    }
  };

  return (
    <>
      <Card className={`relative ${className} ${isDismissed ? 'animate-out fade-out-0 slide-out-to-right-1' : 'animate-in fade-in-0 slide-in-from-right-1'}`}>
        <CardContent className="p-4">
          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
          </Button>

          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Gift className="h-4 w-4 text-primary-700" />
              </div>
              <div>
                <div className="font-medium text-sm">{getTriggerMessage()}</div>
                <div className="text-xs text-muted-foreground">
                  {getTriggerDescription()}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {guestStats && guestStats.gamesPlayed > 0 && (
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  {guestStats.wins}W
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  {guestStats.gamesPlayed} games
                </Badge>
                {guestStats.winRate > 0.6 && (
                  <Badge variant="outline" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    {Math.round(guestStats.winRate * 100)}%
                  </Badge>
                )}
              </div>
            )}

            {/* Current session info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Playing as: {guestSession.displayName}</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.floor((Date.now() - guestSession.createdAt.getTime()) / (1000 * 60))}m
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateAccount}
                className="flex-1 text-xs h-8"
              >
                Create Account
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                className="text-xs h-8"
              >
                Later
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full conversion flow modal */}
      {showFullFlow && (
        <PostGameAccountFlow
          isOpen={showFullFlow}
          onClose={handleCloseFlow}
          gameResult="WIN" // This would be passed from the game context
          guestSession={guestSession}
          gameStats={{
            moves: 0, // This would be passed from the game context
            duration: 0, // This would be passed from the game context
            gameId: "", // This would be passed from the game context
          }}
        />
      )}
    </>
  );
}

export default GuestConversionPrompt;