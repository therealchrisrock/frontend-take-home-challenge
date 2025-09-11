"use client";

import { Eye, Users, Crown } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import type { GameParticipants, GameRole } from "~/lib/game/playerRoles";
import { getSpectatorViewSummary } from "~/lib/game/spectatorManager";

interface SpectatorIndicatorProps {
  participants: GameParticipants;
  viewerRole: GameRole | null;
  className?: string;
}

/**
 * Shows spectator count and viewer status
 */
export function SpectatorIndicator({
  participants,
  viewerRole,
  className,
}: SpectatorIndicatorProps) {
  const summary = getSpectatorViewSummary(participants, viewerRole);

  if (summary.spectatorCount === 0 && !summary.isSpectating) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3 text-sm">
          {/* Viewer Status */}
          <div className="flex items-center gap-2">
            {summary.viewerStatus === "player" ? (
              <>
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-yellow-700">Playing as {viewerRole?.color}</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-blue-700">
                  {summary.viewerStatus === "spectator" ? "Spectating" : "Viewing"}
                </span>
              </>
            )}
          </div>

          {summary.spectatorCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              
              {/* Spectator Count */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Badge variant="secondary">
                  {summary.spectatorCount} spectator{summary.spectatorCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </>
          )}

          {/* Join Game Option */}
          {summary.canParticipate && summary.viewerStatus !== "player" && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <Badge variant="outline" className="text-green-600 border-green-300">
                Can join as player
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SpectatorListProps {
  participants: GameParticipants;
  className?: string;
}

/**
 * Shows detailed list of spectators
 */
export function SpectatorList({
  participants,
  className,
}: SpectatorListProps) {
  const spectators = participants.spectators;

  if (spectators.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">
            Spectators ({spectators.length})
          </h3>
        </div>
        
        <div className="space-y-2">
          {spectators.map((spectator, index) => (
            <div
              key={`${spectator.user.userId || spectator.user.guestId}-${index}`}
              className="flex items-center gap-2 p-2 rounded-md bg-gray-50"
            >
              {spectator.user.avatar ? (
                <img
                  src={spectator.user.avatar}
                  alt={spectator.user.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                  <Eye className="h-3 w-3 text-gray-600" />
                </div>
              )}
              
              <span className="text-sm text-gray-700">
                {spectator.user.name}
                {spectator.user.isCurrentUser && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    You
                  </Badge>
                )}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}