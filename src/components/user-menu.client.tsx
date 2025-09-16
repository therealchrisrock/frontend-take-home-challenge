"use client";

import { History, LogOut, MessageSquare, Settings, User, Users } from "lucide-react";
import { type Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { LoadingDots } from "~/components/ui/loading-dots";
import { api } from "~/trpc/react";
import { GameSettings } from "~/app/(checkers)/_components/game/GameSettings";

interface UserMenuClientProps {
  initialSession: Session | null;
}

export function UserMenuClient({ initialSession }: UserMenuClientProps) {
  const { data: liveSession } = useSession();
  const session = liveSession ?? initialSession ?? undefined;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { } = api.message.getUnreadCount.useQuery(undefined, {
    enabled: !!session?.user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const user = session?.user;
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ??
    user?.username?.[0]?.toUpperCase() ??
    "U";

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              {user?.image ? (
                <>
                  <AvatarImage src={user.image ?? undefined} alt={user?.name ?? ""} />
                  <AvatarFallback delayMs={100}>
                    <LoadingDots size="sm" color="muted" />
                  </AvatarFallback>
                </>
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium">
                {user?.name ?? user?.username}
              </p>
              <p className="text-muted-foreground text-xs leading-none">
                {user?.username}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/friends">
              <Users className="mr-2 h-4 w-4" />
              <span>Friends</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Messages</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/history">
              <History className="mr-2 h-4 w-4" />
              <span>History</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              setSettingsOpen(true);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <GameSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
