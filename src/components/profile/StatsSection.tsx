"use client";

import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";

interface StatsSectionProps {
  userId: string;
}

export default function StatsSection({ userId }: StatsSectionProps) {
  const { data: stats, isLoading } = api.user.getGameStats.useQuery({ userId });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No statistics available</p>
        </CardContent>
      </Card>
    );
  }

  const winRate = stats.totalGames > 0 
    ? Math.round((stats.wins / stats.totalGames) * 100) 
    : 0;

  const gamesByMode = [
    { mode: "vs AI", count: stats.aiGames },
    { mode: "Local", count: stats.localGames },
    { mode: "Online", count: stats.onlineGames },
  ];

  const recentPerformance = stats.recentGames?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Games</CardDescription>
            <CardTitle className="text-3xl">{stats.totalGames}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.recentGames?.length ?? 0} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Win Rate</CardDescription>
            <CardTitle className="text-3xl">{winRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={winRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Wins</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.wins}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.draws} draws
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Losses</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.losses}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Keep practicing!
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Games by Mode</CardTitle>
            <CardDescription>Distribution of your games</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gamesByMode.map((mode) => (
              <div key={mode.mode} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{mode.mode}</span>
                  <span className="font-medium">{mode.count}</span>
                </div>
                <Progress 
                  value={stats.totalGames > 0 ? (mode.count / stats.totalGames) * 100 : 0} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Performance</CardTitle>
            <CardDescription>Your last 5 games</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPerformance.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {recentPerformance.map((game, index) => (
                  <Badge
                    key={index}
                    variant={
                      game.result === "win" 
                        ? "default" 
                        : game.result === "loss" 
                        ? "destructive" 
                        : "secondary"
                    }
                  >
                    {game.result === "win" ? "W" : game.result === "loss" ? "L" : "D"}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent games</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
          <CardDescription>Your gaming milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.totalGames >= 1 && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline">First Game</Badge>
                <span className="text-xs text-muted-foreground">Completed</span>
              </div>
            )}
            {stats.wins >= 1 && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline">First Victory</Badge>
                <span className="text-xs text-muted-foreground">Achieved</span>
              </div>
            )}
            {stats.totalGames >= 10 && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline">10 Games Played</Badge>
                <span className="text-xs text-muted-foreground">Milestone</span>
              </div>
            )}
            {stats.wins >= 10 && (
              <div className="flex items-center space-x-2">
                <Badge>10 Wins</Badge>
                <span className="text-xs text-muted-foreground">Champion</span>
              </div>
            )}
            {winRate >= 50 && stats.totalGames >= 10 && (
              <div className="flex items-center space-x-2">
                <Badge>50%+ Win Rate</Badge>
                <span className="text-xs text-muted-foreground">Skilled</span>
              </div>
            )}
            {stats.totalGames >= 50 && (
              <div className="flex items-center space-x-2">
                <Badge variant="default">Veteran</Badge>
                <span className="text-xs text-muted-foreground">50+ Games</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}