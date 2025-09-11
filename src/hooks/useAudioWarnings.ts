"use client";

import { useEffect, useRef, useCallback } from "react";
import { type TimeState, type PieceColor } from "~/lib/game/time-control-types";

interface UseAudioWarningsOptions {
  /** Whether audio warnings are enabled */
  enabled: boolean;
  /** Time state to monitor */
  timeState: TimeState;
  /** Volume level (0-1) */
  volume?: number;
  /** Custom warning thresholds in milliseconds */
  thresholds?: number[];
}

interface UseAudioWarningsReturn {
  /** Play a warning sound manually */
  playWarning: (type: "low" | "critical" | "urgent" | "tick") => void;
  /** Whether audio is supported */
  isSupported: boolean;
}

const WARNING_SOUNDS = {
  low: { frequency: 800, duration: 200 }, // Gentle beep
  critical: { frequency: 1000, duration: 300 }, // More urgent
  urgent: { frequency: 1200, duration: 400 }, // Very urgent
  tick: { frequency: 600, duration: 100 }, // Quick tick for final seconds
} as const;

// Default thresholds for audio warnings (in milliseconds)
const DEFAULT_THRESHOLDS = [10000, 5000, 3000, 2000, 1000]; // 10s, 5s, 3s, 2s, 1s

export function useAudioWarnings({
  enabled,
  timeState,
  volume = 0.3,
  thresholds = DEFAULT_THRESHOLDS,
}: UseAudioWarningsOptions): UseAudioWarningsReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastWarningTimeRef = useRef<Record<PieceColor, number>>({
    red: 0,
    black: 0,
  });
  const playedWarningsRef = useRef<Record<PieceColor, Set<number>>>({
    red: new Set(),
    black: new Set(),
  });

  // Initialize audio context
  const initializeAudio = useCallback(() => {
    if (audioContextRef.current || !enabled) return;

    try {
      audioContextRef.current = new (window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)();
    } catch (error) {
      console.warn("Audio context not supported:", error);
    }
  }, [enabled]);

  // Play a synthesized beep sound
  const playBeep = useCallback(
    (frequency: number, duration: number) => {
      if (!audioContextRef.current || !enabled) return;

      try {
        const context = audioContextRef.current;

        // Create oscillator and gain nodes
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        // Configure oscillator
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        oscillator.type = "sine";

        // Configure gain (volume with fade out)
        gainNode.gain.setValueAtTime(volume, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          context.currentTime + duration / 1000,
        );

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        // Play sound
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + duration / 1000);
      } catch (error) {
        console.warn("Failed to play audio warning:", error);
      }
    },
    [enabled, volume],
  );

  // Play warning sound
  const playWarning = useCallback(
    (type: keyof typeof WARNING_SOUNDS) => {
      const sound = WARNING_SOUNDS[type];
      playBeep(sound.frequency, sound.duration);
    },
    [playBeep],
  );

  // Check if we should play a warning for the current time
  const checkAndPlayWarnings = useCallback(() => {
    if (!enabled || !timeState.activePlayer || timeState.isPaused) {
      return;
    }

    const activePlayer = timeState.activePlayer;
    const remainingTime =
      activePlayer === "red" ? timeState.redTime : timeState.blackTime;

    // Reset warnings if time increased (e.g., after increment)
    const lastTime = lastWarningTimeRef.current[activePlayer];
    if (remainingTime > lastTime) {
      playedWarningsRef.current[activePlayer].clear();
    }
    lastWarningTimeRef.current[activePlayer] = remainingTime;

    // Check each threshold
    for (const threshold of thresholds) {
      if (
        remainingTime <= threshold &&
        !playedWarningsRef.current[activePlayer].has(threshold)
      ) {
        playedWarningsRef.current[activePlayer].add(threshold);

        // Determine warning type based on threshold
        if (threshold <= 1000) {
          playWarning("urgent");
        } else if (threshold <= 3000) {
          playWarning("critical");
        } else if (threshold <= 5000) {
          playWarning("critical");
        } else {
          playWarning("low");
        }

        // For final countdown, play tick sounds
        if (threshold <= 5000 && threshold > 1000) {
          // Play additional tick for dramatic effect
          setTimeout(() => playWarning("tick"), 100);
        }

        break; // Only play one warning per check
      }
    }
  }, [enabled, timeState, thresholds, playWarning]);

  // Initialize audio on user interaction (required by browsers)
  useEffect(() => {
    if (!enabled) return;

    const handleUserInteraction = () => {
      initializeAudio();
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, [enabled, initializeAudio]);

  // Monitor time changes and play warnings
  useEffect(() => {
    checkAndPlayWarnings();
  }, [
    timeState.redTime,
    timeState.blackTime,
    timeState.activePlayer,
    checkAndPlayWarnings,
  ]);

  // Reset warnings when game resets
  useEffect(() => {
    if (timeState.redTime > 30000 && timeState.blackTime > 30000) {
      // Game likely reset, clear warning state
      playedWarningsRef.current.red.clear();
      playedWarningsRef.current.black.clear();
      lastWarningTimeRef.current = { red: 0, black: 0 };
    }
  }, [timeState.redTime, timeState.blackTime]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    !!(window.AudioContext ||
      (window as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext);

  return {
    playWarning,
    isSupported,
  };
}
