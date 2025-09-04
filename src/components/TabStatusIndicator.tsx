import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Wifi, WifiOff, Users, MousePointer2, RefreshCw } from 'lucide-react';
import { cn } from '~/lib/utils';

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
  className
}: TabStatusIndicatorProps) {
  const getConnectionIcon = () => {
    if (isReconnecting) {
      return <RefreshCw className="w-3 h-3 animate-spin" />;
    }
    return isConnected ? (
      <Wifi className="w-3 h-3 text-green-600" />
    ) : (
      <WifiOff className="w-3 h-3 text-red-600" />
    );
  };

  const getConnectionStatus = () => {
    if (isReconnecting) return 'Reconnecting...';
    if (connectionError) return 'Connection Error';
    return isConnected ? 'Connected' : 'Disconnected';
  };

  const getConnectionBadgeVariant = () => {
    if (isReconnecting) return 'secondary';
    if (connectionError) return 'destructive';
    return isConnected ? 'default' : 'secondary';
  };

  return (
    <Card className={cn('border-0 bg-gradient-to-br from-blue-50 to-indigo-50', className)}>
      <CardContent className="p-3 space-y-2">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <span className="text-xs font-medium text-blue-900">
              Multi-Tab Sync
            </span>
          </div>
          <Badge 
            variant={getConnectionBadgeVariant()}
            className="text-xs"
          >
            {getConnectionStatus()}
          </Badge>
        </div>

        {/* Tab Status */}
        {isConnected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-800">
                  {totalTabs} tab{totalTabs !== 1 ? 's' : ''}
                </span>
              </div>
              {isActiveTab ? (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-300">
                  <MousePointer2 className="w-3 h-3 mr-1" />
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
                  className="flex-1 h-7 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  <MousePointer2 className="w-3 h-3 mr-1" />
                  Make Active
                </Button>
              )}
              
              {!isConnected && onReconnect && (
                <Button
                  onClick={onReconnect}
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs"
                  disabled={isReconnecting}
                >
                  <RefreshCw className={cn("w-3 h-3 mr-1", isReconnecting && "animate-spin")} />
                  Reconnect
                </Button>
              )}
            </div>

            {/* Warning for inactive tabs */}
            {!isActiveTab && (
              <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                ⚠️ Only the active tab can make moves
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {connectionError && (
          <div className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
            {connectionError}
          </div>
        )}

        {/* Offline Mode Notice */}
        {!isConnected && !isReconnecting && !connectionError && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
              Operating in offline mode
            </div>
            
            {/* Offline move queue status */}
            {offlineMoveCount > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                📦 {offlineMoveCount} move{offlineMoveCount !== 1 ? 's' : ''} queued for sync
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