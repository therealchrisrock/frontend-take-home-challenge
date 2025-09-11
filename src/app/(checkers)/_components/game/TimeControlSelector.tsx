"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { NumberInput } from "~/components/ui/number-input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Clock,
  Zap,
  Timer,
  Trophy,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  type TimeControl,
  TIME_CONTROL_PRESETS,
  validateTimeControl,
  timeControlToString,
  getTimeControlPreset,
} from "~/lib/game/time-control-types";

interface TimeControlSelectorProps {
  /** Current time control */
  timeControl: TimeControl | null;
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog opens/closes */
  onOpenChange: (open: boolean) => void;
  /** Callback when time control is selected */
  onTimeControlChange: (timeControl: TimeControl | null) => void;
  /** Whether game is active (disable changes) */
  gameActive?: boolean;
  /** Audio warnings enabled */
  audioEnabled?: boolean;
  /** Callback when audio setting changes */
  onAudioEnabledChange?: (enabled: boolean) => void;
}

export function TimeControlSelector({
  timeControl,
  open,
  onOpenChange,
  onTimeControlChange,
  gameActive = false,
  audioEnabled = true,
  onAudioEnabledChange,
}: TimeControlSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    timeControl?.preset && timeControl.preset !== "custom"
      ? timeControl.preset
      : null,
  );
  const [customMinutes, setCustomMinutes] = useState(
    timeControl?.preset === "custom" ? timeControl.initialMinutes : 10,
  );
  const [customIncrement, setCustomIncrement] = useState(
    timeControl?.preset === "custom" ? timeControl.incrementSeconds : 5,
  );
  const [customFormat, setCustomFormat] = useState<"X|Y" | "X+Y">(
    timeControl?.preset === "custom" ? timeControl.format : "X|Y",
  );
  const [customError, setCustomError] = useState<string | null>(null);

  // Preset configurations
  const presets = [
    {
      key: "bullet",
      name: "Bullet",
      description: "Fast-paced games",
      icon: Zap,
      color: "text-yellow-600 border-yellow-600",
    },
    {
      key: "blitz",
      name: "Blitz",
      description: "Quick tactical games",
      icon: Timer,
      color: "text-orange-600 border-orange-600",
    },
    {
      key: "rapid",
      name: "Rapid",
      description: "Balanced gameplay",
      icon: Clock,
      color: "text-blue-600 border-blue-600",
    },
    {
      key: "classical",
      name: "Classical",
      description: "Deep strategic games",
      icon: Trophy,
      color: "text-green-600 border-green-600",
    },
  ];

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    setCustomError(null);
  };

  const handleCustomChange = () => {
    setSelectedPreset(null);

    const customTimeControl: TimeControl = {
      format: customFormat,
      initialMinutes: customMinutes,
      incrementSeconds: customIncrement,
      preset: "custom",
    };

    const validation = validateTimeControl(customTimeControl);
    setCustomError(validation);
  };

  // Initial validation check
  useEffect(() => {
    if (!selectedPreset) {
      handleCustomChange();
    }
  }, []);

  const handleApply = () => {
    if (selectedPreset) {
      const preset = getTimeControlPreset(selectedPreset);
      if (preset) {
        onTimeControlChange(preset);
        onOpenChange(false);
      }
    } else if (customMinutes > 0) {
      const customTimeControl: TimeControl = {
        format: customFormat,
        initialMinutes: customMinutes,
        incrementSeconds: customIncrement,
        preset: "custom",
      };

      if (!validateTimeControl(customTimeControl)) {
        onTimeControlChange(customTimeControl);
        onOpenChange(false);
      }
    } else {
      // No time control
      onTimeControlChange(null);
      onOpenChange(false);
    }
  };

  const handleRemove = () => {
    onTimeControlChange(null);
    onOpenChange(false);
  };

  const canApply = selectedPreset ?? (customMinutes > 0 && !customError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Time Control Settings
          </DialogTitle>
          <DialogDescription>
            Choose a time control preset or create a custom configuration. Time
            controls add strategic depth to your games.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current selection display */}
          {timeControl && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="text-sm">
                  <span className="font-medium">Current: </span>
                  <Badge variant="outline" className="font-mono">
                    {timeControlToString(timeControl)}
                  </Badge>
                  <span className="text-muted-foreground ml-2">
                    (
                    {timeControl.preset === "custom"
                      ? "Custom"
                      : timeControl.preset}
                    )
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preset buttons */}
          <div>
            <Label className="text-sm font-medium">Presets</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {presets.map((preset) => {
                const config = TIME_CONTROL_PRESETS[preset.key]!;
                const isSelected = selectedPreset === preset.key;
                const Icon = preset.icon;

                return (
                  <Button
                    key={preset.key}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "flex h-auto flex-col items-center gap-1 p-3",
                      !isSelected && preset.color,
                    )}
                    onClick={() => handlePresetSelect(preset.key)}
                    disabled={gameActive}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{preset.name}</span>
                    <span className="font-mono text-xs">
                      {timeControlToString(config)}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Custom time control */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Custom Time Control</Label>

            {/* Format selector */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={customFormat === "X|Y" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCustomFormat("X|Y");
                  handleCustomChange();
                }}
                disabled={gameActive}
                className="flex-1"
              >
                Minutes | Increment
              </Button>
              <Button
                type="button"
                variant={customFormat === "X+Y" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCustomFormat("X+Y");
                  handleCustomChange();
                }}
                disabled={gameActive}
                className="flex-1"
              >
                Minutes + Increment
              </Button>
            </div>

            {/* Number inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="custom-minutes"
                  className="text-muted-foreground text-xs font-medium"
                >
                  Minutes
                </Label>
                <NumberInput
                  id="custom-minutes"
                  value={customMinutes}
                  onChange={(value) => {
                    setCustomMinutes(value);
                    handleCustomChange();
                  }}
                  min={0.5}
                  max={180}
                  step={0.5}
                  decimals={1}
                  disabled={gameActive}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="custom-increment"
                  className="text-muted-foreground text-xs font-medium"
                >
                  Increment (seconds)
                </Label>
                <NumberInput
                  id="custom-increment"
                  value={customIncrement}
                  onChange={(value) => {
                    setCustomIncrement(value);
                    handleCustomChange();
                  }}
                  min={0}
                  max={60}
                  step={1}
                  disabled={gameActive}
                  className="w-full"
                />
              </div>
            </div>

            {customError && (
              <p className="text-xs text-red-600">{customError}</p>
            )}

            <div className="text-muted-foreground text-xs">
              Preview:{" "}
              <code className="bg-muted rounded px-1 py-0.5 font-mono">
                {customMinutes}
                {customFormat === "X|Y" ? "|" : "+"}
                {customIncrement}
              </code>
            </div>
          </div>

          <Separator />

          {/* Audio settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Audio Settings</Label>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {audioEnabled ? (
                  <Volume2 className="h-4 w-4 text-blue-600" />
                ) : (
                  <VolumeX className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm">Warning sounds</span>
              </div>
              <Switch
                checked={audioEnabled}
                onCheckedChange={onAudioEnabledChange}
                disabled={gameActive}
              />
            </div>
            <div className="text-muted-foreground text-xs">
              Play audio alerts when time is running low (10s, 5s, 3s, 2s, 1s)
            </div>
          </div>

          {/* No time control option */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPreset(null);
                setCustomMinutes(10);
                setCustomIncrement(5);
                setCustomFormat("X|Y");
                setCustomError(null);
              }}
              disabled={gameActive}
              className="text-muted-foreground"
            >
              Play without time control
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {timeControl && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={gameActive}
              className="mr-auto"
            >
              Remove
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!canApply || gameActive}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
