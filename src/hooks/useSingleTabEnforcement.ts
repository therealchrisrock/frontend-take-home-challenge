import { useEffect, useState, useRef } from "react";

interface SingleTabState {
  isActiveTab: boolean;
  hasOtherTabs: boolean;
}

/**
 * Simple single-tab enforcement using localStorage
 * Prevents multiple tabs from opening the same game
 */
export function useSingleTabEnforcement(gameId?: string) {
  const [state, setState] = useState<SingleTabState>({
    isActiveTab: true,
    hasOtherTabs: false,
  });

  const tabIdRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!gameId || typeof window === "undefined") return;

    // Generate unique tab ID
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    tabIdRef.current = tabId;

    const storageKey = `game_active_tab_${gameId}`;

    // Function to check if we're the active tab
    const checkActiveStatus = () => {
      const currentActive = localStorage.getItem(storageKey);

      if (!currentActive) {
        // No active tab, claim it
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            tabId,
            timestamp: Date.now(),
          }),
        );
        return { isActive: true, hasOthers: false };
      }

      try {
        const data = JSON.parse(currentActive) as {
          tabId: string;
          timestamp: number;
        };
        const age = Date.now() - data.timestamp;

        // If the active tab hasn't updated in 3 seconds, it's probably closed
        if (age > 3000) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              tabId,
              timestamp: Date.now(),
            }),
          );
          return { isActive: true, hasOthers: false };
        }

        // Check if we're the active tab
        const isActive = data.tabId === tabId;
        return { isActive, hasOthers: !isActive };
      } catch (_e) {
        // Invalid data, claim the tab
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            tabId,
            timestamp: Date.now(),
          }),
        );
        return { isActive: true, hasOthers: false };
      }
    };

    // Initial check
    const initial = checkActiveStatus();
    setState({
      isActiveTab: initial.isActive,
      hasOtherTabs: initial.hasOthers,
    });

    // If we're active, update timestamp regularly
    if (initial.isActive) {
      intervalRef.current = setInterval(() => {
        const currentActive = localStorage.getItem(storageKey);
        if (currentActive) {
          try {
            const data = JSON.parse(currentActive) as {
              tabId: string;
              timestamp: number;
            };
            if (data.tabId === tabId) {
              localStorage.setItem(
                storageKey,
                JSON.stringify({
                  tabId,
                  timestamp: Date.now(),
                }),
              );
            }
          } catch (_e) {
            // Ignore errors
          }
        }
      }, 1000);
    }

    // Listen for storage events (other tabs claiming active status)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        const status = checkActiveStatus();
        setState({
          isActiveTab: status.isActive,
          hasOtherTabs: status.hasOthers,
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Cleanup
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Remove our claim if we're the active tab
      const current = localStorage.getItem(storageKey);
      if (current) {
        try {
          const data = JSON.parse(current) as {
            tabId: string;
            timestamp: number;
          };
          if (data.tabId === tabIdRef.current) {
            localStorage.removeItem(storageKey);
          }
        } catch (_e) {
          // Ignore errors
        }
      }
    };

    // Cleanup on unmount or when tab closes
    window.addEventListener("beforeunload", cleanup);

    return () => {
      cleanup();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("beforeunload", cleanup);
    };
  }, [gameId]); // Only depend on gameId

  return state;
}
