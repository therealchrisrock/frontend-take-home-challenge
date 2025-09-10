import { type Metadata } from 'next';
import { GameConfiguration } from '~/components/game/GameConfiguration';

export const metadata: Metadata = {
  title: 'Online Multiplayer',
  description: 'Challenge friends to online checkers matches. Play in real-time from anywhere in the world.',
  openGraph: {
    title: 'Online Multiplayer Checkers - Birdseye Checkers',
    description: 'Challenge friends online in real-time checkers matches.',
  },
};

export default function FriendGamePage() {
  return (
    <GameConfiguration
      gameMode="friend"
      title="Play with a Friend"
      description="Configure your online game settings"
    />
  );
}