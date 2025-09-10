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

export default function UsersBrowser({ currentUserId }: UsersBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: users, isLoading } = api.user.searchUsers.useQuery(
    { query: searchQuery },
    { 
      enabled: searchQuery.length > 0
    }
  );

  // Mock featured players for when there's no search
  const featuredPlayers = [
    { id: "1", username: "champion_player", name: "Champion", level: 15, wins: 234, games: 456 },
    { id: "2", username: "rising_star", name: "Rising Star", level: 8, wins: 89, games: 178 },
    { id: "3", username: "casual_gamer", name: "Casual Player", level: 5, wins: 34, games: 98 },
  ];

  const getPlayerBadge = (wins: number, games: number) => {
    const winRate = games > 0 ? (wins / games) * 100 : 0;
    if (winRate >= 70 && games >= 20) return { text: "Elite", color: "bg-gradient-to-r from-yellow-400 to-orange-400" };
    if (winRate >= 60 && games >= 10) return { text: "Expert", color: "bg-gradient-to-r from-purple-400 to-pink-400" };
    if (winRate >= 50) return { text: "Skilled", color: "bg-gradient-to-r from-blue-400 to-cyan-400" };
    if (games >= 5) return { text: "Active", color: "bg-gradient-to-r from-green-400 to-emerald-400" };
    return { text: "New", color: "bg-gradient-to-r from-gray-400 to-gray-500" };
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder="Search players by username or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4 h-12 text-lg border-2 border-purple-200 dark:border-purple-800 focus:border-purple-400 dark:focus:border-purple-600"
        />
      </div>

      {/* Results or Featured Players */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6) as unknown[]].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
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
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2">Featured Players</h2>
                <p className="text-gray-600 dark:text-gray-400">Start typing to search for specific players</p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featuredPlayers.map((player, index) => {
                  const badge = getPlayerBadge(player.wins, player.games);
                  const winRate = player.games > 0 ? Math.round((player.wins / player.games) * 100) : 0;
                  
                  return (
                    <m.div
                      key={player.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-300 dark:hover:border-purple-700 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative">
                          <div className="flex items-start gap-4">
                            <div className="relative">
                              <Avatar className="h-16 w-16 ring-2 ring-purple-200 dark:ring-purple-800 group-hover:ring-purple-400 dark:group-hover:ring-purple-600 transition-all">
                                <AvatarImage src={undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xl">
                                  {player.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full px-2 py-0.5 text-xs font-bold border-2 border-purple-300 dark:border-purple-700">
                                Lvl {player.level}
                              </div>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{player.name}</h3>
                                <Badge className={`${badge.color} text-white text-xs`}>
                                  {badge.text}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">@{player.username}</p>
                              
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
                          
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                  <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-300 dark:hover:border-purple-700 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6 relative">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-2 ring-purple-200 dark:ring-purple-800 group-hover:ring-purple-400 dark:group-hover:ring-purple-600 transition-all">
                          <AvatarImage src={user.image ?? undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                            {(user.name ?? user.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold">{user.name ?? user.username}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
                        </div>

                        <Button 
                          asChild
                          variant="outline"
                          size="sm"
                          className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        >
                          <Link href={`/users/${user.username}`}>
                            <Users className="h-4 w-4 mr-1" />
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
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No players found</h3>
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