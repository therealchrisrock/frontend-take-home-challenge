"use client";

import { Bot, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { BoardPreview } from "~/app/(checkers)/_components/game/BoardPreview";
import { GameWrapper } from "~/app/(checkers)/_components/game/game-wrapper";
import { Card } from "~/components/ui/card";

export default function GameModeSelectorPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen justify-center overflow-hidden p-4">
      <GameWrapper>
        <BoardPreview size={8} />

        {/* Mode selection panel */}
        <div className="max-h-full w-full space-y-4 self-start overflow-y-auto">
          <div className="mb-4 text-center">
            <h1 className="mb-1 mt-4 text-3xl font-bold text-gray-900">
              Choose Game Mode
            </h1>
            <p className="text-gray-600">
              Select how you want to play checkers
            </p>
          </div>
          <Card
            className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-primary/70 hover:shadow-lg"
            onClick={() => router.push("/game/bot")}
          >
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Bot className="h-6 w-6 text-primary-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Play a Bot
                  </h3>
                  <p className="text-sm text-gray-600">
                    Challenge the AI opponent
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card
            className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-primary/70 hover:shadow-lg"
            onClick={() => router.push("/game/local")}
          >
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <User className="h-6 w-6 text-primary-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Local Game
                  </h3>
                  <p className="text-sm text-gray-600">
                    Play on the same device
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-primary/70 hover:shadow-lg"
            onClick={() => router.push("/game/online")}
          >
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Users className="h-6 w-6 text-primary-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Play Online
                  </h3>
                  <p className="text-sm text-gray-600">
                    Invite a friend to a game of checkers
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </GameWrapper>
    </div>
  );
}
