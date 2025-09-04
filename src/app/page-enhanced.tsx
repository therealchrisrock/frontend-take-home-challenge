'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { PlusCircle, Users, Bot, Trophy, Target, Crown, Zap, Sparkles, GamepadIcon } from 'lucide-react';
import { api } from '~/trpc/react';
import { UserMenuClient } from '~/components/user-menu.client';
import Link from 'next/link';
import { Background3D } from '~/components/ui/background-3d';

export default function HomeEnhanced() {
  const router = useRouter();
  const { data: session } = useSession();
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const createGameMutation = api.game.create.useMutation({
    onSuccess: (data) => {
      router.push(`/game/${data.id}`);
    },
  });

  const joinGameMutation = api.game.join.useMutation({
    onSuccess: (data) => {
      router.push(`/game/${data.id}`);
    },
  });

  const handleCreateGame = (mode: 'ai' | 'local' | 'online') => {
    createGameMutation.mutate({
      mode,
      playerName: playerName || 'Player 1',
    });
  };

  const handleJoinGame = () => {
    if (gameCode) {
      joinGameMutation.mutate({
        gameId: gameCode,
        playerName: playerName || 'Player 2',
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 3D Background - Only loads Three.js if you set enable3D={true} */}
      <Background3D 
        enable3D={true} 
        fallbackGradient="bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100"
      />
      
      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header with User Menu */}
          <div className="flex justify-between items-start mb-12">
            <div className="flex-1 text-center">
              {/* Animated Title */}
              <div className="relative inline-block">
                <h1 className="text-7xl font-black mb-4 relative">
                  <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 bg-clip-text text-transparent 
                               drop-shadow-[0_0_30px_rgba(251,146,60,0.5)]
                               animate-pulse">
                    CHECKERS
                  </span>
                  <Sparkles className="absolute -top-4 -right-8 text-yellow-400 w-8 h-8 animate-spin" 
                           style={{ animationDuration: '3s' }} />
                  <GamepadIcon className="absolute -bottom-2 -left-10 text-orange-400 w-8 h-8 animate-bounce" 
                              style={{ animationDelay: '0.5s' }} />
                </h1>
                <div className="text-2xl font-semibold text-amber-800/80 backdrop-blur-sm bg-white/20 rounded-full px-6 py-2 inline-block">
                  Master the Classic Strategy Game
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4">
              {session ? (
                <UserMenuClient session={session} />
              ) : (
                <Button asChild variant="outline">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Main Game Cards */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Enhanced Game Creation Card */}
            <Card className="bg-white/95 backdrop-blur-md border-2 border-amber-300/50 shadow-2xl 
                           hover:shadow-[0_20px_50px_rgba(251,146,60,0.3)] 
                           transform transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
                  <PlusCircle className="text-amber-600" />
                  New Adventure
                </CardTitle>
                <CardDescription className="text-base">
                  Choose your battlefield and opponent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter your champion name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="border-2 border-amber-300/50 focus:border-amber-500 bg-white/80 
                             placeholder:text-amber-600/50 text-lg h-12"
                  />
                </div>
                
                <div className="space-y-3">
                  <Button
                    onClick={() => handleCreateGame('ai')}
                    onMouseEnter={() => setHoveredButton('ai')}
                    onMouseLeave={() => setHoveredButton(null)}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 
                             hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg
                             transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    disabled={createGameMutation.isPending}
                  >
                    <Bot className={`mr-2 ${hoveredButton === 'ai' ? 'animate-bounce' : ''}`} />
                    Challenge the AI
                    <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-0">
                      Single Player
                    </Badge>
                  </Button>
                  
                  <Button
                    onClick={() => handleCreateGame('local')}
                    onMouseEnter={() => setHoveredButton('local')}
                    onMouseLeave={() => setHoveredButton(null)}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 
                             hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg
                             transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    disabled={createGameMutation.isPending}
                  >
                    <Users className={`mr-2 ${hoveredButton === 'local' ? 'animate-pulse' : ''}`} />
                    Local Battle
                    <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-0">
                      Pass & Play
                    </Badge>
                  </Button>
                  
                  <Button
                    onClick={() => handleCreateGame('online')}
                    onMouseEnter={() => setHoveredButton('online')}
                    onMouseLeave={() => setHoveredButton(null)}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-600 
                             hover:from-purple-600 hover:to-pink-700 text-white shadow-lg
                             transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                             relative overflow-hidden"
                    disabled={createGameMutation.isPending}
                  >
                    <Zap className={`mr-2 ${hoveredButton === 'online' ? 'animate-spin' : ''}`} />
                    Online Arena
                    <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-0">
                      Coming Soon
                    </Badge>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                                  -skew-x-12 translate-x-[-200%] animate-shimmer" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Join Game Card */}
            <Card className="bg-white/95 backdrop-blur-md border-2 border-amber-300/50 shadow-2xl 
                           hover:shadow-[0_20px_50px_rgba(251,146,60,0.3)] 
                           transform transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Users className="text-amber-600" />
                  Join Battle
                </CardTitle>
                <CardDescription className="text-base">
                  Enter the arena with a game code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Your warrior name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="border-2 border-amber-300/50 focus:border-amber-500 bg-white/80 
                             placeholder:text-amber-600/50 text-lg h-12"
                  />
                  <div className="relative">
                    <Input
                      placeholder="GAME CODE"
                      value={gameCode}
                      onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                      className="border-2 border-amber-300/50 focus:border-amber-500 bg-white/80 
                               placeholder:text-amber-600/50 font-mono text-2xl h-16 text-center
                               tracking-[0.3em]"
                      maxLength={6}
                    />
                    {gameCode.length === 6 && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
                          Ready!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  onClick={handleJoinGame}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-600 
                           hover:from-amber-600 hover:to-orange-700 text-white shadow-lg
                           transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={gameCode.length !== 6 || joinGameMutation.isPending}
                >
                  {joinGameMutation.isPending ? (
                    <span className="animate-pulse">Joining...</span>
                  ) : (
                    <>Enter the Arena</>
                  )}
                </Button>
                
                <div className="text-center p-4 bg-amber-50/50 rounded-lg backdrop-blur-sm">
                  <p className="text-amber-700 font-medium">
                    Ask your friend for their battle code
                  </p>
                  <p className="text-amber-600 text-sm mt-1">
                    6 characters to destiny
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Game Rules Section */}
          <Card className="bg-white/95 backdrop-blur-md border-2 border-amber-300/50 shadow-2xl mb-8
                         transform transition-all duration-300 hover:shadow-[0_20px_50px_rgba(251,146,60,0.3)]">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent inline-flex items-center justify-center gap-2">
                <Trophy className="text-amber-600" />
                Path to Victory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="group">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl 
                                transform transition-all duration-300 group-hover:scale-[1.02]">
                    <h3 className="font-bold text-xl text-amber-800 mb-4 flex items-center">
                      <Target className="mr-2 text-orange-500" size={24} />
                      Battle Tactics
                    </h3>
                    <ul className="space-y-3 text-amber-700">
                      <li className="flex items-start">
                        <span className="text-orange-500 mr-2 text-xl">⚔️</span>
                        <span>March diagonally across dark territories</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-orange-500 mr-2 text-xl">🎯</span>
                        <span>Leap over enemies to capture them</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-orange-500 mr-2 text-xl">⚡</span>
                        <span>Chain jumps for devastating combos</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-orange-500 mr-2 text-xl">🏆</span>
                        <span>Eliminate all foes or trap them to win</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="group">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl
                                transform transition-all duration-300 group-hover:scale-[1.02]">
                    <h3 className="font-bold text-xl text-purple-800 mb-4 flex items-center">
                      <Crown className="mr-2 text-purple-500" size={24} />
                      Crown Powers
                    </h3>
                    <ul className="space-y-3 text-purple-700">
                      <li className="flex items-start">
                        <span className="text-purple-500 mr-2 text-xl">👑</span>
                        <span>Reach the enemy's back row for coronation</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-purple-500 mr-2 text-xl">↕️</span>
                        <span>Kings command forward and backward movement</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-purple-500 mr-2 text-xl">💪</span>
                        <span>Crowned pieces follow standard capture rules</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-purple-500 mr-2 text-xl">🎮</span>
                        <span>Drag, drop, or click to execute your strategy</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <Separator className="my-8 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
              
              <div className="text-center">
                <p className="text-xl font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Ready to become a Checkers Champion?
                </p>
                <p className="text-amber-600 mt-2">Choose your battlefield above and prove your worth!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}