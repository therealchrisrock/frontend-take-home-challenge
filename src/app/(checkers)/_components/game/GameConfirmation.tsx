"use client";

import { m } from "framer-motion";
import {
  ChevronLeft,
  Clock,
  Info,
  Link2,
  Loader2,
  Send
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ComingSoon } from "~/components/ui/coming-soon";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { type TimeControl } from "~/lib/game/time-control-types";
import { MotionColorSelector } from "./MotionColorSelector";
// Board preview and layout are managed by OnlineGameWizard

type GameVariant = "american" | "brazilian" | "international" | "canadian";

interface Friend {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
}

interface GameConfirmationProps {
  selectedFriend: Friend | null;
  generateLink: boolean;
  variant: GameVariant;
  onVariantChange: (variant: GameVariant) => void;
  timeControl: TimeControl | null;
  onTimeControlChange: (timeControl: TimeControl | null) => void;
  hostColor: "red" | "black" | "random";
  onHostColorChange: (c: "red" | "black" | "random") => void;
  onBack: () => void;
  onSendChallenge: () => void;
  isLoading: boolean;
}

export function GameConfirmation({
  selectedFriend,
  generateLink,
  variant,
  onVariantChange,
  timeControl,
  onTimeControlChange,
  hostColor,
  onHostColorChange,
  onBack,
  onSendChallenge,
  isLoading
}: GameConfirmationProps) {
  const { data: session } = useSession();
  const [timeControlType, setTimeControlType] = useState<
    "none" | "blitz" | "rapid" | "classical" | "custom"
  >("none");

  const getBoardSize = (gameVariant: GameVariant) => {
    switch (gameVariant) {
      case "international": return 10;
      case "canadian": return 12;
      default: return 8;
    }
  };

  const getTimeControlPreset = (type: string): TimeControl | null => {
    switch (type) {
      case "blitz":
        return {
          format: "X+Y",
          initialMinutes: 5,
          incrementSeconds: 3,
          preset: "blitz",
        };
      case "rapid":
        return {
          format: "X+Y",
          initialMinutes: 15,
          incrementSeconds: 10,
          preset: "rapid",
        };
      case "classical":
        return {
          format: "X+Y",
          initialMinutes: 30,
          incrementSeconds: 30,
          preset: "classical",
        };
      default:
        return null;
    }
  };

  const handleTimeControlTypeChange = (type: string) => {
    setTimeControlType(type as typeof timeControlType);
    if (type === "none") {
      onTimeControlChange(null);
    } else if (type !== "custom") {
      onTimeControlChange(getTimeControlPreset(type));
    } else {
      onTimeControlChange({
        format: "X+Y",
        initialMinutes: 10,
        incrementSeconds: 5,
        preset: "custom",
      });
    }
  };

  const getDisplayName = (friend: Friend) => {
    return friend.name || friend.username || "Anonymous";
  };

  const getInitials = (friend: Friend | null) => {
    if (!friend) return "G";
    const name = getDisplayName(friend);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="border-gray-200 bg-white p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Confirm Game Settings
          </h2>
          <p className="text-gray-600">
            Review your opponent and game configuration
          </p>
        </div>

        {/* Opponent Display */}
        <div>
          <Label className="text-base font-medium text-gray-900 mb-3 block">
            Your Opponent
          </Label>
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedFriend ? (
                  <>
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedFriend.image || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(selectedFriend)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">
                        {getDisplayName(selectedFriend)}
                      </p>
                      {selectedFriend.username && (
                        <p className="text-sm text-gray-500">
                          @{selectedFriend.username}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Link2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Anyone with the link
                      </p>
                      <p className="text-sm text-gray-500">
                        Guest player via invite link
                      </p>
                    </div>
                  </>
                )}
              </div>
              {selectedFriend ? (
                <Badge className="bg-primary/10 text-primary">
                  Friend
                </Badge>
              ) : (
                <Badge variant="outline" className="text-blue-600">
                  Open Invite
                </Badge>
              )}
            </div>
          </Card>
        </div>

        <Separator />

        {/* Game Rules */}
        <div>
          <Label className="mb-3 block text-base font-medium text-gray-900">
            Game Rules
          </Label>
          <TooltipProvider>
            <RadioGroup
              value={variant}
              onValueChange={(v) => onVariantChange(v as GameVariant)}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    value="american"
                    id="american"
                    className="sr-only"
                  />
                  <m.div
                    className="w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Label
                      htmlFor="american"
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${variant === "american"
                        ? "border-primary/50 bg-primary/10"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        American
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 flex-shrink-0 cursor-help text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">American Checkers</p>
                            <p className="text-sm">• 8×8 board (64 squares)</p>
                            <p className="text-sm">• 12 pieces per player</p>
                            <p className="text-sm">• Kings move one square diagonally</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                  </m.div>
                </div>

                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    value="international"
                    id="international"
                    className="sr-only"
                  />
                  <m.div
                    className="w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Label
                      htmlFor="international"
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${variant === "international"
                        ? "border-primary/50 bg-primary/10"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        International
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 flex-shrink-0 cursor-help text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">International Draughts</p>
                            <p className="text-sm">• 10×10 board (100 squares)</p>
                            <p className="text-sm">• 20 pieces per player</p>
                            <p className="text-sm">• Flying kings (move multiple squares)</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                  </m.div>
                </div>

                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    value="brazilian"
                    id="brazilian"
                    className="sr-only"
                  />
                  <m.div
                    className="w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Label
                      htmlFor="brazilian"
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${variant === "brazilian"
                        ? "border-primary/50 bg-primary/10"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        Brazilian
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 flex-shrink-0 cursor-help text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">Brazilian Draughts</p>
                            <p className="text-sm">• 8×8 board (64 squares)</p>
                            <p className="text-sm">• 12 pieces per player</p>
                            <p className="text-sm">• Flying kings (move multiple squares)</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                  </m.div>
                </div>

                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    value="canadian"
                    id="canadian"
                    className="sr-only"
                  />
                  <m.div
                    className="w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Label
                      htmlFor="canadian"
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${variant === "canadian"
                        ? "border-primary/50 bg-primary/10"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        Canadian
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 flex-shrink-0 cursor-help text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">Canadian Checkers</p>
                            <p className="text-sm">• 12×12 board (144 squares)</p>
                            <p className="text-sm">• 30 pieces per player</p>
                            <p className="text-sm">• Flying kings (move multiple squares)</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                  </m.div>
                </div>
              </div>
            </RadioGroup>
          </TooltipProvider>
        </div>

        {/* Host Color Selection */}
        <div>
          <Label className="mb-3 block text-base font-medium text-gray-900">
            Your Color
          </Label>
          <div className="bg-white rounded-md border p-3">
            <MotionColorSelector value={hostColor} onChange={onHostColorChange} />
          </div>
        </div>

        {/* Time Control */}
        <div>
          <Label className="mb-3 flex items-center gap-2 text-base font-medium text-gray-900">
            <Clock className="h-4 w-4" />
            Time Control
          </Label>
          <ComingSoon
            message="Coming Soon"
            variant="minimal"
            icon="clock"
            className="overflow-hidden rounded-md"
          >
            <div className="space-y-3 rounded-md bg-gray-50 p-4">
              <Select
                value={timeControlType}
                onValueChange={handleTimeControlTypeChange}
              >
                <SelectTrigger className="h-10 w-full border-gray-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Time Control</SelectItem>
                  <SelectItem value="blitz">⚡ Blitz (5|3)</SelectItem>
                  <SelectItem value="rapid">🚀 Rapid (15|10)</SelectItem>
                  <SelectItem value="classical">🏛️ Classical (30|30)</SelectItem>
                  <SelectItem value="custom">⚙️ Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ComingSoon>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            className="flex-1 bg-primary text-white hover:bg-primary"
            onClick={onSendChallenge}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Game...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Challenge
              </>
            )}
          </Button>
        </div>

        {/* Invite Link Note */}
        {!selectedFriend && (
          <p className="text-xs text-center text-gray-500">
            You'll receive a shareable link after sending the challenge
          </p>
        )}
      </div>
    </Card>
  );
}