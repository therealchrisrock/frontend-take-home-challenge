"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Users, 
  Bot, 
  Wifi,
  Home,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

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
      <aside className={cn(
        "hidden lg:block bg-white border-r border-gray-200 min-h-screen transition-all duration-200",
        isCollapsed ? "w-16" : "w-48"
      )}>
        <div className="sticky top-0 p-4">
          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-white shadow-md hover:shadow-lg"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>

          {/* Logo */}
          <div className={cn(
            "flex justify-center mb-8 transition-all duration-300",
            isCollapsed && "mb-4"
          )}>
            {isCollapsed ? (
              <Image 
                src="/logo.png" 
                alt="Birdseye Checkers" 
                width={40}
                height={40}
                className="w-8 h-8 object-contain"
                priority
              />
            ) : (
              <Image 
                src="/logo.png" 
                alt="Birdseye Checkers" 
                width={300}
                height={100}
                className="w-full max-w-[220px] h-auto"
                priority
              />
            )}
          </div>

          {/* User Menu */}
          <div className={cn(
            "mb-8 transition-all duration-300",
            isCollapsed && "mb-4"
          )}>
            {userMenu}
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <Link 
              href="/" 
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? "Home" : undefined}
            >
              <Home className="w-4 h-4 text-amber-700 flex-shrink-0" />
              {!isCollapsed && (
                <span className={cn(
                  "text-sm transition-opacity duration-300",
                  showText ? "opacity-100" : "opacity-0"
                )}>
                  Home
                </span>
              )}
            </Link>
            
            {!isCollapsed && (
              <h3 className={cn(
                "text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2 px-3 transition-opacity duration-300",
                showText ? "opacity-100" : "opacity-0"
              )}>
                Quick Play
              </h3>
            )}
            
            <Link 
              href="/game/local" 
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? "Local Game" : undefined}
            >
              <Users className="w-4 h-4 text-amber-700 flex-shrink-0" />
              {!isCollapsed && (
                <span className={cn(
                  "text-sm transition-opacity duration-300",
                  showText ? "opacity-100" : "opacity-0"
                )}>
                  Local Game
                </span>
              )}
            </Link>

            <Link 
              href="/game/bot" 
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? "Play Bot" : undefined}
            >
              <Bot className="w-4 h-4 text-amber-700 flex-shrink-0" />
              {!isCollapsed && (
                <span className={cn(
                  "text-sm transition-opacity duration-300",
                  showText ? "opacity-100" : "opacity-0"
                )}>
                  Play Bot
                </span>
              )}
            </Link>

            <Link 
              href="/game/friend" 
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? "Online Friend" : undefined}
            >
              <Wifi className="w-4 h-4 text-amber-700 flex-shrink-0" />
              {!isCollapsed && (
                <span className={cn(
                  "text-sm transition-opacity duration-300",
                  showText ? "opacity-100" : "opacity-0"
                )}>
                  Online Friend
                </span>
              )}
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-200",
        isCollapsed ? "lg:ml-16" : ""
      )}>
        {children}
      </main>
    </>
  );
}