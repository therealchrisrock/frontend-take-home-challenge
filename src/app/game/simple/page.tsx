'use client';

import { GameController } from "~/components/game/GameController";
import { useSearchParams } from "next/navigation";
import { type BoardVariant } from "~/lib/board-config";

export default function SimpleGamePage() {
  const searchParams = useSearchParams();
  const boardVariant = (searchParams.get('boardVariant') || 'american') as BoardVariant;
  
  return <GameController boardVariant={boardVariant} />;
}