"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Bot,
  Wifi,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import {
  sidebarCollapse,
  staggerContainer,
  staggerItem,
} from "~/lib/motion/variants";

interface MotionSidebarProps {
  userMenu: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Animated Sidebar component with smooth collapse/expand animations
 * Features staggered menu items and width transitions
 */
export function MotionSidebar({ userMenu, children }: MotionSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showText, setShowText] = useState(true);

  useEffect(() => {
    if (!isCollapsed) {
      // Delay showing text until sidebar animation completes
      const timer = setTimeout(() => {
        setShowText(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      // Hide text immediately when collapsing
      setShowText(false);
    }
  }, [isCollapsed]);

  const menuItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Bot, label: "Single Player", href: "/game" },
    { icon: Users, label: "Multiplayer", href: "/multiplayer" },
    { icon: Wifi, label: "Online Play", href: "/online" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <m.aside
        className="hidden min-h-screen border-r border-gray-200 bg-white lg:block"
        variants={sidebarCollapse}
        initial={false}
        animate={isCollapsed ? "collapsed" : "expanded"}
      >
        <div className="sticky top-0 p-4">
          {/* Toggle Button */}
          <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "mb-6 transition-all duration-200",
                isCollapsed ? "mx-auto" : "ml-auto",
              )}
            >
              <m.div
                animate={{ rotate: isCollapsed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </m.div>
            </Button>
          </m.div>

          {/* Logo */}
          <Link href="/" className="mb-8 block">
            <m.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <m.div
                animate={{
                  width: isCollapsed ? 32 : 40,
                  height: isCollapsed ? 32 : 40,
                }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  src="/logo.svg"
                  alt="Checkers"
                  width={40}
                  height={40}
                  className="h-full w-full"
                />
              </m.div>
              <AnimatePresence mode="wait">
                {showText && !isCollapsed && (
                  <m.span
                    className="text-lg font-bold text-gray-900"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    Checkers
                  </m.span>
                )}
              </AnimatePresence>
            </m.div>
          </Link>

          {/* Navigation */}
          <m.nav
            className="space-y-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {menuItems.map((item, index) => (
              <m.div key={item.href} variants={staggerItem} custom={index}>
                <Link href={item.href}>
                  <m.div
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                      isCollapsed && "justify-center",
                    )}
                    whileHover={{ x: isCollapsed ? 0 : 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <item.icon
                      className={cn(
                        "transition-all duration-200",
                        isCollapsed ? "h-5 w-5" : "h-4 w-4",
                      )}
                    />
                    <AnimatePresence mode="wait">
                      {showText && !isCollapsed && (
                        <m.span
                          className="text-sm font-medium"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.label}
                        </m.span>
                      )}
                    </AnimatePresence>
                  </m.div>
                </Link>
              </m.div>
            ))}
          </m.nav>

          {/* User Menu */}
          <m.div
            className={cn(
              "mt-8 border-t border-gray-200 pt-8",
              isCollapsed && "flex justify-center",
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {userMenu}
          </m.div>
        </div>
      </m.aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white lg:hidden">
        <div className="flex items-center justify-around py-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <m.div
                className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-gray-900"
                whileTap={{ scale: 0.9 }}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </m.div>
            </Link>
          ))}
          <div className="flex flex-col items-center gap-1 p-2">{userMenu}</div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-16 lg:ml-0 lg:pb-0">{children}</main>
    </>
  );
}
