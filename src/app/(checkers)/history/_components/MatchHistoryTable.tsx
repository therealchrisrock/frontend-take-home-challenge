"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Target,
  Handshake,
  Clock,
  TrendingUp,
  Eye,
  RotateCcw,
} from "lucide-react";

interface MatchHistoryTableProps {
  userId: string;
}

type GameMode = "all" | "ai" | "local" | "online";

export default function MatchHistoryTable({ userId }: MatchHistoryTableProps) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>("all");
  const [searchOpponent, setSearchOpponent] = useState("");
  const pageSize = 15;

  const { data, isLoading } =
    api.user.getEnhancedMatchHistory.useQuery({
      userId,
      skip: page * pageSize,
      take: pageSize,
      gameMode: gameMode === "all" ? undefined : gameMode,
      searchOpponent: searchOpponent || undefined,
    });

  const matches = data?.matches ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const stats = data?.stats;

  const getOpponentInfo = (match: (typeof matches)[0]) => {
    if (match.gameMode === "ai") return { name: "AI Opponent", username: null };
    if (match.gameMode === "local") return { name: "Local Player", username: null };

    if (match.player1Id === userId) {
      return {
        name: match.player2?.name ?? match.player2?.username ?? "Unknown",
        username: match.player2?.username ?? null
      };
    } else {
      return {
        name: match.player1?.name ?? match.player1?.username ?? "Unknown",
        username: match.player1?.username ?? null
      };
    }
  };

  const getPlayerColor = (match: (typeof matches)[0]) => {
    if (match.gameMode === "ai" || match.gameMode === "local") {
      return "red";
    }
    return match.player1Id === userId ? "red" : "black";
  };

  const getResult = (match: (typeof matches)[0]) => {
    if (!match.winner) return "in-progress";
    if (match.winner === "draw") return "draw";

    const playerColor = getPlayerColor(match);
    return match.winner === playerColor ? "win" : "loss";
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "win":
        return (
          <Badge variant="default" className="gap-1">
            <Trophy className="h-3 w-3" />
            Win
          </Badge>
        );
      case "loss":
        return <Badge variant="destructive">Loss</Badge>;
      case "draw":
        return (
          <Badge variant="secondary" className="gap-1">
            <Handshake className="h-3 w-3" />
            Draw
          </Badge>
        );
      case "in-progress":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getGameModeBadge = (mode: string) => {
    switch (mode) {
      case "ai":
        return (
          <Badge variant="outline" className="gap-1">
            <Target className="h-3 w-3" />
            vs AI
          </Badge>
        );
      case "local":
        return <Badge variant="outline">Local</Badge>;
      case "online":
        return <Badge variant="outline">Online</Badge>;
      default:
        return <Badge variant="outline">{mode}</Badge>;
    }
  };

  const handleViewGame = (gameId: string) => {
    // Navigate to replay page with analysis mode enabled
    router.push(`/game/${gameId}/replay?analysis=true`);
  };

  const handleResetFilters = () => {
    setGameMode("all");
    setSearchOpponent("");
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalGames}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.winRate}%</p>
              <p className="text-muted-foreground text-xs">
                {stats.wins}W - {stats.losses}L - {stats.draws}D
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Best Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-1 text-2xl font-bold">
                {stats.bestStreak}
                <TrendingUp className="h-4 w-4 text-green-600" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg. Moves</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avgMoves}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Label htmlFor="mode-filter">Game Mode</Label>
              <Select
                value={gameMode}
                onValueChange={(value) => {
                  setGameMode(value as GameMode);
                  setPage(0);
                }}
              >
                <SelectTrigger id="mode-filter">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  <SelectItem value="ai">vs AI</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label htmlFor="opponent-search">Search Opponent</Label>
              <Input
                id="opponent-search"
                placeholder="Enter opponent name..."
                value={searchOpponent}
                onChange={(e) => {
                  setSearchOpponent(e.target.value);
                  setPage(0);
                }}
              />
            </div>

            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Match History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Games</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...(Array(5) as unknown[])].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : matches.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Opponent</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Your Color</TableHead>
                      <TableHead className="text-center">Moves</TableHead>
                      <TableHead className="text-center">Duration</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.map((match) => {
                      const result = getResult(match);
                      const duration =
                        match.lastSaved && match.gameStartTime
                          ? Math.round(
                              (new Date(match.lastSaved).getTime() -
                                new Date(match.gameStartTime).getTime()) /
                                1000 /
                                60,
                            )
                          : 0;

                      return (
                        <TableRow
                          key={match.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleViewGame(match.id)}
                        >
                          <TableCell className="font-medium">
                            <div>
                              <p className="text-sm">
                                {formatDistanceToNow(
                                  new Date(match.gameStartTime),
                                  { addSuffix: true },
                                )}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {new Date(
                                  match.gameStartTime,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const opponent = getOpponentInfo(match);
                              if (opponent.username) {
                                return (
                                  <Link
                                    href={`/users/${opponent.username}`}
                                    className="hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {opponent.name}
                                  </Link>
                                );
                              }
                              return opponent.name;
                            })()}
                          </TableCell>
                          <TableCell>
                            {getGameModeBadge(match.gameMode)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                getPlayerColor(match) === "red"
                                  ? "destructive"
                                  : "default"
                              }
                              className="capitalize"
                            >
                              {getPlayerColor(match)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {match.moveCount}
                          </TableCell>
                          <TableCell className="text-center">
                            {duration > 0 ? `${duration} min` : "-"}
                          </TableCell>
                          <TableCell>{getResultBadge(result)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewGame(match.id);
                              }}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Analyze
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Showing {page * pageSize + 1} to{" "}
                    {Math.min((page + 1) * pageSize, totalCount)} of{" "}
                    {totalCount} games
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      {[...(Array(Math.min(5, totalPages)) as unknown[])].map(
                        (_, i) => {
                          const pageNum = page - 2 + i;
                          if (pageNum < 0 || pageNum >= totalPages) return null;
                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className="w-10"
                            >
                              {pageNum + 1}
                            </Button>
                          );
                        },
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-lg">No games found</p>
              <p className="text-muted-foreground mt-2 text-sm">
                {gameMode !== "all" || searchOpponent
                  ? "Try adjusting your filters"
                  : "Start playing to build your match history"}
              </p>
              {(gameMode !== "all" || searchOpponent) && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleResetFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
