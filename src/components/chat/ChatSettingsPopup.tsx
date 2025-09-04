"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Slider } from "~/components/ui/slider";
import { 
  Settings, 
  Monitor,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Type,
  Eye,
  Palette
} from "lucide-react";
import type { ThemeSettings } from "./types";

interface ChatSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ThemeSettings;
  onSettingsChange: (settings: ThemeSettings) => void;
}

export function ChatSettingsPopup({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange 
}: ChatSettingsPopupProps) {
  
  const updateSetting = <K extends keyof ThemeSettings>(
    key: K, 
    value: ThemeSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const themeClasses = settings.theme === 'dark' 
    ? 'bg-gray-900 text-white border-gray-700' 
    : 'bg-white text-black border-gray-200';

  const cardClasses = settings.theme === 'dark'
    ? 'bg-gray-800 border-gray-700'
    : 'bg-gray-50 border-gray-200';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg ${themeClasses}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Chat Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Theme
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={settings.theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('theme', 'light')}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={settings.theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('theme', 'dark')}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={settings.theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('theme', 'system')}
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
          </div>

          {/* Chat Opacity */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Chat Opacity
            </Label>
            <div className={`p-4 rounded-lg border ${cardClasses}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Transparency</span>
                <span className="text-sm font-mono">
                  {Math.round(settings.chatOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.chatOpacity]}
                onValueChange={([value]) => value !== undefined && updateSetting('chatOpacity', value)}
                max={1}
                min={0.5}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Font Size
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={settings.fontSize === 'small' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('fontSize', 'small')}
                className="text-xs"
              >
                Small
              </Button>
              <Button
                variant={settings.fontSize === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('fontSize', 'medium')}
                className="text-sm"
              >
                Medium
              </Button>
              <Button
                variant={settings.fontSize === 'large' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('fontSize', 'large')}
                className="text-base"
              >
                Large
              </Button>
            </div>
            
            {/* Preview */}
            <div className={`p-3 rounded-lg border ${cardClasses}`}>
              <p className="text-xs text-gray-500 mb-2">Preview:</p>
              <div className={`
                ${settings.fontSize === 'small' ? 'text-xs' : 
                  settings.fontSize === 'large' ? 'text-sm' : 'text-xs'}
                ${settings.theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}
              `}>
                This is how your messages will look in the chat.
              </div>
            </div>
          </div>

          {/* Sound Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Sound
            </Label>
            <div className={`p-4 rounded-lg border ${cardClasses}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Message Sounds</p>
                  <p className="text-sm text-gray-500">
                    Play sound when receiving messages
                  </p>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Advanced</Label>
            <div className={`p-4 rounded-lg border ${cardClasses} space-y-3`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Auto-scroll</p>
                  <p className="text-xs text-gray-500">
                    Automatically scroll to new messages
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Compact Mode</p>
                  <p className="text-xs text-gray-500">
                    Show more messages in less space
                  </p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Show Timestamps</p>
                  <p className="text-xs text-gray-500">
                    Display message timestamps
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              // Reset to defaults
              onSettingsChange({
                theme: 'dark',
                chatOpacity: 0.95,
                fontSize: 'medium',
                soundEnabled: true
              });
            }}
          >
            Reset to Default
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}