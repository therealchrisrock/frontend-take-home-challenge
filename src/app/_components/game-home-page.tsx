'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { PlusCircle, Users, Bot, Trophy, Info } from 'lucide-react';
import { api } from '~/trpc/react';

export function GameHomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');

  const handleStartGame = () => {
    router.push('/game');
  };

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Game Creation Section */}
        <Card className="bg-white/90 backdrop-blur border-amber-200 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-2">
              <PlusCircle className="h-8 w-8 text-orange-600 mr-2" />
            </div>
            <CardTitle className="text-2xl font-bold text-orange-800">
              New Adventure
            </CardTitle>
            <CardDescription className="text-amber-700">
              Choose your battlefield and opponent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter your champion name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bg-white/50 border-amber-300 placeholder:text-amber-400"
            />
            
            <Button
              onClick={handleStartGame}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg transform transition hover:scale-[1.02]"
            >
              <Bot className="mr-2 h-5 w-5" />
              Challenge the AI
              <Badge variant="secondary" className="ml-auto">
                Single Player
              </Badge>
            </Button>
            
            <Button
              onClick={handleStartGame}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg transform transition hover:scale-[1.02]"
            >
              <Users className="mr-2 h-5 w-5" />
              Local Battle
              <Badge variant="secondary" className="ml-auto">
                Pass & Play
              </Badge>
            </Button>
            
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg transform transition hover:scale-[1.02]"
              disabled
            >
              <Trophy className="mr-2 h-5 w-5" />
              Online Arena
              <Badge variant="secondary" className="ml-auto">
                Coming Soon
              </Badge>
            </Button>
          </CardContent>
        </Card>

        {/* How to Join Games Section */}
        <Card className="bg-white/90 backdrop-blur border-amber-200 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-2">
              <Info className="h-8 w-8 text-orange-600 mr-2" />
            </div>
            <CardTitle className="text-2xl font-bold text-orange-800">
              Join Friends' Games
            </CardTitle>
            <CardDescription className="text-amber-700">
              Multiple ways to play with friends
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h3 className="font-semibold text-amber-900 mb-2 flex items-center">
                  <Trophy className="h-4 w-4 mr-2" />
                  Via Invite Link
                </h3>
                <p className="text-sm text-amber-700">
                  Friends can share their game link with you. Simply click the link to join their battle!
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  In-Game Invites
                </h3>
                <p className="text-sm text-blue-700">
                  Once in a game, you can send and receive invites through the friends system and chat.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create & Share
                </h3>
                <p className="text-sm text-purple-700">
                  Start a new game and share your invite link with friends to challenge them to battle!
                </p>
              </div>
            </div>
            
            <div className="text-center pt-4 border-t border-amber-200">
              <p className="text-xs text-amber-600">
                Multiplayer features coming soon!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}