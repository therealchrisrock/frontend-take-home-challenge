"use client";

import {
  Award,
  Crown,
  Gamepad2,
  Shield,
  Sparkles,
  Star,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  X,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "~/components/ui/use-toast";
import { m } from "~/lib/motion";
import { api } from "~/trpc/react";

interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  aiGames: number;
  localGames: number;
  onlineGames: number;
  recentGames?: Array<{
    id: string;
    result: "win" | "loss" | "draw";
    gameMode: string;
    moveCount: number;
    date: Date;
  }>;
  stats?: {
    bestStreak: number;
    avgMoves: number;
    totalMoves?: number;
  };
}

interface MatchEntry {
  id: string;
  winner: string | null;
  gameMode: string;
  moveCount: number;
  gameStartTime: Date;
  lastSaved: Date;
  player1Id: string | null;
  player2Id: string | null;
  player1?: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  } | null;
  player2?: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface GameProfileViewProps {
  user: {
    id: string;
    username: string;
    name: string | null;
    email: string | null;
    emailVerified: Date | null;
    image: string | null;
    createdAt: Date;
  };
  stats: GameStats;
  matchHistory: {
    matches: MatchEntry[];
    total: number;
    stats?: {
      totalGames: number;
      wins: number;
      losses: number;
      draws: number;
      winRate: number;
      bestStreak: number;
      avgMoves: number;
    };
  };
  isOwnProfile: boolean;
  currentUserId?: string;
}

export default function GameProfileView({
  user,
  stats,
  matchHistory,
  isOwnProfile,
  currentUserId,
}: GameProfileViewProps) {
  const [friendStatus, setFriendStatus] = useState<{
    status: string;
    friendRequestId?: string;
  }>({ status: "loading" });

  // Check friend status
  const { data: statusData, refetch: refetchStatus } = api.friendRequest.checkStatus.useQuery(
    { userId: user.id },
    {
      enabled: !!currentUserId && !isOwnProfile,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    }
  );

  useEffect(() => {
    if (statusData) {
      setFriendStatus(statusData);
    }
  }, [statusData]);

  const utils = api.useUtils();

  const sendFriendRequest = api.friendRequest.send.useMutation({
    onSuccess: async (data) => {
      setFriendStatus({ 
        status: "request_sent", 
        friendRequestId: data.friendRequest.id 
      });
      toast({
        title: "Friend request sent!",
        description: `You've sent a friend request to ${user.name ?? user.username}`,
      });
      await utils.friendRequest.checkStatus.invalidate({ userId: user.id });
      await refetchStatus();
    },
    onError: (error) => {
      // If error says request already exists, refetch the status
      if (error.message.includes("already exists")) {
        void refetchStatus();
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelFriendRequest = api.friendRequest.cancel.useMutation({
    onSuccess: async () => {
      setFriendStatus({ status: "none" });
      toast({
        title: "Friend request cancelled",
        description: "The friend request has been cancelled",
      });
      await utils.friendRequest.checkStatus.invalidate({ userId: user.id });
      await refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFriend = api.friendRequest.removeFriend.useMutation({
    onSuccess: async () => {
      setFriendStatus({ status: "none" });
      toast({
        title: "Friend removed",
        description: `${user.name ?? user.username} has been removed from your friends list`,
      });
      await utils.friendRequest.checkStatus.invalidate({ userId: user.id });
      await refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const router = useRouter();
  
  const createGameInvite = api.gameInvite.createInvitation.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Game invite sent!",
        description: `You've challenged ${user.name ?? user.username} to a game.`,
      });
      // Navigate to the game page
      router.push(data.inviteUrl);
    },
    onError: (error) => {
      toast({
        title: "Failed to send invite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const winRate =
    stats.totalGames > 0
      ? Math.round((stats.wins / stats.totalGames) * 100)
      : 0;

  const playerLevel = Math.floor(stats.totalGames / 10) + 1;
  const xpInCurrentLevel = (stats.totalGames % 10) * 10;

  const getPlayerTitle = () => {
    if (stats.totalGames === 0) return "Newcomer";
    if (stats.totalGames < 5) return "Beginner";
    if (stats.totalGames < 10) return "Apprentice";
    if (stats.totalGames < 25) return "Player";
    if (stats.totalGames < 50) return "Challenger";
    if (stats.totalGames < 100) return "Expert";
    if (stats.totalGames < 200) return "Master";
    return "Grandmaster";
  };

  const getRankBadgeColor = () => {
    if (winRate >= 70) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    if (winRate >= 60) return "bg-gradient-to-r from-purple-400 to-purple-600";
    if (winRate >= 50) return "bg-gradient-to-r from-blue-400 to-blue-600";
    if (winRate >= 40) return "bg-gradient-to-r from-green-400 to-green-600";
    return "bg-gradient-to-r from-gray-400 to-gray-600";
  };

  const achievements = [
    {
      id: 1,
      name: "First Blood",
      description: "Win your first game",
      icon: Swords,
      unlocked: stats.wins >= 1,
      color: "text-red-500",
    },
    {
      id: 2,
      name: "Streak Master",
      description: "Win 3 games in a row",
      icon: Zap,
      unlocked: (stats.stats?.bestStreak ?? 0) >= 3,
      color: "text-yellow-500",
    },
    {
      id: 3,
      name: "Veteran",
      description: "Play 50 games",
      icon: Shield,
      unlocked: stats.totalGames >= 50,
      color: "text-blue-500",
    },
    {
      id: 4,
      name: "Champion",
      description: "Achieve 60% win rate",
      icon: Crown,
      unlocked: winRate >= 60 && stats.totalGames >= 10,
      color: "text-purple-500",
    },
    {
      id: 5,
      name: "Social Butterfly",
      description: "Play 10 online games",
      icon: Users,
      unlocked: stats.onlineGames >= 10,
      color: "text-green-500",
    },
    {
      id: 6,
      name: "Perfectionist",
      description: "Win 10 games",
      icon: Star,
      unlocked: stats.wins >= 10,
      color: "text-primary/10",
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto space-y-4 px-4 py-8">
        {/* Hero Section with Avatar and Stats */}
        <div>
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-100 to-pink-100 dark:border-purple-800 dark:from-purple-900/50 dark:to-pink-900/50">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
                {/* Avatar Section */}
                <div className="relative">
                  <div className="relative">
                    <Avatar className="h-32 w-32 ring-4 ring-purple-300 dark:ring-purple-700">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-3xl text-white">
                        {user.name?.charAt(0) ??
                          user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Level Badge */}
                    <div className="absolute -right-2 -bottom-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 px-3 py-1 text-sm font-bold text-white shadow-lg">
                      Lvl {playerLevel}
                    </div>
                  </div>
                </div>

                {/* Player Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="mb-2 flex items-center justify-center gap-3 md:justify-start">
                    <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent">
                      {user.name ?? user.username}
                    </h1>
                    <Badge className={`${getRankBadgeColor()} text-white`}>
                      {getPlayerTitle()}
                    </Badge>
                  </div>
                  <p className="mb-4 text-gray-600 dark:text-gray-400">
                    @{user.username}
                  </p>

                  {/* XP Progress Bar */}
                  <div className="mb-4">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Level {playerLevel}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {xpInCurrentLevel}/100 XP
                      </span>
                    </div>
                    <Progress
                      value={xpInCurrentLevel}
                      className="h-3 bg-gray-200 dark:bg-gray-700"
                    >
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                    </Progress>
                  </div>

                  {/* Quick Stats */}
                  <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {stats.wins}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Wins
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {stats.losses}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Losses
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {winRate}%
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Win Rate
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.totalGames}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Games
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && currentUserId && (
                    <div className="flex justify-center gap-2 md:justify-start">
                      {friendStatus.status === "none" && (
                        <Button
                          onClick={() =>
                            sendFriendRequest.mutate({ userId: user.id })
                          }
                          disabled={sendFriendRequest.isPending}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          <UserPlus className="h-4 w-4" />
                          Add Friend
                        </Button>
                      )}
                      {friendStatus.status === "request_sent" && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            cancelFriendRequest.mutate({
                              friendRequestId: friendStatus.friendRequestId!,
                            })
                          }
                          disabled={cancelFriendRequest.isPending}
                        >
                          <X className="h-4 w-4" />
                          Cancel Request
                        </Button>
                      )}
                      {friendStatus.status === "request_received" && (
                        <Button
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                          <UserCheck className="h-4 w-4" />
                          Respond to Request
                        </Button>
                      )}
                      {friendStatus.status === "friends" && (
                        <>
                          <Button 
                            variant="outline"
                            onClick={() => createGameInvite.mutate({
                              friendIds: [user.id],
                              message: "Let's play a game of checkers!",
                              expiresIn: 24, // 24 hours
                            })}
                            disabled={createGameInvite.isPending}
                          >
                            <Gamepad2 className="h-4 w-4" />
                            Challenge
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              removeFriend.mutate({ userId: user.id })
                            }
                            disabled={removeFriend.isPending}
                          >
                            <X className="h-4 w-4" />
                            Remove Friend
                          </Button>
                        </>
                      )}
                      {friendStatus.status === "loading" && (
                        <Button disabled>
                          <Users className="h-4 w-4" />
                          Loading...
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Trophy Display */}
                <div className="hidden lg:block">
                  <div className="rounded-lg bg-white/50 p-4 backdrop-blur dark:bg-gray-800/50">
                    <div className="mb-2 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">Achievements</span>
                    </div>
                    <div className="text-center text-3xl font-bold">
                      {unlockedCount}/{achievements.length}
                    </div>
                    <Progress
                      value={(unlockedCount / achievements.length) * 100}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="stats" className="space-y-4">
          <TabsList className="mx-auto grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="stats" className="flex items-center gap-1">
              Stats
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="flex items-center gap-1"
            >
              Achievements
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              History
            </TabsTrigger>
          </TabsList>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {/* Performance Card */}
              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Best Streak</span>
                      <span className="font-bold">
                        {stats.stats?.bestStreak ?? 0} games
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Moves</span>
                      <span className="font-bold">
                        {stats.stats?.avgMoves ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Moves</span>
                      <span className="font-bold">
                        {stats.stats?.totalMoves ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Game Modes Card */}
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:border-blue-800 dark:from-blue-900/20 dark:to-cyan-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-blue-500" />
                    Game Modes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>vs AI</span>
                      <span className="font-medium">{stats.aiGames}</span>
                    </div>
                    <Progress
                      value={
                        stats.totalGames > 0
                          ? (stats.aiGames / stats.totalGames) * 100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Local</span>
                      <span className="font-medium">{stats.localGames}</span>
                    </div>
                    <Progress
                      value={
                        stats.totalGames > 0
                          ? (stats.localGames / stats.totalGames) * 100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Online</span>
                      <span className="font-medium">{stats.onlineGames}</span>
                    </div>
                    <Progress
                      value={
                        stats.totalGames > 0
                          ? (stats.onlineGames / stats.totalGames) * 100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Recent Form Card */}
              <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Recent Form
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.recentGames && stats.recentGames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {stats.recentGames.slice(0, 10).map((game, index) => (
                        <m.div
                          key={index}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white ${game.result === "win" ? "bg-green-500" : game.result === "loss" ? "bg-red-500" : "bg-gray-500"} `}
                        >
                          {game.result === "win"
                            ? "W"
                            : game.result === "loss"
                              ? "L"
                              : "D"}
                        </m.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No recent games</p>
                  )}
                </CardContent>
              </Card>
            </m.div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {achievements.map((achievement, index) => (
                <m.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`relative overflow-hidden ${achievement.unlocked
                      ? "border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-primary/10 dark:border-yellow-700 dark:from-yellow-900/20 dark:to-primary-900/20"
                      : "opacity-60 grayscale"
                      }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className={`rounded-lg p-3 ${achievement.unlocked
                            ? "bg-white/80 dark:bg-gray-800/80"
                            : "bg-gray-200 dark:bg-gray-700"
                            }`}
                        >
                          <achievement.icon
                            className={`h-6 w-6 ${achievement.unlocked ? achievement.color : "text-gray-400"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1 font-semibold">
                            {achievement.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                      {achievement.unlocked && (
                        <div className="absolute top-2 right-2">
                          <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </m.div>
              ))}
            </m.div>
          </TabsContent>

          {/* Match History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Recent Matches</CardTitle>
                <CardDescription>Last 5 games played</CardDescription>
              </CardHeader>
              <CardContent>
                {matchHistory.matches && matchHistory.matches.length > 0 ? (
                  <div className="space-y-3">
                    {matchHistory.matches.map((match, index) => {
                      if (!match.player1Id || !match.player2Id) return null;

                      const isPlayer1 = match.player1Id === user.id;
                      const opponent = isPlayer1
                        ? match.player2
                        : match.player1;
                      const playerColor = isPlayer1 ? "red" : "black";
                      let result: "win" | "loss" | "draw";

                      if (match.winner === "draw") {
                        result = "draw";
                      } else {
                        result = match.winner === playerColor ? "win" : "loss";
                      }

                      return (
                        <m.div
                          key={match.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`rounded-lg border-2 p-4 ${result === "win"
                            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                            : result === "loss"
                              ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                              : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`rounded-full p-2 ${result === "win"
                                  ? "bg-green-500"
                                  : result === "loss"
                                    ? "bg-red-500"
                                    : "bg-gray-500"
                                  } text-white`}
                              >
                                {result === "win" ? (
                                  <Trophy className="h-4 w-4" />
                                ) : result === "loss" ? (
                                  <Shield className="h-4 w-4" />
                                ) : (
                                  <Award className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold">
                                  vs{" "}
                                  {opponent
                                    ? (opponent.name ?? opponent.username)
                                    : "AI"}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {match.moveCount} moves • {match.gameMode}{" "}
                                  mode
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={
                                result === "win"
                                  ? "default"
                                  : result === "loss"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {result.toUpperCase()}
                            </Badge>
                          </div>
                        </m.div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-gray-500">
                    No match history available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
