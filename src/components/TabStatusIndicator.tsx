import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Wifi, WifiOff, Users, MousePointer2, RefreshCw } from "lucide-react";
import { cn } from "~/lib/utils";

export interface TabStatusIndicatorProps {
  isConnected: boolean;
  isActiveTab: boolean;
  totalTabs: number;
  connectionError: string | null;
  isReconnecting: boolean;
  offlineMoveCount?: number;
  lastConnected?: Date | null;
  onRequestActivation?: () => void;
  onReconnect?: () => void;
  className?: string;
}

export function TabStatusIndicator({
  isConnected,
  isActiveTab,
  totalTabs,
  connectionError,
  isReconnecting,
  offlineMoveCount = 0,
  lastConnected,
  onRequestActivation,
  onReconnect,
  className,
}: TabStatusIndicatorProps) {
  const getConnectionIcon = () => {
    if (isReconnecting) {
      return <RefreshCw className="h-3 w-3 animate-spin" />;
    }
    return isConnected ? (
      <Wifi className="h-3 w-3 text-green-600" />
    ) : (
      <WifiOff className="h-3 w-3 text-red-600" />
    );
  };

  const getConnectionStatus = () => {
    if (isReconnecting) return "Reconnecting...";
    if (connectionError) return "Connection Error";
    return isConnected ? "Connected" : "Disconnected";
  };

  const getConnectionBadgeVariant = () => {
    if (isReconnecting) return "secondary";
    if (connectionError) return "destructive";
    return isConnected ? "default" : "secondary";
  };

  return (
    <Card
      className={cn(
        "border-0 bg-gradient-to-br from-blue-50 to-indigo-50",
        className,
      )}
    >
      <CardContent className="space-y-2 p-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <span className="text-xs font-medium text-blue-900">
              Multi-Tab Sync
            </span>
          </div>
          <Badge variant={getConnectionBadgeVariant()} className="text-xs">
            {getConnectionStatus()}
          </Badge>
        </div>

        {/* Tab Status */}
        {isConnected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-blue-600" />
                <span className="text-xs text-blue-800">
                  {totalTabs} tab{totalTabs !== 1 ? "s" : ""}
                </span>
              </div>
              {isActiveTab ? (
                <Badge
                  variant="default"
                  className="border-green-300 bg-green-100 text-xs text-green-800"
                >
                  <MousePointer2 className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              {!isActiveTab && onRequestActivation && (
                <Button
                  onClick={onRequestActivation}
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 border-blue-200 bg-blue-50 text-xs hover:bg-blue-100"
                >
                  <MousePointer2 className="mr-1 h-3 w-3" />
                  Make Active
                </Button>
              )}

              {!isConnected && onReconnect && (
                <Button
                  onClick={onReconnect}
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  disabled={isReconnecting}
                >
                  <RefreshCw
                    className={cn(
                      "mr-1 h-3 w-3",
                      isReconnecting && "animate-spin",
                    )}
                  />
                  Reconnect
                </Button>
              )}
            </div>

            {/* Warning for inactive tabs */}
            {!isActiveTab && (
              <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                ⚠️ Only the active tab can make moves
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {connectionError && (
          <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
            {connectionError}
          </div>
        )}

        {/* Offline Mode Notice */}
        {!isConnected && !isReconnecting && !connectionError && (
          <div className="space-y-2">
            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600">
              Operating in offline mode
            </div>

            {/* Offline move queue status */}
            {offlineMoveCount > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                📦 {offlineMoveCount} move{offlineMoveCount !== 1 ? "s" : ""}{" "}
                queued for sync
              </div>
            )}

            {/* Last connected time */}
            {lastConnected && (
              <div className="text-xs text-gray-500">
                Last connected: {new Date(lastConnected).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
