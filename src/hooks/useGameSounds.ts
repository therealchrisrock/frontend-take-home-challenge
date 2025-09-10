"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseGameSoundsOptions {
  enabled?: boolean;
  volume?: number;
}

export function useGameSounds(options: UseGameSoundsOptions = {}) {
  const { enabled = true, volume = 0.5 } = options;

  type SoundKey = "capture" | "startGame" | "move" | "king" | "complete";
  const SOUND_FILES: Record<SoundKey, string> = {
    capture: "capture",
    startGame: "start-game",
    move: "move",
    king: "king",
    complete: "complete",
  };

  // Create audio elements with a single map of refs
  const audioRefs = useRef<Record<SoundKey, HTMLAudioElement | null>>({
    capture: null,
    startGame: null,
    move: null,
    king: null,
    complete: null,
  });
  const isInitializedRef = useRef(false);

  // Initialize audio elements on mount
  useEffect(() => {
    if (!isInitializedRef.current && typeof window !== "undefined") {
      const testAudio = new Audio();
      const canPlayM4A =
        testAudio.canPlayType("audio/mp4") ||
        testAudio.canPlayType("audio/x-m4a");

      (Object.keys(SOUND_FILES) as SoundKey[]).forEach((key) => {
        const base = SOUND_FILES[key];
        const audio = new Audio();
        audio.src = canPlayM4A ? `/${base}.m4a` : `/${base}.mp3`;
        audio.volume = volume;
        audio.preload = "auto";
        audioRefs.current[key] = audio;
      });

      isInitializedRef.current = true;
    }

    // Cleanup on unmount
    return () => {
      (Object.keys(SOUND_FILES) as SoundKey[]).forEach((key) => {
        const ref = audioRefs.current[key];
        if (ref) {
          ref.pause();
          audioRefs.current[key] = null;
        }
      });
      isInitializedRef.current = false;
    };
  }, [volume]);

  // Update volume when it changes
  useEffect(() => {
    (Object.keys(SOUND_FILES) as SoundKey[]).forEach((key) => {
      const ref = audioRefs.current[key];
      if (ref) ref.volume = volume;
    });
  }, [volume]);

  const play = useCallback(
    (key: SoundKey) => {
      if (!enabled) return;
      const audio = audioRefs.current[key];
      if (!audio) return;
      try {
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.debug("Audio play prevented:", error);
          });
        }
      } catch (error) {
        console.debug("Error playing sound:", error);
      }
    },
    [enabled],
  );

  const playCapture = useCallback(() => play("capture"), [play]);
  const playStartGame = useCallback(() => play("startGame"), [play]);
  const playMove = useCallback(() => play("move"), [play]);
  const playKing = useCallback(() => play("king"), [play]);
  const playComplete = useCallback(() => play("complete"), [play]);

  return {
    playCapture,
    playStartGame,
    playMove,
    playKing,
    playComplete,
  };
}
