"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Search, Users, Trophy, Gamepad2, Sparkles } from "lucide-react";
import { m } from "~/lib/motion";
import Link from "next/link";

interface UsersBrowserProps {
  currentUserId?: string;
}

export default function UsersBrowser({}: UsersBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, isLoading } = api.user.searchUsers.useQuery(
    { query: searchQuery },
    {
      enabled: searchQuery.length > 0,
    },
  );

  // Mock featured players for when there's no search
  const featuredPlayers = [
    {
      id: "1",
      username: "champion_player",
      name: "Champion",
      level: 15,
      wins: 234,
      games: 456,
    },
    {
      id: "2",
      username: "rising_star",
      name: "Rising Star",
      level: 8,
      wins: 89,
      games: 178,
    },
    {
      id: "3",
      username: "casual_gamer",
      name: "Casual Player",
      level: 5,
      wins: 34,
      games: 98,
    },
  ];

  const getPlayerBadge = (wins: number, games: number) => {
    const winRate = games > 0 ? (wins / games) * 100 : 0;
    if (winRate >= 70 && games >= 20)
      return {
        text: "Elite",
        color: "bg-gradient-to-r from-yellow-400 to-orange-400",
      };
    if (winRate >= 60 && games >= 10)
      return {
        text: "Expert",
        color: "bg-gradient-to-r from-purple-400 to-pink-400",
      };
    if (winRate >= 50)
      return {
        text: "Skilled",
        color: "bg-gradient-to-r from-blue-400 to-cyan-400",
      };
    if (games >= 5)
      return {
        text: "Active",
        color: "bg-gradient-to-r from-green-400 to-emerald-400",
      };
    return { text: "New", color: "bg-gradient-to-r from-gray-400 to-gray-500" };
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative mx-auto max-w-2xl">
        <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
        <Input
          type="text"
          placeholder="Search players by username or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 border-2 border-purple-200 pr-4 pl-10 text-lg focus:border-purple-400 dark:border-purple-800 dark:focus:border-purple-600"
        />
      </div>

      {/* Results or Featured Players */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...(Array(6) as unknown[])].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="mb-2 h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {searchQuery.length === 0 ? (
            <>
              <div className="mb-8 text-center">
                <h2 className="mb-2 text-2xl font-semibold">
                  Featured Players
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Start typing to search for specific players
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featuredPlayers.map((player, index) => {
                  const badge = getPlayerBadge(player.wins, player.games);
                  const winRate =
                    player.games > 0
                      ? Math.round((player.wins / player.games) * 100)
                      : 0;

                  return (
                    <m.div
                      key={player.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="group overflow-hidden border-2 transition-all duration-300 hover:border-purple-300 hover:shadow-xl dark:hover:border-purple-700">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 transition-opacity group-hover:opacity-100 dark:from-purple-900/10 dark:to-pink-900/10" />
                        <CardContent className="relative p-6">
                          <div className="flex items-start gap-4">
                            <div className="relative">
                              <Avatar className="h-16 w-16 ring-2 ring-purple-200 transition-all group-hover:ring-purple-400 dark:ring-purple-800 dark:group-hover:ring-purple-600">
                                <AvatarImage src={undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-xl text-white">
                                  {player.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -right-1 -bottom-1 rounded-full border-2 border-purple-300 bg-white px-2 py-0.5 text-xs font-bold dark:border-purple-700 dark:bg-gray-800">
                                Lvl {player.level}
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <h3 className="text-lg font-semibold">
                                  {player.name}
                                </h3>
                                <Badge
                                  className={`${badge.color} text-xs text-white`}
                                >
                                  {badge.text}
                                </Badge>
                              </div>
                              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                                @{player.username}
                              </p>

                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                  <span>{player.wins}W</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Gamepad2 className="h-4 w-4 text-blue-500" />
                                  <span>{player.games} games</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Sparkles className="h-4 w-4 text-purple-500" />
                                  <span>{winRate}%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                            <Button
                              asChild
                              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                            >
                              <Link href={`/users/${player.username}`}>
                                View Profile
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </m.div>
                  );
                })}
              </div>
            </>
          ) : users && users.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user, index) => (
                <m.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="group overflow-hidden border-2 transition-all duration-300 hover:border-purple-300 hover:shadow-xl dark:hover:border-purple-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 transition-opacity group-hover:opacity-100 dark:from-purple-900/10 dark:to-pink-900/10" />
                    <CardContent className="relative p-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-2 ring-purple-200 transition-all group-hover:ring-purple-400 dark:ring-purple-800 dark:group-hover:ring-purple-600">
                          <AvatarImage src={user.image ?? undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                            {(user.name ?? user.username)
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {user.name ?? user.username}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            @{user.username}
                          </p>
                        </div>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        >
                          <Link href={`/users/${user.username}`}>
                            <Users className="mr-1 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </m.div>
              ))}
            </div>
          ) : searchQuery.length > 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold">No players found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try searching with a different name or username
                </p>
              </div>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
