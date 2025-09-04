import { GameHomePage } from './_components/game-home-page';
import { UserMenu } from '~/components/user-menu';
import { SkinSelector } from '~/components/SkinSelector';
import { FloatingChat } from '~/components/chat/FloatingChat';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with User Menu */}
        <div className="flex justify-between items-start mb-12">
          <div className="flex-1 text-center">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
              Checkers Game
            </h1>
            <p className="text-xl text-amber-800">
              Challenge your mind with the classic strategy game
            </p>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <SkinSelector />
            <UserMenu />
          </div>
        </div>

        <GameHomePage />
      </div>
      
      {/* Floating Chat for non-game pages */}
      <FloatingChat defaultChannel="general" />
    </div>
  );
}