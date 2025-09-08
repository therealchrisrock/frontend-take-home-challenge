import { GameConfiguration } from '~/components/game/GameConfiguration';

export default function FriendGamePage() {
  return (
    <GameConfiguration
      gameMode="friend"
      title="Play with a Friend"
      description="Configure your online game settings"
    />
  );
}