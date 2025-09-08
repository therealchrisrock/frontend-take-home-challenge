'use client';

import { useRouter } from 'next/navigation';
import { Card } from '~/components/ui/card';
import { Users, User, Bot, Trophy, Settings } from 'lucide-react';

export default function GameModeSelectorPage() {
  const router = useRouter();

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Choose Game Mode</h1>
          <p className="text-gray-400">Select how you want to play checkers</p>
        </div>

        <Card 
          className="bg-gray-800/80 border-gray-700 p-6 cursor-pointer hover:bg-gray-800/90 transition-all hover:scale-[1.02]"
          onClick={() => router.push('/game/local')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Local Game</h3>
              <p className="text-gray-400 text-sm">Play on the same device</p>
            </div>
          </div>
        </Card>

        <Card 
          className="bg-gray-800/80 border-gray-700 p-6 cursor-pointer hover:bg-gray-800/90 transition-all hover:scale-[1.02]"
          onClick={() => router.push('/game/friend')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Play a Friend</h3>
              <p className="text-gray-400 text-sm">Invite a friend to a game of checkers</p>
            </div>
          </div>
        </Card>

        <Card 
          className="bg-gray-800/80 border-gray-700 p-6 cursor-pointer hover:bg-gray-800/90 transition-all hover:scale-[1.02]"
          onClick={() => router.push('/game/bot')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Play a Bot</h3>
              <p className="text-gray-400 text-sm">Challenge the AI opponent</p>
            </div>
          </div>
        </Card>

        <div className="mt-8 pt-6 border-t border-gray-700 space-y-3">
          <button 
            className="w-full text-left flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
            onClick={() => router.push('/history')}
          >
            <Trophy className="w-5 h-5" />
            <span>Game History</span>
          </button>
          <button 
            className="w-full text-left flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
            onClick={() => router.push('/settings')}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}