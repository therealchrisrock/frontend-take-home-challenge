"use client";

import { Card } from "~/components/ui/card";
// Board preview and layout are managed by OnlineGameWizard

type GameVariant = "american" | "brazilian" | "international" | "canadian";

interface Friend {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
}

interface WaitingRoomProps {
  selectedFriend: Friend | null;
  invitation: {
    inviteId: string;
    inviteToken: string;
    inviteUrl: string;
    expiresAt: Date | null;
    gameMode: string;
    variant: string | null;
  };
  variant: GameVariant;
  onGameReady: (gameId: string) => void;
  onCancel: () => void;
}

// Deprecated in lobby-first flow. Intentionally left as a no-op placeholder to avoid import errors during refactor.
export function WaitingRoom() {
  return (
    <Card className="border-gray-200 bg-white p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Waiting room deprecated</h2>
        <p className="text-gray-600">Host is redirected to the game page with a waiting overlay.</p>
      </div>
    </Card>
  );
}