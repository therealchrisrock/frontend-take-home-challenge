"use client";

import {
  animate,
  m,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import { Palette, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SkinSelector } from "~/components/SkinSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { useSettings } from "~/contexts/settings-context";

interface GameSettingsProps {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GameSettings({
  children,
  open: controlledOpen,
  onOpenChange,
}: GameSettingsProps) {
  const { settings, updateSettings } = useSettings();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Animated number for SFX volume display
  const volumeMotion = useMotionValue(settings.sfxVolume);
  const roundedVolume = useTransform(volumeMotion, (v) => Math.round(v));
  const [displayedVolume, setDisplayedVolume] = useState(settings.sfxVolume);

  useMotionValueEvent(roundedVolume, "change", (v) => {
    // v can be number or string; ensure number
    const next = typeof v === "number" ? v : Number(v);
    if (!Number.isNaN(next)) setDisplayedVolume(next);
  });

  useEffect(() => {
    const controls = animate(volumeMotion, settings.sfxVolume, {
      duration: 0.1,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [settings.sfxVolume, volumeMotion]);

  const handleSoundToggle = (enabled: boolean) => {
    updateSettings({ soundEffectsEnabled: enabled });
  };

  const handleVolumeChange = (value: number[]) => {
    updateSettings({ sfxVolume: value[0] ?? 50 });
  };

  const handleReducedMotionToggle = (enabled: boolean) => {
    updateSettings({ reducedMotion: enabled });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="max-w-sm p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Game Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Sound Effects Section (dense) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-toggle" className="text-sm">
                Sound Effects
              </Label>
              <Switch
                id="sound-toggle"
                checked={settings.soundEffectsEnabled}
                onCheckedChange={handleSoundToggle}
              />
            </div>
            <div
              className={`flex items-center gap-3 ${!settings.soundEffectsEnabled ? "pointer-events-none opacity-50" : ""}`}
              aria-disabled={!settings.soundEffectsEnabled}
            >
              <Label
                htmlFor="volume-slider"
                className="text-muted-foreground text-xs"
              >
                Volume
              </Label>
              <Slider
                id="volume-slider"
                value={[settings.sfxVolume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="flex-1"
                disabled={!settings.soundEffectsEnabled}
              />
              <m.span className="text-xs tabular-nums" aria-live="polite">
                {displayedVolume}%
              </m.span>
            </div>
          </div>

          {/* Visual Effects Section (single row) */}
          <div className="flex items-center justify-between">
            <Label htmlFor="reduced-motion" className="text-sm">
              Reduced Motion
            </Label>
            <Switch
              id="reduced-motion"
              checked={settings.reducedMotion}
              onCheckedChange={handleReducedMotionToggle}
            />
          </div>

          {/* Board Themes Section (compact) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4" />
              <span>Board Theme</span>
            </div>
            <div className="">
              <SkinSelector size="sm" />
            </div>
          </div>
        </div>

        {/* Footer removed to save space; dialog can be closed via ESC/backdrop */}
      </DialogContent>
    </Dialog>
  );
}
