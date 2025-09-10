"use client";

import Link from "next/link";
import { Leaderboard } from "~/components/Leaderboard";
import {
  Users,
  Bot,
  Wifi,
  Crown,
  ChevronRight,
  Trophy,
  Mail,
  Settings,
} from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { PlayerCard } from "~/components/game/PlayerCard";
import { useSession } from "next-auth/react";
import { mapUserToPlayerInfo } from "~/lib/map-user-to-player-info";
import { api } from "~/trpc/react";

interface GameModeCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  disabled?: boolean;
}

function GameModeCard({
  href,
  icon,
  title,
  description,
  badge,
  badgeVariant = "default",
  disabled = false,
}: GameModeCardProps) {
  const content = (
    <Card
      className={`group relative overflow-hidden transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg"
      } `}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <div
                className={`rounded-lg p-2 transition-colors ${
                  disabled
                    ? "bg-gray-100"
                    : "bg-amber-100 group-hover:bg-amber-200"
                } `}
              >
                {icon}
              </div>
              {badge && (
                <Badge variant={badgeVariant} className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <h3 className="mb-1 font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          <ChevronRight
            className={`h-5 w-5 text-gray-400 transition-transform ${!disabled && "group-hover:translate-x-1 group-hover:text-amber-600"} `}
          />
        </div>
      </CardContent>
    </Card>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

export default function Home() {
  const { data: session } = useSession();
  const { data: quickStats, isLoading: statsLoading } =
    api.user.getQuickStats.useQuery();

  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Game Modes */}
          <div>
            <div className="flex items-center justify-between">
              <Link href="/profile" className="group">
                <PlayerCard
                  player={mapUserToPlayerInfo(session?.user)}
                  context="profile"
                  className="mb-4"
                />
              </Link>
              <div className="hidden items-center gap-6 text-gray-400 sm:flex">
                <Link href="/friends" aria-label="Friends">
                  <Users className="h-6 w-6 transition-colors hover:text-amber-600" />
                </Link>
                <Link href="/messages" aria-label="Messages">
                  <Mail className="h-6 w-6 transition-colors hover:text-amber-600" />
                </Link>
                <Settings className="h-6 w-6" />
              </div>
            </div>

            <div className="grid gap-4">
              <GameModeCard
                href="/game/local"
                icon={<Users className="h-5 w-5 text-amber-700" />}
                title="Play Local Game"
                description="Challenge a friend on the same device"
              />

              <GameModeCard
                href="/game/bot"
                icon={<Bot className="h-5 w-5 text-amber-700" />}
                title="Play a Bot"
                description="Test your skills against AI opponents"
              />

              <GameModeCard
                href="/game/friend"
                icon={<Wifi className="h-5 w-5 text-amber-700" />}
                title="Play a Friend Online"
                description="Challenge friends from anywhere"
                badge="Beta"
                badgeVariant="secondary"
              />

              <GameModeCard
                href="/game/royale"
                icon={<Crown className="h-5 w-5 text-amber-700" />}
                title="Checkers Royale"
                description="Battle royale mode with special rules"
                badge="Coming Soon"
                badgeVariant="outline"
                disabled={true}
              />
            </div>

            {/* Quick Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading
                      ? "—"
                      : (quickStats?.activePlayers?.toLocaleString() ?? "0")}
                  </div>
                  <div className="text-xs text-gray-600">Active Players</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading
                      ? "—"
                      : (quickStats?.gamesToday?.toLocaleString() ?? "0")}
                  </div>
                  <div className="text-xs text-gray-600">Games Today</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading
                      ? "—"
                      : (quickStats?.onlineNow?.toLocaleString() ?? "0")}
                  </div>
                  <div className="text-xs text-gray-600">Online Now</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Updates */}
            {/* <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Updates</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="mt-0.5">New</Badge>
                  <span className="text-gray-600">Move history with game review features</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="mt-0.5">New</Badge>
                  <span className="text-gray-600">Enhanced AI difficulty levels</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="mt-0.5">New</Badge>
                  <span className="text-gray-600">Time control options for competitive play</span>
                </div>
              </div>
            </div> */}
          </div>

          {/* Leaderboard */}
          <div>
            <Leaderboard limit={10} />

            {/* Quick Actions */}
            <div className="mt-6 space-y-3">
              <Button className="w-full" variant="outline" asChild>
                <Link href="/profile">
                  <Trophy className="mr-2 h-4 w-4" />
                  View Your Stats
                </Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/tutorial">Learn to Play</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
