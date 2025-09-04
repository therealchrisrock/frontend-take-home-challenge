'use client';

import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Clock, Pause, Play } from 'lucide-react';
import { cn } from '~/lib/utils';
import { 
  formatTime, 
  getTimeWarningLevel,
  type TimeState,
  type PieceColor,
  type TimeWarning,
  DEFAULT_TIME_WARNINGS
} from '~/lib/time-control-types';

interface TimeDisplayProps {
  /** Time state for both players */
  timeState: TimeState;
  /** Which player this display is for */
  player: PieceColor;
  /** Custom warning thresholds */
  warnings?: TimeWarning[];
  /** Additional CSS classes */
  className?: string;
  /** Show pause indicator */
  showPauseIcon?: boolean;
}

export function TimeDisplay({ 
  timeState, 
  player, 
  warnings = DEFAULT_TIME_WARNINGS,
  className,
  showPauseIcon = true
}: TimeDisplayProps) {
  const playerTime = player === 'red' ? timeState.redTime : timeState.blackTime;
  const isActive = timeState.activePlayer === player;
  const warning = getTimeWarningLevel(timeState, player, warnings);
  
  // Format time - show tenths when under 1 minute
  const displayTime = formatTime(playerTime, playerTime < 60000);
  
  // Determine display style based on warning level and active state
  const getCardStyle = () => {
    if (warning) {
      switch (warning.level) {
        case 'urgent':
          return 'border-red-600 bg-red-50 animate-pulse';
        case 'critical':
          return 'border-red-500 bg-red-50';
        case 'low':
          return 'border-orange-500 bg-orange-50';
      }
    }
    
    if (isActive && !timeState.isPaused) {
      return player === 'red' 
        ? 'border-red-400 bg-red-50 shadow-lg' 
        : 'border-gray-700 bg-gray-50 shadow-lg';
    }
    
    return player === 'red' 
      ? 'border-red-200 bg-white' 
      : 'border-gray-300 bg-white';
  };
  
  const getTextStyle = () => {
    if (warning?.level === 'urgent') {
      return 'text-red-700 font-bold';
    }
    if (warning?.level === 'critical') {
      return 'text-red-600 font-semibold';
    }
    if (warning?.level === 'low') {
      return 'text-orange-600 font-medium';
    }
    
    return player === 'red' ? 'text-red-600' : 'text-gray-800';
  };

  return (
    <Card className={cn(getCardStyle(), className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className={cn("w-4 h-4", getTextStyle())} />
            <Badge 
              variant="outline" 
              className={cn(
                player === 'red' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-gray-800 text-gray-800',
                isActive && !timeState.isPaused && 'ring-2 ring-offset-1',
                isActive && player === 'red' && 'ring-red-400',
                isActive && player === 'black' && 'ring-gray-400'
              )}
            >
              {player === 'red' ? 'Red' : 'Black'}
            </Badge>
          </div>
          
          {/* Pause/Active indicators */}
          <div className="flex items-center gap-1">
            {isActive && timeState.isPaused && showPauseIcon && (
              <Pause className="w-3 h-3 text-gray-500" />
            )}
            {isActive && !timeState.isPaused && (
              <Play className="w-3 h-3 text-green-500" />
            )}
            {warning && (
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                warning.level === 'urgent' && "bg-red-600",
                warning.level === 'critical' && "bg-red-500",
                warning.level === 'low' && "bg-orange-500"
              )} />
            )}
          </div>
        </div>
        
        <div className={cn(
          "text-2xl font-mono tabular-nums",
          getTextStyle()
        )}>
          {displayTime}
        </div>
        
        {/* Warning text */}
        {warning && (
          <div className={cn(
            "text-xs mt-1 font-medium",
            warning.level === 'urgent' && "text-red-700",
            warning.level === 'critical' && "text-red-600",
            warning.level === 'low' && "text-orange-600"
          )}>
            {warning.level === 'urgent' && "Time running out!"}
            {warning.level === 'critical' && "Low time"}
            {warning.level === 'low' && "Time warning"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}