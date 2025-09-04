'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '~/components/ui/dialog';
import { Clock, Zap, Timer, Trophy, Settings } from 'lucide-react';
import { cn } from '~/lib/utils';
import {
  type TimeControl,
  TIME_CONTROL_PRESETS,
  parseTimeControl,
  validateTimeControl,
  timeControlToString,
  getTimeControlPreset
} from '~/lib/time-control-types';

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
}

export function TimeControlSelector({
  timeControl,
  open,
  onOpenChange,
  onTimeControlChange,
  gameActive = false
}: TimeControlSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    timeControl?.preset && timeControl.preset !== 'custom' ? timeControl.preset : null
  );
  const [customInput, setCustomInput] = useState(
    timeControl?.preset === 'custom' ? timeControlToString(timeControl) : ''
  );
  const [customError, setCustomError] = useState<string | null>(null);

  // Preset configurations
  const presets = [
    {
      key: 'bullet',
      name: 'Bullet',
      description: 'Fast-paced games',
      icon: Zap,
      color: 'text-yellow-600 border-yellow-600'
    },
    {
      key: 'blitz',
      name: 'Blitz',
      description: 'Quick tactical games',
      icon: Timer,
      color: 'text-orange-600 border-orange-600'
    },
    {
      key: 'rapid',
      name: 'Rapid',
      description: 'Balanced gameplay',
      icon: Clock,
      color: 'text-blue-600 border-blue-600'
    },
    {
      key: 'classical',
      name: 'Classical',
      description: 'Deep strategic games',
      icon: Trophy,
      color: 'text-green-600 border-green-600'
    }
  ];

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    setCustomInput('');
    setCustomError(null);
  };

  const handleCustomInputChange = (value: string) => {
    setCustomInput(value);
    setSelectedPreset(null);
    
    if (value.trim()) {
      const parsed = parseTimeControl(value);
      if (parsed) {
        const validation = validateTimeControl(parsed);
        setCustomError(validation);
      } else {
        setCustomError('Invalid format. Use X|Y or X+Y (e.g., "5|3" or "10+5")');
      }
    } else {
      setCustomError(null);
    }
  };

  const handleApply = () => {
    if (selectedPreset) {
      const preset = getTimeControlPreset(selectedPreset);
      if (preset) {
        onTimeControlChange(preset);
        onOpenChange(false);
      }
    } else if (customInput.trim()) {
      const parsed = parseTimeControl(customInput);
      if (parsed && !validateTimeControl(parsed)) {
        onTimeControlChange(parsed);
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

  const canApply = selectedPreset || (customInput.trim() && !customError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Time Control Settings
          </DialogTitle>
          <DialogDescription>
            Choose a time control preset or create a custom configuration.
            Time controls add strategic depth to your games.
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
                    ({timeControl.preset === 'custom' ? 'Custom' : timeControl.preset})
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preset buttons */}
          <div>
            <Label className="text-sm font-medium">Presets</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {presets.map((preset) => {
                const config = TIME_CONTROL_PRESETS[preset.key]!;
                const isSelected = selectedPreset === preset.key;
                const Icon = preset.icon;
                
                return (
                  <Button
                    key={preset.key}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "h-auto p-3 flex flex-col items-center gap-1",
                      !isSelected && preset.color
                    )}
                    onClick={() => handlePresetSelect(preset.key)}
                    disabled={gameActive}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-xs">{preset.name}</span>
                    <span className="font-mono text-xs">
                      {timeControlToString(config)}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Custom input */}
          <div className="space-y-2">
            <Label htmlFor="custom-time" className="text-sm font-medium">
              Custom Time Control
            </Label>
            <Input
              id="custom-time"
              placeholder="e.g., 15|10 or 3+2"
              value={customInput}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              disabled={gameActive}
              className={customError ? 'border-red-500' : ''}
            />
            {customError && (
              <p className="text-xs text-red-600">{customError}</p>
            )}
            <div className="text-xs text-muted-foreground">
              Format: <code>Minutes|Increment</code> or <code>Minutes+Increment</code>
              <br />
              Examples: <code>5|0</code> (5 min, no increment), <code>10+5</code> (10 min + 5 sec)
            </div>
          </div>

          {/* No time control option */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPreset(null);
                setCustomInput('');
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
          <Button
            onClick={handleApply}
            disabled={!canApply || gameActive}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}