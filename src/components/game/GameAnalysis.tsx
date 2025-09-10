"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { Activity, Award, AlertTriangle, Brain } from "lucide-react";
import type { GameAnalysis } from "~/lib/types/move-analysis";
import {
  MOVE_INDICATORS,
  formatEvaluation,
  getEvaluationBarWidth,
  getPlayerAdvantage,
} from "~/lib/types/move-analysis";
import { cn } from "~/lib/utils";

interface GameAnalysisProps {
  analysis: GameAnalysis | null;
  currentMoveIndex: number;
  isAnalyzing?: boolean;
  onMoveClick?: (moveIndex: number) => void;
}

export function GameAnalysis({
  analysis,
  currentMoveIndex,
  isAnalyzing = false,
  onMoveClick,
}: GameAnalysisProps) {
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "moves" | "graph"
  >("overview");

  if (!analysis && !isAnalyzing) {
    return (
      <Card className="h-full border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-blue-900">
            <Brain className="h-4 w-4" />
            Game Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-32 items-center justify-center">
          <p className="text-sm text-gray-500">No analysis available</p>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card className="h-full border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-blue-900">
            <Brain className="h-4 w-4 animate-pulse" />
            Analyzing Game...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-32 flex-col items-center justify-center gap-2">
          <div className="w-full max-w-xs">
            <Progress value={33} className="w-full" />
          </div>
          <p className="text-xs text-gray-600">Computing best moves...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const currentMove = analysis.moves[currentMoveIndex];
  const currentEval = currentMove?.positionEvalAfter ?? 0;
  const { player: advantagePlayer, advantage } =
    getPlayerAdvantage(currentEval);

  // Calculate stats
  const redBrilliant = Object.entries(analysis.moveQualityCount.red)
    .filter(([cat]) => cat === "brilliant" || cat === "excellent")
    .reduce((sum, [_, count]) => sum + count, 0);

  const blackBrilliant = Object.entries(analysis.moveQualityCount.black)
    .filter(([cat]) => cat === "brilliant" || cat === "excellent")
    .reduce((sum, [_, count]) => sum + count, 0);

  return (
    <Card className="flex h-full flex-col border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm text-blue-900">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Game Analysis
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={selectedTab === "overview" ? "default" : "ghost"}
              className="h-6 px-2 text-xs"
              onClick={() => setSelectedTab("overview")}
            >
              Overview
            </Button>
            <Button
              size="sm"
              variant={selectedTab === "moves" ? "default" : "ghost"}
              className="h-6 px-2 text-xs"
              onClick={() => setSelectedTab("moves")}
            >
              Moves
            </Button>
            <Button
              size="sm"
              variant={selectedTab === "graph" ? "default" : "ghost"}
              className="h-6 px-2 text-xs"
              onClick={() => setSelectedTab("graph")}
            >
              Graph
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        {/* Current Position Evaluation Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Position Evaluation</span>
            <span
              className={cn(
                "font-bold",
                advantagePlayer === "red" ? "text-red-600" : "text-gray-800",
              )}
            >
              {formatEvaluation(currentEval)}
            </span>
          </div>
          <div className="relative h-6 overflow-hidden rounded-full bg-gray-800">
            <div
              className="absolute top-0 left-0 h-full bg-white transition-all duration-300"
              style={{ width: `${getEvaluationBarWidth(currentEval)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-400">
                {advantage > 10
                  ? `${advantagePlayer === "red" ? "Red" : "Black"} advantage`
                  : "Equal"}
              </span>
            </div>
          </div>
        </div>

        {selectedTab === "overview" && (
          <div className="flex-1 space-y-3 overflow-y-auto">
            {/* Accuracy Scores */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-red-700">Red</span>
                  <span className="text-sm font-bold">
                    {analysis.averageAccuracy.red}%
                  </span>
                </div>
                <Progress
                  value={analysis.averageAccuracy.red}
                  className="h-1"
                />
              </div>
              <div className="rounded-lg bg-white/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">
                    Black
                  </span>
                  <span className="text-sm font-bold">
                    {analysis.averageAccuracy.black}%
                  </span>
                </div>
                <Progress
                  value={analysis.averageAccuracy.black}
                  className="h-1"
                />
              </div>
            </div>

            {/* Special Moves */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/50 p-2">
                <Award className="h-4 w-4 text-cyan-600" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Brilliant/Excellent</p>
                  <p className="text-sm font-bold">
                    {redBrilliant} / {blackBrilliant}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/50 p-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Blunders</p>
                  <p className="text-sm font-bold">
                    {analysis.blunders.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Game Sharpness */}
            <div className="rounded-lg bg-white/50 p-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-orange-600" />
                  <span className="text-xs font-medium">Game Sharpness</span>
                </div>
                <span className="text-sm font-bold">
                  {analysis.gameSharpness}%
                </span>
              </div>
              <Progress value={analysis.gameSharpness} className="h-1" />
              <p className="mt-1 text-xs text-gray-600">
                {analysis.gameSharpness > 60
                  ? "Highly tactical"
                  : analysis.gameSharpness > 30
                    ? "Balanced"
                    : "Positional"}
              </p>
            </div>

            {/* Critical Moments */}
            {analysis.criticalMoments.length > 0 && (
              <div className="rounded-lg bg-white/50 p-2">
                <p className="mb-1 text-xs font-medium">Critical Moments</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.criticalMoments.slice(0, 5).map((moveIdx) => (
                    <Badge
                      key={moveIdx}
                      variant="outline"
                      className="cursor-pointer text-xs hover:bg-blue-100"
                      onClick={() => onMoveClick?.(moveIdx)}
                    >
                      Move {moveIdx + 1}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === "moves" && (
          <div className="flex-1 space-y-1 overflow-y-auto">
            {currentMove && (
              <div className="mb-2 rounded-lg border-2 border-blue-400 bg-white/70 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium">Current Move</span>
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: `${MOVE_INDICATORS[currentMove.category].color}20`,
                      borderColor: MOVE_INDICATORS[currentMove.category].color,
                    }}
                  >
                    {MOVE_INDICATORS[currentMove.category].icon}{" "}
                    {currentMove.category}
                  </Badge>
                </div>
                {currentMove.explanation && (
                  <p className="text-xs text-gray-600">
                    {currentMove.explanation}
                  </p>
                )}
              </div>
            )}

            {/* Recent moves with quality */}
            <div className="space-y-1">
              {analysis.moves
                .slice(Math.max(0, currentMoveIndex - 2), currentMoveIndex + 3)
                .map((move, idx) => {
                  const actualIdx = Math.max(0, currentMoveIndex - 2) + idx;
                  const isCurrentMove = actualIdx === currentMoveIndex;
                  const indicator = MOVE_INDICATORS[move.category];

                  return (
                    <div
                      key={actualIdx}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded p-1 transition-colors",
                        isCurrentMove
                          ? "bg-blue-200"
                          : "bg-white/50 hover:bg-white/70",
                      )}
                      onClick={() => onMoveClick?.(actualIdx)}
                    >
                      <span className="w-8 font-mono text-xs">
                        {actualIdx + 1}.
                      </span>
                      <span
                        className="w-6 text-center text-lg"
                        title={indicator.description}
                      >
                        {indicator.icon || "•"}
                      </span>
                      <div className="flex-1">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            move.category === "blunder" && "text-red-600",
                            move.category === "mistake" && "text-orange-600",
                            move.category === "brilliant" && "text-cyan-600",
                            move.category === "excellent" && "text-yellow-600",
                          )}
                        >
                          {indicator.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatEvaluation(move.positionEvalAfter)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {selectedTab === "graph" && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-32 w-full rounded-lg bg-white/50 p-2">
              <svg viewBox="0 0 400 100" className="h-full w-full">
                {/* Evaluation graph line */}
                <polyline
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="2"
                  points={analysis.evaluationGraph
                    .map((point, idx) => {
                      const x =
                        (idx /
                          Math.max(1, analysis.evaluationGraph.length - 1)) *
                          380 +
                        10;
                      const y = 50 - point.evaluation / 2; // Convert -100 to +100 to 0-100 for Y
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />

                {/* Zero line */}
                <line
                  x1="10"
                  y1="50"
                  x2="390"
                  y2="50"
                  stroke="gray"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />

                {/* Current position indicator */}
                {currentMoveIndex >= 0 &&
                  currentMoveIndex < analysis.evaluationGraph.length && (
                    <circle
                      cx={
                        (currentMoveIndex /
                          Math.max(1, analysis.evaluationGraph.length - 1)) *
                          380 +
                        10
                      }
                      cy={
                        50 -
                        analysis.evaluationGraph[currentMoveIndex]!.evaluation /
                          2
                      }
                      r="4"
                      fill="rgb(239, 68, 68)"
                    />
                  )}
              </svg>
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Start</span>
                <span>Move {currentMoveIndex + 1}</span>
                <span>End</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
