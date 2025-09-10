import { type Metadata } from 'next';
import { GameConfiguration } from '~/components/game/GameConfiguration';

export const metadata: Metadata = {
  title: 'Play vs AI',
  description: 'Challenge our AI bot in a game of checkers. Multiple difficulty levels available.',
  openGraph: {
    title: 'Play Checkers vs AI - Birdseye Checkers',
    description: 'Test your skills against our intelligent checkers bot.',
  },
};

export default function BotGamePage() {
  return (
    <GameConfiguration
      gameMode="bot"
      title="Play against Bot"
      description="Configure your game against AI"
    />
  );
}