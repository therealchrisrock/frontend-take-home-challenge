"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { type Session } from "next-auth";
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
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { User, MessageSquare, Users, Settings, LogOut } from "lucide-react";

interface UserMenuClientProps {
  session: Session;
}

export function UserMenuClient({ session }: UserMenuClientProps) {
  const { data: unreadCount } = api.message.getUnreadCount.useQuery(
    undefined,
    { 
      enabled: !!session?.user,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || session.user.username?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session.user.avatarUrl ?? session.user.image ?? undefined} alt={session.user.name ?? ""} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {unreadCount && unreadCount.count > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
              {unreadCount.count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name ?? session.user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.username}
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
            {unreadCount && unreadCount.count > 0 && (
              <Badge className="ml-auto" variant="secondary">
                {unreadCount.count}
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
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
  );
}