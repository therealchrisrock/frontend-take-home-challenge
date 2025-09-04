'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Users, Bot, ChevronLeft } from 'lucide-react';
import { api } from '~/trpc/react';

export default function SimplifiedGameSetup() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const createGameMutation = api.simplifiedGame.create.useMutation({
    onSuccess: (data) => {
      router.push(`/game/${data.id}/simplified`);
    },
    onError: (error) => {
      console.error('Failed to create game:', error);
      setIsCreating(false);
    }
  });

  const handleCreateGame = (mode: 'ai' | 'local' | 'online') => {
    setIsCreating(true);
    createGameMutation.mutate({ mode });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push('/')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Simplified Checkers</h1>
          <p className="text-center text-gray-600 mb-8">
            Industry-standard single-tab game implementation
          </p>

          <div className="space-y-4">
            <Card 
              className="p-6 cursor-pointer hover:bg-gray-50 transition-all hover:scale-[1.02] border-2"
              onClick={() => handleCreateGame('ai')}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Play vs AI</h3>
                  <p className="text-gray-600 text-sm">Challenge the computer opponent</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:bg-gray-50 transition-all hover:scale-[1.02] border-2"
              onClick={() => handleCreateGame('local')}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Local Pass & Play</h3>
                  <p className="text-gray-600 text-sm">Play on the same device</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:bg-gray-50 transition-all hover:scale-[1.02] border-2"
              onClick={() => handleCreateGame('online')}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Online Multiplayer</h3>
                  <p className="text-gray-600 text-sm">Play with friends online</p>
                </div>
              </div>
            </Card>
          </div>

          {isCreating && (
            <div className="mt-6 text-center text-gray-600">
              Creating game...
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">🎯 Simplified Implementation</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Single-tab enforcement (prevents conflicts)</li>
              <li>✅ Simple SSE for real-time updates</li>
              <li>✅ Optimistic UI updates</li>
              <li>✅ Offline move queue</li>
              <li>✅ Industry-standard approach</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}