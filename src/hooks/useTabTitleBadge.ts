"use client";

import { useEffect } from "react";

interface UseTabTitleBadgeOptions {
  unreadCount: number;
  baseTitle?: string;
}

export function useTabTitleBadge({ 
  unreadCount, 
  baseTitle = "Birdseye Checkers" 
}: UseTabTitleBadgeOptions) {
  useEffect(() => {
    const updateTitle = () => {
      if (typeof document === "undefined") return;
      
      if (unreadCount > 0) {
        document.title = `(${unreadCount > 99 ? "99+" : unreadCount}) ${baseTitle}`;
      } else {
        document.title = baseTitle;
      }
    };

    updateTitle();

    // Cleanup on unmount - restore original title
    return () => {
      if (typeof document !== "undefined") {
        document.title = baseTitle;
      }
    };
  }, [unreadCount, baseTitle]);
}