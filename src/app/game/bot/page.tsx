import { GameConfiguration } from '~/components/game/GameConfiguration';

export default function BotGamePage() {
  return (
    <GameConfiguration
      gameMode="bot"
      title="Play against Bot"
      description="Configure your game against AI"
    />
  );
}