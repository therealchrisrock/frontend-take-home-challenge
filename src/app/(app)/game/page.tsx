'use client';

import { useRouter } from 'next/navigation';
import { Card } from '~/components/ui/card';
import { Users, User, Bot, Trophy } from 'lucide-react';
import { BoardPreview } from '~/components/game/BoardPreview';
import { GameWrapper } from '~/components/game/game-wrapper';

export default function GameModeSelectorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex justify-center p-4 overflow-hidden">
      <GameWrapper>
          <BoardPreview size={8} />

        {/* Mode selection panel */}
        <div className="space-y-4 overflow-y-auto max-h-full self-start lg:mt-8 w-full">
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Choose Game Mode</h1>
              <p className="text-gray-600">Select how you want to play checkers</p>
            </div>

            <Card 
              className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-amber-400"
              onClick={() => router.push('/game/local')}
            >
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 group-hover:bg-amber-200 rounded-lg flex items-center justify-center transition-colors">
                    <User className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-semibold text-lg">Local Game</h3>
                    <p className="text-gray-600 text-sm">Play on the same device</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card 
              className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-amber-400"
              onClick={() => router.push('/game/friend')}
            >
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 group-hover:bg-amber-200 rounded-lg flex items-center justify-center transition-colors">
                    <Users className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-semibold text-lg">Play a Friend</h3>
                    <p className="text-gray-600 text-sm">Invite a friend to a game of checkers</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card 
              className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-amber-400"
              onClick={() => router.push('/game/bot')}
            >
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 group-hover:bg-amber-200 rounded-lg flex items-center justify-center transition-colors">
                    <Bot className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-semibold text-lg">Play a Bot</h3>
                    <p className="text-gray-600 text-sm">Challenge the AI opponent</p>
                  </div>
                </div>
              </div>
            </Card>
        </div>
      </GameWrapper>
    </div>
  );
}