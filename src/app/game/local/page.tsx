import { GameConfiguration } from '~/components/game/GameConfiguration';

export default function LocalGamePage() {
  return (
    <GameConfiguration
      gameMode="local"
      title="Local Game"
      description="Configure your local game settings"
    />
  );
}