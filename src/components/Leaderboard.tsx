'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Trophy, TrendingUp, User, Crown, Medal, Award } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Skeleton } from '~/components/ui/skeleton';

interface PlayerStats {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  streak: number;
}

interface LeaderboardProps {
  limit?: number;
  className?: string;
}

export function Leaderboard({ limit = 10, className }: LeaderboardProps) {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading leaderboard data
    // In production, this would fetch from your API
    const mockPlayers: PlayerStats[] = [
      { id: '1', username: 'GrandMaster', rating: 2450, wins: 342, losses: 45, draws: 23, totalGames: 410, winRate: 83.4, streak: 12 },
      { id: '2', username: 'CheckersKing', rating: 2380, wins: 289, losses: 67, draws: 34, totalGames: 390, winRate: 74.1, streak: 5 },
      { id: '3', username: 'StrategicMind', rating: 2290, wins: 256, losses: 89, draws: 45, totalGames: 390, winRate: 65.6, streak: 3 },
      { id: '4', username: 'BoardMaster', rating: 2210, wins: 234, losses: 98, draws: 38, totalGames: 370, winRate: 63.2, streak: -2 },
      { id: '5', username: 'TacticalGenius', rating: 2150, wins: 198, losses: 112, draws: 40, totalGames: 350, winRate: 56.6, streak: 7 },
      { id: '6', username: 'RedKnight', rating: 2080, wins: 176, losses: 134, draws: 30, totalGames: 340, winRate: 51.8, streak: 1 },
      { id: '7', username: 'BlackBishop', rating: 2020, wins: 165, losses: 145, draws: 40, totalGames: 350, winRate: 47.1, streak: -1 },
      { id: '8', username: 'JumpMaster', rating: 1980, wins: 154, losses: 156, draws: 30, totalGames: 340, winRate: 45.3, streak: 2 },
      { id: '9', username: 'CrownSeeker', rating: 1920, wins: 143, losses: 167, draws: 40, totalGames: 350, winRate: 40.9, streak: 0 },
      { id: '10', username: 'RookieRising', rating: 1850, wins: 132, losses: 178, draws: 30, totalGames: 340, winRate: 38.8, streak: 4 },
    ];

    setTimeout(() => {
      setPlayers(mockPlayers.slice(0, limit));
      setLoading(false);
    }, 1000);
  }, [limit]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300';
      default:
        return 'bg-white hover:bg-gray-50';
    }
  };

  return (
    <Card className={cn("border-amber-200 shadow-lg", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <Trophy className="w-5 h-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: Math.min(5, limit) }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {players.map((player, index) => {
              const rank = index + 1;
              return (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    getRankColor(rank)
                  )}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0">
                    {getRankIcon(rank)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 truncate">
                        {player.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                      <span>{player.totalGames} games</span>
                      <span>{player.winRate.toFixed(1)}% win rate</span>
                      {player.streak > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="w-3 h-3" />
                          {player.streak} streak
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {player.rating}
                    </div>
                    <div className="text-xs text-gray-500">Rating</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && players.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No players yet. Be the first to join!
          </div>
        )}
      </CardContent>
    </Card>
  );
}