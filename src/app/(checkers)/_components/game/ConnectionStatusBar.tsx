"use client";

import React from "react";
import { Wifi, WifiOff, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { useMultiplayerGame } from "./MultiplayerGameProvider";

interface ConnectionStatusBarProps {
  className?: string;
}

export function ConnectionStatusBar({ className }: ConnectionStatusBarProps) {
  const { state } = useMultiplayerGame();
  const {
    isConnected,
    connectionError,
    isReconnecting,
    offlineMoveQueue,
    opponentConnected,
  } = state;

  const hasQueuedMoves = offlineMoveQueue.length > 0;

  // Determine connection status
  let statusIcon;
  let statusText;
  let statusColor;

  if (isReconnecting) {
    statusIcon = <Clock className="h-4 w-4 animate-spin" />;
    statusText = "Reconnecting...";
    statusColor = "text-yellow-600";
  } else if (!isConnected) {
    statusIcon = <WifiOff className="h-4 w-4" />;
    statusText = connectionError || "Disconnected";
    statusColor = "text-red-600";
  } else if (!opponentConnected) {
    statusIcon = <AlertTriangle className="h-4 w-4" />;
    statusText = "Waiting for opponent...";
    statusColor = "text-yellow-600";
  } else {
    statusIcon = <CheckCircle2 className="h-4 w-4" />;
    statusText = "Connected";
    statusColor = "text-green-600";
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border bg-card p-3 text-sm shadow-sm",
        className
      )}
    >
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <div className={cn("flex items-center gap-2", statusColor)}>
          {statusIcon}
          <span className="font-medium">{statusText}</span>
        </div>
      </div>

      {/* Additional Info */}
      <div className="flex items-center gap-4">
        {/* Offline Queue Status */}
        {hasQueuedMoves && (
          <div className="flex items-center gap-1 text-yellow-600">
            <Clock className="h-4 w-4" />
            <span className="text-xs">
              {offlineMoveQueue.length} move{offlineMoveQueue.length !== 1 ? 's' : ''} queued
            </span>
          </div>
        )}

        {/* Connection Quality Indicator */}
        {isConnected && (
          <div className="flex items-center gap-1">
            <Wifi className={cn("h-4 w-4", statusColor)} />
            <div className="flex gap-1">
              {/* Connection strength bars */}
              <div className={cn("h-2 w-1 bg-current opacity-100", statusColor)} />
              <div className={cn("h-2 w-1 bg-current", isConnected ? "opacity-100" : "opacity-30", statusColor)} />
              <div className={cn("h-2 w-1 bg-current", isConnected && opponentConnected ? "opacity-100" : "opacity-30", statusColor)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ConnectionStatusIndicatorProps {
  variant?: "minimal" | "full";
  className?: string;
}

export function ConnectionStatusIndicator({ 
  variant = "minimal",
  className 
}: ConnectionStatusIndicatorProps) {
  const { state } = useMultiplayerGame();
  const { isConnected, isReconnecting, opponentConnected } = state;

  if (variant === "minimal") {
    let dotColor = "bg-red-500";
    let pulseClass = "";

    if (isReconnecting) {
      dotColor = "bg-yellow-500";
      pulseClass = "animate-pulse";
    } else if (isConnected && opponentConnected) {
      dotColor = "bg-green-500";
    } else if (isConnected) {
      dotColor = "bg-yellow-500";
    }

    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div 
          className={cn(
            "h-2 w-2 rounded-full", 
            dotColor, 
            pulseClass
          )}
        />
      </div>
    );
  }

  return <ConnectionStatusBar className={className} />;
}

// Hook to use connection status in other components
export function useConnectionStatus() {
  const { state } = useMultiplayerGame();
  
  return {
    isOnline: state.isConnected,
    isReconnecting: state.isReconnecting,
    hasError: !!state.connectionError,
    errorMessage: state.connectionError,
    hasQueuedMoves: state.offlineMoveQueue.length > 0,
    queuedMovesCount: state.offlineMoveQueue.length,
    opponentConnected: state.opponentConnected,
    quality: state.isConnected && state.opponentConnected ? 'good' : 
             state.isConnected ? 'partial' : 'poor'
  };
}