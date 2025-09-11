"use client";

import { GameController } from "~/app/(checkers)/_components/game/GameController";

export default function SimpleGamePage() {
  // Simple game page just creates a local game without a gameId
  return <GameController />;
}
