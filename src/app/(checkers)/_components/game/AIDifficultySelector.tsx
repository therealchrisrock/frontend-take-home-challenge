"use client";

import { type AIDifficulty } from "~/lib/game/ai-engine";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Brain, Target, Trophy, Crown } from "lucide-react";

interface AIDifficultySelectorProps {
  difficulty: AIDifficulty;
  onDifficultyChange: (difficulty: AIDifficulty) => void;
  disabled?: boolean;
}

const difficultyConfig: Record<
  AIDifficulty,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badge?: string;
  }
> = {
  easy: {
    label: "Easy",
    description: "2-move lookahead",
    icon: Brain,
    color: "text-green-600",
    badge: "Casual",
  },
  medium: {
    label: "Medium",
    description: "4-move lookahead",
    icon: Target,
    color: "text-blue-600",
    badge: "Standard",
  },
  hard: {
    label: "Hard",
    description: "6-move lookahead",
    icon: Trophy,
    color: "text-orange-600",
    badge: "Advanced",
  },
  expert: {
    label: "Expert (Chinook)",
    description: "8+ move lookahead",
    icon: Crown,
    color: "text-purple-600",
    badge: "Master",
  },
};

export function AIDifficultySelector({
  difficulty,
  onDifficultyChange,
  disabled,
}: AIDifficultySelectorProps) {
  const config = difficultyConfig[difficulty];
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">AI Difficulty</label>
        {config.badge && (
          <Badge variant="outline" className="text-xs">
            {config.badge}
          </Badge>
        )}
      </div>
      <Select
        value={difficulty}
        onValueChange={(value) => onDifficultyChange(value as AIDifficulty)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span>{config.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(difficultyConfig).map(([key, conf]) => {
            const DiffIcon = conf.icon;
            return (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <DiffIcon className={`h-4 w-4 ${conf.color}`} />
                  <div className="flex flex-col">
                    <span className="font-medium">{conf.label}</span>
                    <span className="text-xs text-gray-500">
                      {conf.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-600">
        {difficulty === "expert"
          ? "Inspired by Chinook - the world champion checkers AI"
          : config.description}
      </p>
    </div>
  );
}
