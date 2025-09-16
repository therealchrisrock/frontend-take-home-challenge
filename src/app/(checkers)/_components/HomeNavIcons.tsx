"use client";

import { Mail, Settings, Users } from "lucide-react";
import Link from "next/link";
import { GameSettings } from "~/app/(checkers)/_components/game/GameSettings";

export function HomeNavIcons() {
  return (
    <div className="hidden items-center gap-6 text-gray-400 sm:flex">
      <Link href="/friends" aria-label="Friends">
        <Users className="h-6 w-6 transition-colors hover:text-primary-600" />
      </Link>
      <Link href="/messages" aria-label="Messages">
        <Mail className="h-6 w-6 transition-colors hover:text-primary-600" />
      </Link>
      <GameSettings>
        <button
          aria-label="Settings"
          className="cursor-pointer transition-colors hover:text-primary-600"
        >
          <Settings className="h-6 w-6" />
        </button>
      </GameSettings>
    </div>
  );
}