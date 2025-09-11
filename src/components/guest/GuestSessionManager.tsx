"use client";

import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Loader2, User, Clock, Trophy } from "lucide-react";
import {
  guestSessionManager,
  type GuestSessionData,
  GUEST_SESSION_CONSTANTS
} from "~/lib/game/guest-session";

interface GuestSessionManagerProps {
  onSessionReady: (session: GuestSessionData) => void;
  initialDisplayName?: string;
  showStats?: boolean;
  className?: string;
}

export function GuestSessionManager({
  onSessionReady,
  initialDisplayName,
  showStats = false,
  className
}: GuestSessionManagerProps) {
  const [session, setSession] = useState<GuestSessionData | null>(null);
  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    // Check if storage is available
    setStorageAvailable(isStorageAvailable());
    
    // Try to load existing session
    try {
      const existingSession = getOrCreateGuestSession(initialDisplayName);
      setSession(existingSession);
      setDisplayName(existingSession.displayName);
      onSessionReady(existingSession);
    } catch (err) {
      setError("Failed to create guest session");
      console.error("Guest session creation failed:", err);
    }
  }, [initialDisplayName, onSessionReady]);

  const handleDisplayNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError("Display name cannot be empty");
      return;
    }

    if (displayName.length > 20) {
      setError("Display name must be 20 characters or less");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedSession = updateGuestDisplayName(displayName.trim());
      if (updatedSession) {
        setSession(updatedSession);
        setIsEditing(false);
        onSessionReady(updatedSession);
      } else {
        setError("Failed to update display name");
      }
    } catch (err) {
      setError("An error occurred while updating display name");
      console.error("Display name update failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (session) {
      setDisplayName(session.displayName);
    }
    setError(null);
  };

  const guestStats = showStats && session ? getGuestStats() : null;

  if (!storageAvailable) {
    return (
      <Alert className={className} role="alert" aria-live="polite">
        <AlertDescription>
          Your browser doesn't support local storage. Some features may not work properly.
          Consider using a modern browser or enabling storage permissions.
        </AlertDescription>
      </Alert>
    );
  }

  if (!session) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Setting up guest session...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Guest Player
          </CardTitle>
          <CardDescription>
            Playing as a guest. You can create an account later to save your progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <form onSubmit={handleDisplayNameChange} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  maxLength={20}
                  disabled={isLoading}
                />
              </div>
              {error && (
                <Alert role="alert" aria-live="polite">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} size="sm">
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{session.displayName}</Badge>
                  <Badge variant="outline" className="text-xs">
                    Guest ID: {session.id.slice(-6)}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Name
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Session: {Math.floor((Date.now() - session.createdAt.getTime()) / (1000 * 60))}m ago
                </div>
                {session.gameHistory.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    {session.gameHistory.length} games
                  </div>
                )}
              </div>

              {guestStats && guestStats.gamesPlayed > 0 && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-semibold text-green-600">{guestStats.wins}</div>
                    <div className="text-xs text-muted-foreground">Wins</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-semibold text-red-600">{guestStats.losses}</div>
                    <div className="text-xs text-muted-foreground">Losses</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GuestSessionManager;