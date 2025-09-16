"use client";

import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Home,
  Users,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface SidebarProps {
  userMenu: React.ReactNode;
  children: React.ReactNode;
}

export function Sidebar({ userMenu, children }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showText, setShowText] = useState(true);

  useEffect(() => {
    if (!isCollapsed) {
      // Delay showing text until sidebar animation completes
      const timer = setTimeout(() => {
        setShowText(true);
      }, 200); // Match this with the sidebar transition duration
      return () => clearTimeout(timer);
    } else {
      // Hide text immediately when collapsing
      setShowText(false);
    }
  }, [isCollapsed]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden min-h-screen border-r border-gray-200 bg-white transition-all duration-200 lg:block",
          isCollapsed ? "w-16" : "w-48",
        )}
      >
        <div className="sticky top-0 p-4">
          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-6 -right-3 z-10 h-6 w-6 rounded-full border bg-white shadow-md hover:shadow-lg"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>

          {/* Logo */}
          <div
            className={cn(
              "mb-8 flex justify-center transition-all duration-300",
              isCollapsed && "mb-4",
            )}
          >
            {isCollapsed ? (
              <Image
                src="/logo.png"
                alt="Birdseye Checkers"
                width={40}
                height={40}
                className="h-8 w-8 object-contain"
                priority
              />
            ) : (
              <Image
                src="/logo.png"
                alt="Birdseye Checkers"
                width={300}
                height={100}
                className="h-auto w-full max-w-[220px]"
                priority
              />
            )}
          </div>

          {/* User Menu */}
          <div
            className={cn(
              "mb-8 transition-all duration-300",
              isCollapsed && "mb-4",
            )}
          >
            {userMenu}
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-primary/10",
                isCollapsed && "justify-center px-2",
              )}
              title={isCollapsed ? "Home" : undefined}
            >
              <Home className="h-4 w-4 flex-shrink-0 text-primary-700" />
              {!isCollapsed && (
                <span
                  className={cn(
                    "text-sm transition-opacity duration-300",
                    showText ? "opacity-100" : "opacity-0",
                  )}
                >
                  Home
                </span>
              )}
            </Link>

            {!isCollapsed && (
              <h3
                className={cn(
                  "mt-4 mb-2 px-3 text-xs font-semibold tracking-wider text-gray-500 uppercase transition-opacity duration-300",
                  showText ? "opacity-100" : "opacity-0",
                )}
              >
                Quick Play
              </h3>
            )}

            <Link
              href="/game/local"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-primary/10",
                isCollapsed && "justify-center px-2",
              )}
              title={isCollapsed ? "Local Game" : undefined}
            >
              <Users className="h-4 w-4 flex-shrink-0 text-primary-700" />
              {!isCollapsed && (
                <span
                  className={cn(
                    "text-sm transition-opacity duration-300",
                    showText ? "opacity-100" : "opacity-0",
                  )}
                >
                  Local Game
                </span>
              )}
            </Link>

            <Link
              href="/game/bot"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-primary/10",
                isCollapsed && "justify-center px-2",
              )}
              title={isCollapsed ? "Play Bot" : undefined}
            >
              <Bot className="h-4 w-4 flex-shrink-0 text-primary-700" />
              {!isCollapsed && (
                <span
                  className={cn(
                    "text-sm transition-opacity duration-300",
                    showText ? "opacity-100" : "opacity-0",
                  )}
                >
                  Play Bot
                </span>
              )}
            </Link>

            <Link
              href="/game/online"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-primary/10",
                isCollapsed && "justify-center px-2",
              )}
              title={isCollapsed ? "Online Friend" : undefined}
            >
              <Wifi className="h-4 w-4 flex-shrink-0 text-primary-700" />
              {!isCollapsed && (
                <span
                  className={cn(
                    "text-sm transition-opacity duration-300",
                    showText ? "opacity-100" : "opacity-0",
                  )}
                >
                  Online Friend
                </span>
              )}
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-200",
          isCollapsed ? "lg:ml-16" : "",
        )}
      >
        {children}
      </main>
    </>
  );
}
