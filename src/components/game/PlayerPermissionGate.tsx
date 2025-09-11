"use client";

import { ReactNode } from "react";
import { AlertTriangle, Eye, Lock } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { GameRole } from "~/lib/game/playerRoles";
import type { SpectatorPermissions } from "~/lib/game/spectatorManager";
import { getPermissions } from "~/lib/game/spectatorManager";
import type { PieceColor } from "~/lib/game/logic";

interface PlayerPermissionGateProps {
  children: ReactNode;
  requiredPermission: keyof SpectatorPermissions;
  viewerRole: GameRole | null;
  currentTurnColor: PieceColor;
  fallback?: ReactNode;
  showReason?: boolean;
  onRequestPermission?: () => void;
}

/**
 * Gates content based on user permissions
 * Shows appropriate fallback or error message for unauthorized access
 */
export function PlayerPermissionGate({
  children,
  requiredPermission,
  viewerRole,
  currentTurnColor,
  fallback,
  showReason = false,
  onRequestPermission,
}: PlayerPermissionGateProps) {
  const permissions = getPermissions(viewerRole, currentTurnColor);
  
  if (permissions[requiredPermission]) {
    return <>{children}</>;
  }

  // Permission denied - show fallback or error message
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showReason) {
    return null;
  }

  return (
    <PermissionDeniedMessage
      requiredPermission={requiredPermission}
      viewerRole={viewerRole}
      currentTurnColor={currentTurnColor}
      onRequestPermission={onRequestPermission}
    />
  );
}

interface MovePermissionGateProps {
  children: ReactNode;
  viewerRole: GameRole | null;
  currentTurnColor: PieceColor;
  fallback?: ReactNode;
  showWaitMessage?: boolean;
}

/**
 * Specialized gate for move-making permissions
 */
export function MovePermissionGate({
  children,
  viewerRole,
  currentTurnColor,
  fallback,
  showWaitMessage = false,
}: MovePermissionGateProps) {
  const permissions = getPermissions(viewerRole, currentTurnColor);
  
  if (permissions.canMakeMove) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showWaitMessage) {
    return (
      <MoveWaitMessage
        viewerRole={viewerRole}
        currentTurnColor={currentTurnColor}
      />
    );
  }

  return null;
}

interface PermissionDeniedMessageProps {
  requiredPermission: keyof SpectatorPermissions;
  viewerRole: GameRole | null;
  currentTurnColor: PieceColor;
  onRequestPermission?: () => void;
}

function PermissionDeniedMessage({
  requiredPermission,
  viewerRole,
  currentTurnColor,
  onRequestPermission,
}: PermissionDeniedMessageProps) {
  const getReason = () => {
    if (!viewerRole) {
      return "You need to join the game to access this feature";
    }

    if (viewerRole.isSpectator) {
      if (requiredPermission === "canMakeMove") {
        return "Spectators cannot make moves";
      }
      if (requiredPermission === "canViewPlayerInfo") {
        return "Limited player information available to spectators";
      }
      return "This feature is not available to spectators";
    }

    if (requiredPermission === "canMakeMove" && viewerRole.color !== currentTurnColor) {
      return `It's ${currentTurnColor}'s turn`;
    }

    return "You don't have permission to access this feature";
  };

  const getIcon = () => {
    if (requiredPermission === "canMakeMove") {
      return <Lock className="h-4 w-4" />;
    }
    if (viewerRole?.isSpectator) {
      return <Eye className="h-4 w-4" />;
    }
    return <AlertTriangle className="h-4 w-4" />;
  };

  const canRequestPermission = !viewerRole || (viewerRole.isSpectator && requiredPermission !== "canMakeMove");

  return (
    <Alert className="my-4">
      {getIcon()}
      <AlertDescription className="flex items-center justify-between">
        <span>{getReason()}</span>
        
        {canRequestPermission && onRequestPermission && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestPermission}
            className="ml-4"
          >
            {!viewerRole ? "Join Game" : "Request Permission"}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface MoveWaitMessageProps {
  viewerRole: GameRole | null;
  currentTurnColor: PieceColor;
}

function MoveWaitMessage({ viewerRole, currentTurnColor }: MoveWaitMessageProps) {
  if (!viewerRole) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-500">
        <Eye className="h-4 w-4 mr-2" />
        <span className="text-sm">Watching the game</span>
      </div>
    );
  }

  if (viewerRole.isSpectator) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-500">
        <Eye className="h-4 w-4 mr-2" />
        <span className="text-sm">Spectating</span>
        <Badge variant="secondary" className="ml-2">
          {currentTurnColor}'s turn
        </Badge>
      </div>
    );
  }

  if (viewerRole.color !== currentTurnColor) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-500">
        <div className="text-center">
          <div className="text-sm mb-1">Waiting for opponent</div>
          <Badge variant="outline">
            {currentTurnColor}'s turn
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4 text-green-600">
      <div className="text-center">
        <div className="text-sm font-medium mb-1">Your turn</div>
        <Badge variant="default" className="bg-green-100 text-green-800">
          Make your move
        </Badge>
      </div>
    </div>
  );
}

interface ViewerStatusBadgeProps {
  viewerRole: GameRole | null;
  currentTurnColor: PieceColor;
  className?: string;
}

/**
 * Shows the viewer's current status in the game
 */
export function ViewerStatusBadge({
  viewerRole,
  currentTurnColor,
  className,
}: ViewerStatusBadgeProps) {
  if (!viewerRole) {
    return (
      <Badge variant="secondary" className={className}>
        <Eye className="h-3 w-3 mr-1" />
        Visitor
      </Badge>
    );
  }

  if (viewerRole.isSpectator) {
    return (
      <Badge variant="outline" className={className}>
        <Eye className="h-3 w-3 mr-1" />
        Spectator
      </Badge>
    );
  }

  const isCurrentTurn = viewerRole.color === currentTurnColor;
  
  return (
    <Badge 
      variant={isCurrentTurn ? "default" : "secondary"} 
      className={className}
    >
      <div 
        className={`h-2 w-2 rounded-full mr-2 ${
          viewerRole.color === "red" ? "bg-red-500" : "bg-gray-800"
        }`} 
      />
      {viewerRole.color} Player
      {isCurrentTurn && <span className="ml-1">- Your Turn</span>}
    </Badge>
  );
}