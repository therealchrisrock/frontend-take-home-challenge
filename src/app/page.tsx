import Link from 'next/link';
import { UserMenu } from '~/components/user-menu';
import { Leaderboard } from '~/components/Leaderboard';
import { 
  Users, 
  Bot, 
  Wifi, 
  Crown,
  Gamepad2,
  ChevronRight,
  Trophy,
  Zap
} from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';

interface GameModeCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  disabled?: boolean;
}

function GameModeCard({ 
  href, 
  icon, 
  title, 
  description, 
  badge,
  badgeVariant = 'default',
  disabled = false 
}: GameModeCardProps) {
  const content = (
    <Card className={`
      group relative overflow-hidden transition-all duration-200
      ${disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'hover:shadow-lg hover:-translate-y-1 cursor-pointer hover:border-amber-400'
      }
    `}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`
                p-2 rounded-lg transition-colors
                ${disabled 
                  ? 'bg-gray-100' 
                  : 'bg-amber-100 group-hover:bg-amber-200'
                }
              `}>
                {icon}
              </div>
              {badge && (
                <Badge variant={badgeVariant} className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          <ChevronRight className={`
            w-5 h-5 text-gray-400 transition-transform
            ${!disabled && 'group-hover:translate-x-1 group-hover:text-amber-600'}
          `} />
        </div>
      </CardContent>
    </Card>
  );

  if (disabled) {
    return content;
  }

  return (
    <Link href={href}>
      {content}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Gamepad2 className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Checkers</h1>
                <p className="text-xs text-gray-600">Classic Strategy Game</p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Game Modes */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-900">Quick Play</h2>
            </div>

            <div className="grid gap-4">
              <GameModeCard
                href="/game/local"
                icon={<Users className="w-5 h-5 text-amber-700" />}
                title="Play Local Game"
                description="Challenge a friend on the same device"
              />

              <GameModeCard
                href="/game/bot"
                icon={<Bot className="w-5 h-5 text-amber-700" />}
                title="Play a Bot"
                description="Test your skills against AI opponents"
              />

              <GameModeCard
                href="/game/friend"
                icon={<Wifi className="w-5 h-5 text-amber-700" />}
                title="Play a Friend Online"
                description="Challenge friends from anywhere"
                badge="Beta"
                badgeVariant="secondary"
              />

              <GameModeCard
                href="/game/royale"
                icon={<Crown className="w-5 h-5 text-amber-700" />}
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
                  <div className="text-2xl font-bold text-gray-900">1,234</div>
                  <div className="text-xs text-gray-600">Active Players</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">5,678</div>
                  <div className="text-xs text-gray-600">Games Today</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">42</div>
                  <div className="text-xs text-gray-600">Online Now</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Updates */}
            <div className="mt-8">
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
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            <Leaderboard limit={10} />
            
            {/* Quick Actions */}
            <div className="mt-6 space-y-3">
              <Button className="w-full" variant="outline" asChild>
                <Link href="/profile">
                  <Trophy className="w-4 h-4 mr-2" />
                  View Your Stats
                </Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/tutorial">
                  Learn to Play
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>© 2024 Checkers. All rights reserved.</div>
            <div className="flex gap-4">
              <Link href="/about" className="hover:text-gray-900">About</Link>
              <Link href="/rules" className="hover:text-gray-900">Rules</Link>
              <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}