"use client";

import { Award, Crown, Medal, TrendingUp, Trophy, User } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface LeaderboardProps {
  limit?: number;
  className?: string;
}

export function Leaderboard({ limit = 10, className }: LeaderboardProps) {
  const { data: players, isLoading } = api.user.getLeaderboard.useQuery({
    limit,
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-primary-600" />;
      default:
        return (
          <span className="flex h-5 w-5 items-center justify-center text-sm font-bold text-gray-600">
            {rank}
          </span>
        );
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300";
      case 2:
        return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300";
      case 3:
        return "bg-gradient-to-r from-primary/10 to-primary/10 border-primary/30";
      default:
        return "bg-white hover:bg-gray-50";
    }
  };

  return (
    <Card className={cn("border-primary/20 shadow-lg", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-primary-900">
          <Trophy className="h-5 w-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-[69px] w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {players?.map((player) => {
              return (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    getRankColor(player.rank),
                  )}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0">
                    {getRankIcon(player.rank)}
                  </div>

                  {/* Player Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <Link
                        href={`/users/${player.username}`}
                        className="truncate font-medium text-gray-900 hover:text-primary-600 hover:underline transition-colors"
                      >
                        {player.username}
                      </Link>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-600">
                      <span>{player.totalGames} games</span>
                      <span>{player.winRate.toFixed(1)}% win rate</span>
                      {player.streak > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          {player.streak} streak
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">TBD</div>
                    <div className="text-xs text-gray-500">Rating</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && (!players || players.length === 0) && (
          <div className="py-8 text-center text-gray-500">
            No players yet. Be the first to join!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
