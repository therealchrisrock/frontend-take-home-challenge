"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { api } from "~/trpc/react";

const HEARTBEAT_INTERVAL = 10 * 1000; // 10 seconds
const ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity before stopping heartbeat

export function usePresenceHeartbeat() {
  const { data: session } = useSession();
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updatePresenceMutation = api.user.updatePresence.useMutation();
  const mutateRef = useRef(updatePresenceMutation.mutate);

  // Keep a stable reference to mutate to avoid effect thrashing
  useEffect(() => {
    mutateRef.current = updatePresenceMutation.mutate;
  }, [updatePresenceMutation.mutate]);

  // Track user activity
  useEffect(() => {
    if (!session?.user) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Activity events to track
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "focus",
      "visibilitychange",
    ];

    // Add event listeners
    events.forEach((event) => {
      if (event === "visibilitychange") {
        document.addEventListener(event, updateActivity);
      } else {
        window.addEventListener(event, updateActivity);
      }
    });

    // Initial activity update
    updateActivity();

    // Cleanup
    return () => {
      events.forEach((event) => {
        if (event === "visibilitychange") {
          document.removeEventListener(event, updateActivity);
        } else {
          window.removeEventListener(event, updateActivity);
        }
      });
    };
  }, [session?.user]);

  // Heartbeat system
  useEffect(() => {
    if (!session?.user) return;

    const sendHeartbeat = () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;

      // Only send heartbeat if user was recently active
      if (
        timeSinceActivity < ACTIVITY_TIMEOUT &&
        typeof document !== "undefined" &&
        !document.hidden &&
        typeof navigator !== "undefined" &&
        navigator.onLine
      ) {
        mutateRef.current();
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL,
    );

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [session?.user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);
}
