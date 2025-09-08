"use client";

import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface MatchHistoryProps {
  userId: string;
}

export default function MatchHistory({ userId }: MatchHistoryProps) {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data, isLoading } = api.user.getMatchHistory.useQuery({
    userId,
    skip: page * pageSize,
    take: pageSize,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const matches = data?.matches ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const getOpponentName = (match: typeof matches[0]) => {
    if (match.gameMode === "ai") return "AI Opponent";
    if (match.gameMode === "local") return "Local Player";
    
    // For online games, show the opponent's name
    if (match.player1Id === userId) {
      return match.player2?.name ?? match.player2?.username ?? "Unknown";
    } else {
      return match.player1?.name ?? match.player1?.username ?? "Unknown";
    }
  };

  const getPlayerColor = (match: typeof matches[0]) => {
    if (match.gameMode === "ai" || match.gameMode === "local") {
      return "red"; // Default to red for single player modes
    }
    return match.player1Id === userId ? "red" : "black";
  };

  const getResult = (match: typeof matches[0]) => {
    if (!match.winner) return "in-progress";
    if (match.winner === "draw") return "draw";
    
    const playerColor = getPlayerColor(match);
    return match.winner === playerColor ? "win" : "loss";
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "win":
        return <Badge variant="default">Win</Badge>;
      case "loss":
        return <Badge variant="destructive">Loss</Badge>;
      case "draw":
        return <Badge variant="secondary">Draw</Badge>;
      case "in-progress":
        return <Badge variant="outline">In Progress</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getGameModeBadge = (mode: string) => {
    switch (mode) {
      case "ai":
        return <Badge variant="outline">vs AI</Badge>;
      case "local":
        return <Badge variant="outline">Local</Badge>;
      case "online":
        return <Badge variant="outline">Online</Badge>;
      default:
        return <Badge variant="outline">{mode}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match History</CardTitle>
        <CardDescription>
          Your recent games and performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length > 0 ? (
          <>
            <Table>
              <TableCaption>
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} matches
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Your Color</TableHead>
                  <TableHead>Moves</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => {
                  const result = getResult(match);
                  const duration = match.lastSaved && match.gameStartTime
                    ? Math.round((new Date(match.lastSaved).getTime() - new Date(match.gameStartTime).getTime()) / 1000 / 60)
                    : 0;
                  
                  return (
                    <TableRow key={match.id}>
                      <TableCell className="font-medium">
                        {formatDistanceToNow(new Date(match.gameStartTime), { addSuffix: true })}
                      </TableCell>
                      <TableCell>{getOpponentName(match)}</TableCell>
                      <TableCell>{getGameModeBadge(match.gameMode)}</TableCell>
                      <TableCell>
                        <Badge variant={getPlayerColor(match) === "red" ? "destructive" : "default"}>
                          {getPlayerColor(match)}
                        </Badge>
                      </TableCell>
                      <TableCell>{match.moveCount}</TableCell>
                      <TableCell>{duration > 0 ? `${duration} min` : "-"}</TableCell>
                      <TableCell>{getResultBadge(result)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Navigate to game replay or details
                            window.location.href = `/game/${match.id}`;
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No matches found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.href = "/game"}
            >
              Start Playing
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}