"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useMultiplayerGame } from "./MultiplayerGameProvider";
import { useConnectionStatus } from "./ConnectionStatusBar";

interface MoveSyncIndicatorProps {
  className?: string;
  variant?: "full" | "minimal";
}

export function MoveSyncIndicator({ 
  className, 
  variant = "full" 
}: MoveSyncIndicatorProps) {
  const { state, actions } = useMultiplayerGame();
  const connectionStatus = useConnectionStatus();
  const [lastMoveTime, setLastMoveTime] = useState<number | null>(null);
  const [syncLatency, setSyncLatency] = useState<number | null>(null);

  // Track move synchronization timing
  useEffect(() => {
    if (connectionStatus.isOnline && state.opponentConnected) {
      setLastMoveTime(Date.now());
    }
  }, [connectionStatus.isOnline, state.opponentConnected]);

  // Calculate sync latency for display
  useEffect(() => {
    if (state.ping !== null) {
      setSyncLatency(state.ping);
    }
  }, [state.ping]);

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {connectionStatus.hasQueuedMoves && (
          <Badge variant="outline" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            {connectionStatus.queuedMovesCount}
          </Badge>
        )}
        {syncLatency !== null && syncLatency < 200 && (
          <Badge variant="outline" className="text-xs text-green-600">
            {syncLatency}ms
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border p-2", className)}>
      {/* Sync Status */}
      <div className="flex items-center gap-2">
        {connectionStatus.hasQueuedMoves ? (
          <>
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-600">
              Syncing {connectionStatus.queuedMovesCount} move{connectionStatus.queuedMovesCount !== 1 ? 's' : ''}...
            </span>
          </>
        ) : connectionStatus.hasError ? (
          <>
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">Sync failed</span>
          </>
        ) : connectionStatus.isOnline && state.opponentConnected ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600">Moves synced</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 animate-pulse text-gray-400" />
            <span className="text-sm text-gray-500">Waiting for sync...</span>
          </>
        )}
      </div>

      {/* Latency Display */}
      {syncLatency !== null && connectionStatus.isOnline && (
        <div className="flex items-center gap-1 text-xs">
          <span className={cn(
            "font-mono",
            syncLatency < 100 ? "text-green-600" :
            syncLatency < 300 ? "text-yellow-600" :
            "text-red-600"
          )}>
            {syncLatency}ms
          </span>
        </div>
      )}

      {/* Retry Button */}
      {connectionStatus.hasError && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => actions.reconnect()}
          disabled={state.isReconnecting}
          className="h-6 px-2 text-xs"
        >
          <RotateCcw className={cn(
            "h-3 w-3",
            state.isReconnecting && "animate-spin"
          )} />
          Retry
        </Button>
      )}
    </div>
  );
}

interface OptimisticMoveOverlayProps {
  isVisible: boolean;
  moveDescription?: string;
  className?: string;
}

export function OptimisticMoveOverlay({ 
  isVisible, 
  moveDescription,
  className 
}: OptimisticMoveOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "absolute inset-0 z-10 flex items-center justify-center bg-blue-100/80 backdrop-blur-sm rounded-lg",
      className
    )}>
      <div className="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 shadow-md">
        <Clock className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          {moveDescription ? `Syncing: ${moveDescription}` : "Syncing move..."}
        </span>
      </div>
    </div>
  );
}

interface MoveConflictIndicatorProps {
  hasConflict: boolean;
  onResolve?: () => void;
  className?: string;
}

export function MoveConflictIndicator({ 
  hasConflict, 
  onResolve,
  className 
}: MoveConflictIndicatorProps) {
  if (!hasConflict) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-red-800",
      className
    )}>
      <AlertTriangle className="h-4 w-4" />
      <span className="text-sm font-medium">Move conflict detected</span>
      {onResolve && (
        <Button
          size="sm"
          variant="outline"
          onClick={onResolve}
          className="h-6 text-xs border-red-300 text-red-700 hover:bg-red-100"
        >
          Resolve
        </Button>
      )}
    </div>
  );
}

// Hook for managing optimistic moves
export function useOptimisticMoves() {
  const [pendingMoves, setPendingMoves] = useState<Map<string, {
    moveId: string;
    description: string;
    timestamp: number;
  }>>(new Map());

  const addOptimisticMove = (moveId: string, description: string) => {
    setPendingMoves(prev => new Map(prev.set(moveId, {
      moveId,
      description,
      timestamp: Date.now()
    })));
  };

  const confirmOptimisticMove = (moveId: string) => {
    setPendingMoves(prev => {
      const newMap = new Map(prev);
      newMap.delete(moveId);
      return newMap;
    });
  };

  const rollbackOptimisticMove = (moveId: string) => {
    setPendingMoves(prev => {
      const newMap = new Map(prev);
      newMap.delete(moveId);
      return newMap;
    });
  };

  const clearAllOptimisticMoves = () => {
    setPendingMoves(new Map());
  };

  const hasPendingMoves = pendingMoves.size > 0;
  const latestPendingMove = Array.from(pendingMoves.values()).sort((a, b) => b.timestamp - a.timestamp)[0];

  return {
    pendingMoves,
    addOptimisticMove,
    confirmOptimisticMove,
    rollbackOptimisticMove,
    clearAllOptimisticMoves,
    hasPendingMoves,
    latestPendingMove
  };
}