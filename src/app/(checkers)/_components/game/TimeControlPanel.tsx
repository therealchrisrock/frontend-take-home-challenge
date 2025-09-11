"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Pause, Play, RotateCcw, Settings } from "lucide-react";
import { TimeDisplay } from "./TimeDisplay";
import { cn } from "~/lib/utils";
import {
  type TimeState,
  type TimeControl,
  type TimeWarning,
  DEFAULT_TIME_WARNINGS,
  timeControlToString,
} from "~/lib/time-control-types";

interface TimeControlPanelProps {
  /** Current time state */
  timeState: TimeState;
  /** Time control configuration */
  timeControl: TimeControl | null;
  /** Custom warning thresholds */
  warnings?: TimeWarning[];
  /** Whether game is active */
  gameActive: boolean;
  /** Whether AI is thinking (disable pause) */
  aiThinking?: boolean;
  /** Callback for pause/resume */
  onPauseResume?: () => void;
  /** Callback for reset timers */
  onReset?: () => void;
  /** Callback to open time control settings */
  onSettings?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function TimeControlPanel({
  timeState,
  timeControl,
  warnings = DEFAULT_TIME_WARNINGS,
  gameActive,
  aiThinking = false,
  onPauseResume,
  onReset,
  onSettings,
  className,
}: TimeControlPanelProps) {
  // Calculate time advantage (positive = red ahead, negative = black ahead)
  const timeAdvantage = timeState.redTime - timeState.blackTime;
  const advantageText = Math.abs(timeAdvantage);
  const advantagePlayer = timeAdvantage > 0 ? "red" : "black";
  const showAdvantage = Math.abs(timeAdvantage) > 5000; // Show if more than 5 seconds difference

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            Time Control
            {timeControl && (
              <Badge variant="outline" className="font-mono text-xs">
                {timeControlToString(timeControl)}
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-1">
            {/* Time advantage indicator */}
            {showAdvantage && gameActive && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  advantagePlayer === "red"
                    ? "border-red-500 text-red-600"
                    : "border-gray-600 text-gray-700",
                )}
              >
                +{Math.floor(advantageText / 1000)}s{" "}
                {advantagePlayer === "red" ? "Red" : "Black"}
              </Badge>
            )}

            {/* Settings button */}
            {onSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettings}
                className="h-7 w-7 p-0"
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {timeControl ? (
          <>
            {/* Time displays */}
            <div className="grid grid-cols-2 gap-3">
              <TimeDisplay
                timeState={timeState}
                player="red"
                warnings={warnings}
                className="w-full"
              />
              <TimeDisplay
                timeState={timeState}
                player="black"
                warnings={warnings}
                className="w-full"
              />
            </div>

            {/* Control buttons */}
            <div className="flex gap-2">
              {onPauseResume && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPauseResume}
                  disabled={!gameActive || aiThinking}
                  className="flex-1"
                >
                  {timeState.isPaused ? (
                    <>
                      <Play className="mr-1 h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="mr-1 h-4 w-4" />
                      Pause
                    </>
                  )}
                </Button>
              )}

              {onReset && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReset}
                  className="flex-1"
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>

            {/* Status indicators */}
            <div className="text-muted-foreground space-y-1 text-xs">
              {timeState.isPaused && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Pause className="h-3 w-3" />
                  Game paused
                </div>
              )}

              {aiThinking && (
                <div className="text-blue-600">AI is thinking...</div>
              )}

              {!gameActive && (
                <div className="text-gray-500">Game not active</div>
              )}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground py-6 text-center">
            <div className="text-sm">No time control set</div>
            {onSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSettings}
                className="mt-2"
              >
                <Settings className="mr-1 h-4 w-4" />
                Configure Time Control
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
