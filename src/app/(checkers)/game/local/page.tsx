import { type Metadata } from "next";
import { GameConfiguration } from "~/components/game/GameConfiguration";

export const metadata: Metadata = {
  title: "Local Multiplayer",
  description:
    "Play checkers with a friend on the same device. Perfect for face-to-face challenges.",
  openGraph: {
    title: "Local Multiplayer Checkers - Birdseye Checkers",
    description:
      "Challenge a friend in a local checkers match on the same device.",
  },
};

export default function LocalGamePage() {
  return (
    <GameConfiguration
      gameMode="local"
      title="Local Game"
      description="Configure your local game settings"
    />
  );
}
