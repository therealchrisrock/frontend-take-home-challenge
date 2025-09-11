"use client";

import React, { useState } from "react";
import { 
  WifiOff, 
  Clock, 
  Upload, 
  X, 
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";
import { useMultiplayerGame } from "./MultiplayerGameProvider";
import { useConnectionStatus } from "./ConnectionStatusBar";
import type { Move } from "~/lib/game/logic";

interface OfflineQueuePanelProps {
  className?: string;
  variant?: "full" | "compact";
}

export function OfflineQueuePanel({ 
  className, 
  variant = "full" 
}: OfflineQueuePanelProps) {
  const { state, actions } = useMultiplayerGame();
  const connectionStatus = useConnectionStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const queuedMoves = state.offlineMoveQueue;
  const hasQueuedMoves = queuedMoves.length > 0;

  if (!hasQueuedMoves && connectionStatus.isOnline) {
    return null;
  }

  const handleProcessQueue = async () => {
    setIsProcessing(true);
    try {
      // This would trigger the sync actions to process the queue
      // The actual processing is handled by the useGameSync hook
      if (connectionStatus.isOnline) {
        console.log("Processing offline queue...");
        // The queue processing is automatic when connection is restored
        // This is just for manual retry if needed
      }
    } catch (error) {
      console.error("Failed to process queue:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearQueue = () => {
    // This would need to be implemented in the multiplayer provider
    console.log("Clear queue requested");
  };

  const formatMoveDescription = (move: Move, index: number) => {
    return `Move ${index + 1}: ${String.fromCharCode(97 + move.from.col)}${8 - move.from.row} → ${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {!connectionStatus.isOnline && (
          <Badge variant="outline" className="text-yellow-600">
            <WifiOff className="mr-1 h-3 w-3" />
            Offline
          </Badge>
        )}
        {hasQueuedMoves && (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            {queuedMoves.length} queued
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border-l-4", {
      "border-l-yellow-500": !connectionStatus.isOnline && hasQueuedMoves,
      "border-l-green-500": connectionStatus.isOnline && hasQueuedMoves,
      "border-l-gray-300": !hasQueuedMoves
    }, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            {!connectionStatus.isOnline ? (
              <WifiOff className="h-4 w-4 text-yellow-600" />
            ) : (
              <Upload className="h-4 w-4 text-green-600" />
            )}
            Offline Move Queue
            {hasQueuedMoves && (
              <Badge variant="secondary">
                {queuedMoves.length} move{queuedMoves.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          
          {hasQueuedMoves && (
            <div className="flex items-center gap-2">
              {connectionStatus.isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleProcessQueue}
                  disabled={isProcessing}
                  className="h-7 text-xs"
                >
                  {isProcessing ? (
                    <Clock className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="mr-1 h-3 w-3" />
                  )}
                  Sync Now
                </Button>
              )}
              
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!hasQueuedMoves ? (
          <p className="text-sm text-gray-500">No moves in queue</p>
        ) : (
          <>
            {/* Status Alert */}
            <Alert className={cn("mb-3", {
              "border-yellow-500 bg-yellow-50": !connectionStatus.isOnline,
              "border-blue-500 bg-blue-50": connectionStatus.isOnline,
            })}>
              {!connectionStatus.isOnline ? (
                <WifiOff className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertDescription>
                {!connectionStatus.isOnline ? (
                  <>
                    You're offline. Your moves are queued and will be synced automatically when connection is restored.
                  </>
                ) : (
                  <>
                    Connection restored! Your queued moves will be synced shortly.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* Queue Summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {queuedMoves.length} move{queuedMoves.length !== 1 ? 's' : ''} pending sync
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearQueue}
                className="h-6 text-xs text-red-600 hover:bg-red-50"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>

            {/* Expandable Move List */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleContent className="space-y-2 pt-3">
                <div className="space-y-1">
                  {queuedMoves.map((move, index) => (
                    <div
                      key={`${move.from.row}-${move.from.col}-${move.to.row}-${move.to.col}-${index}`}
                      className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm"
                    >
                      <span className="font-mono text-xs">
                        {formatMoveDescription(move, index)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">Queued</span>
                      </div>
                    </div>
                  ))}
                </div>

                {connectionStatus.isOnline && (
                  <div className="pt-2">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleProcessQueue}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Sync All Moves
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface OfflineQueueStatusProps {
  className?: string;
}

export function OfflineQueueStatus({ className }: OfflineQueueStatusProps) {
  const { state } = useMultiplayerGame();
  const connectionStatus = useConnectionStatus();

  const queueCount = state.offlineMoveQueue.length;
  
  if (queueCount === 0) return null;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Badge variant={connectionStatus.isOnline ? "default" : "secondary"} className="text-xs">
        <Clock className="mr-1 h-3 w-3" />
        {queueCount} queued
      </Badge>
      
      {!connectionStatus.isOnline && (
        <span className="text-xs text-gray-500">
          Waiting for connection...
        </span>
      )}
    </div>
  );
}

// Hook for managing offline queue
export function useOfflineQueue() {
  const { state, actions } = useMultiplayerGame();
  const connectionStatus = useConnectionStatus();

  const queueMove = (move: Move) => {
    // This would be handled by the multiplayer provider
    console.log("Queue move:", move);
  };

  const processQueue = async () => {
    if (!connectionStatus.isOnline) return false;
    
    try {
      // Process all queued moves
      // This is typically handled automatically by the sync system
      return true;
    } catch (error) {
      console.error("Failed to process queue:", error);
      return false;
    }
  };

  const clearQueue = () => {
    // Clear all queued moves (should be used with caution)
    console.log("Clear queue requested");
  };

  return {
    queuedMoves: state.offlineMoveQueue,
    queueCount: state.offlineMoveQueue.length,
    hasQueuedMoves: state.offlineMoveQueue.length > 0,
    isProcessing: connectionStatus.isReconnecting,
    canProcess: connectionStatus.isOnline,
    queueMove,
    processQueue,
    clearQueue
  };
}