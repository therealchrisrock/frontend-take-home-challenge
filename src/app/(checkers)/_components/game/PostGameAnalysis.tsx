"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { Brain, Play } from "lucide-react";
import type { GameAnalysis } from "~/lib/types/move-analysis";
import { cn } from "~/lib/utils";
import type { PieceColor } from "~/lib/game/logic";

interface PostGameAnalysisProps {
  analysis: GameAnalysis | null;
  winner: PieceColor | "draw" | null;
  isAnalyzing?: boolean;
  analyzeProgress?: number;
  onStartReview?: () => void;
  onPlayAgain?: () => void;
  playerNames?: {
    red: string;
    black: string;
  };
}

interface PlayerStats {
  accuracy: number;
  brilliant: number;
  excellent: number;
  best: number;
  good: number;
  book: number;
  inaccuracy: number;
  mistake: number;
  miss: number;
  blunder: number;
}

export function PostGameAnalysis({
  analysis,
  isAnalyzing = false,
  analyzeProgress = 0,
  onStartReview,
  onPlayAgain,
  playerNames = { red: "Player 1", black: "Player 2" },
}: PostGameAnalysisProps) {
  const [showGraph] = useState(true);

  // Calculate player statistics
  const getPlayerStats = (player: "red" | "black"): PlayerStats => {
    if (!analysis) {
      return {
        accuracy: 0,
        brilliant: 0,
        excellent: 0,
        best: 0,
        good: 0,
        book: 0,
        inaccuracy: 0,
        mistake: 0,
        miss: 0,
        blunder: 0,
      };
    }

    const moveQuality = analysis.moveQualityCount[player];

    return {
      accuracy: analysis.averageAccuracy[player],
      brilliant: moveQuality.brilliant ?? 0,
      excellent: moveQuality.excellent ?? 0,
      best: moveQuality.best ?? 0,
      good: moveQuality.good ?? 0,
      book: 0, // Would need to track opening book moves
      inaccuracy: moveQuality.inaccuracy ?? 0,
      mistake: moveQuality.mistake ?? 0,
      miss: 0, // Could track missed wins
      blunder: moveQuality.blunder ?? 0,
    };
  };

  const redStats = getPlayerStats("red");
  const blackStats = getPlayerStats("black");

  // Move category display configuration
  const categoryConfig: Array<{
    key: keyof PlayerStats;
    label: string;
    icon: string;
    color: string;
  }> = [
    {
      key: "brilliant",
      label: "Brilliant",
      icon: "!!",
      color: "text-cyan-500",
    },
    { key: "excellent", label: "Excellent", icon: "!", color: "text-blue-500" },
    { key: "best", label: "Best", icon: "⭐", color: "text-green-500" },
    { key: "good", label: "Good", icon: "✓", color: "text-green-400" },
    { key: "book", label: "Book", icon: "📖", color: "text-gray-500" },
    {
      key: "inaccuracy",
      label: "Inaccuracy",
      icon: "?!",
      color: "text-yellow-500",
    },
    { key: "mistake", label: "Mistake", icon: "?", color: "text-orange-500" },
    { key: "miss", label: "Miss", icon: "✗", color: "text-red-400" },
    { key: "blunder", label: "Blunder", icon: "??", color: "text-red-600" },
  ];

  if (isAnalyzing) {
    return (
      <Card className="w-full max-w-md bg-gray-900 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-5 w-5 animate-pulse" />
            Analyzing Game...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Analysis Progress</span>
              <span>{Math.round(analyzeProgress)}%</span>
            </div>
            <Progress value={analyzeProgress} className="h-2" />
          </div>
          <p className="text-sm text-gray-400">
            Evaluating moves and identifying critical moments...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <Card className="w-full max-w-md bg-gray-900 text-white">
      <CardHeader className="pb-4">
        <div className="space-y-4">
          {/* Evaluation Graph */}
          {showGraph && (
            <div className="rounded-lg bg-gray-800 p-3">
              <svg viewBox="0 0 400 120" className="h-24 w-full">
                {/* Background gradient */}
                <defs>
                  <linearGradient
                    id="evalGradient"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="white" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="gray" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="black" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="400"
                  height="120"
                  fill="url(#evalGradient)"
                />

                {/* Zero line */}
                <line
                  x1="0"
                  y1="60"
                  x2="400"
                  y2="60"
                  stroke="gray"
                  strokeWidth="1"
                  opacity="0.3"
                />

                {/* Evaluation line */}
                <polyline
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  points={analysis.evaluationGraph
                    .map((point, idx) => {
                      const x =
                        (idx /
                          Math.max(1, analysis.evaluationGraph.length - 1)) *
                        400;
                      const y = 60 - point.evaluation * 0.5; // Scale to fit
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />

                {/* Critical moments markers */}
                {analysis.criticalMoments.map((idx) => {
                  const x =
                    (idx / Math.max(1, analysis.evaluationGraph.length - 1)) *
                    400;
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={
                        60 -
                        (analysis.evaluationGraph[idx]?.evaluation ?? 0) * 0.5
                      }
                      r="3"
                      fill="orange"
                    />
                  );
                })}

                {/* Blunder markers */}
                {analysis.blunders.map((idx) => {
                  const x =
                    (idx / Math.max(1, analysis.evaluationGraph.length - 1)) *
                    400;
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={
                        60 -
                        (analysis.evaluationGraph[idx]?.evaluation ?? 0) * 0.5
                      }
                      r="3"
                      fill="red"
                    />
                  );
                })}
              </svg>
            </div>
          )}

          {/* Players Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Players</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500 font-bold text-white">
                  {playerNames.red[0]}
                </div>
                <span className="font-medium">{playerNames.red}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{playerNames.black}</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-700 font-bold text-white">
                  {playerNames.black[0]}
                </div>
              </div>
            </div>
          </div>

          {/* Accuracy Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Accuracy</h3>
            <div className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
              <div className="text-2xl font-bold">
                {redStats.accuracy.toFixed(1)}
              </div>
              <div className="text-2xl font-bold">
                {blackStats.accuracy.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Move Categories */}
        <div className="space-y-2">
          {categoryConfig.map(({ key, label, icon, color }) => {
            const redCount = redStats[key];
            const blackCount = blackStats[key];

            // Skip categories with no moves
            if (redCount === 0 && blackCount === 0) return null;

            return (
              <div key={key} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <span className="w-8 font-mono text-lg text-orange-400">
                    {redCount ?? 0}
                  </span>
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-lg font-bold",
                      color,
                    )}
                  >
                    {icon}
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <span className="font-mono text-lg text-green-400">
                  {blackCount ?? 0}
                </span>
              </div>
            );
          })}
        </div>

        <Separator className="bg-gray-700" />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onStartReview}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Review
          </Button>
          <Button
            onClick={onPlayAgain}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Play Again
          </Button>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">Critical Moments</p>
            <p className="text-lg font-bold">
              {analysis.criticalMoments.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Game Sharpness</p>
            <p className="text-lg font-bold">{analysis.gameSharpness}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
