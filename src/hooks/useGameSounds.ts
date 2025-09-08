'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseGameSoundsOptions {
  enabled?: boolean;
  volume?: number;
}

export function useGameSounds(options: UseGameSoundsOptions = {}) {
  const { enabled = true, volume = 0.5 } = options;
  
  // Create audio elements with refs
  const captureAudioRef = useRef<HTMLAudioElement | null>(null);
  const startGameAudioRef = useRef<HTMLAudioElement | null>(null);
  const moveAudioRef = useRef<HTMLAudioElement | null>(null);
  const isInitializedRef = useRef(false);
  
  // Initialize audio elements on mount
  useEffect(() => {
    if (!isInitializedRef.current && typeof window !== 'undefined') {
      // Check for m4a support
      const testAudio = new Audio();
      const canPlayM4A = testAudio.canPlayType('audio/mp4') || testAudio.canPlayType('audio/x-m4a');
      
      // Create capture sound audio element
      const captureAudio = new Audio();
      captureAudio.src = canPlayM4A ? '/capture.m4a' : '/capture.mp3';
      captureAudio.volume = volume;
      captureAudio.preload = 'auto';
      captureAudioRef.current = captureAudio;
      
      // Create start game sound audio element
      const startGameAudio = new Audio();
      startGameAudio.src = canPlayM4A ? '/start-game.m4a' : '/start-game.mp3';
      startGameAudio.volume = volume;
      startGameAudio.preload = 'auto';
      startGameAudioRef.current = startGameAudio;
      
      // Create move sound audio element
      const moveAudio = new Audio();
      moveAudio.src = canPlayM4A ? '/move.m4a' : '/move.mp3';
      moveAudio.volume = volume;
      moveAudio.preload = 'auto';
      moveAudioRef.current = moveAudio;
      
      isInitializedRef.current = true;
    }
    
    // Cleanup on unmount
    return () => {
      if (captureAudioRef.current) {
        captureAudioRef.current.pause();
        captureAudioRef.current = null;
      }
      if (startGameAudioRef.current) {
        startGameAudioRef.current.pause();
        startGameAudioRef.current = null;
      }
      if (moveAudioRef.current) {
        moveAudioRef.current.pause();
        moveAudioRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [volume]);
  
  // Update volume when it changes
  useEffect(() => {
    if (captureAudioRef.current) {
      captureAudioRef.current.volume = volume;
    }
    if (startGameAudioRef.current) {
      startGameAudioRef.current.volume = volume;
    }
    if (moveAudioRef.current) {
      moveAudioRef.current.volume = volume;
    }
  }, [volume]);
  
  // Play capture sound
  const playCapture = useCallback(() => {
    if (!enabled || !captureAudioRef.current) return;
    
    try {
      // Reset the audio to start and play
      captureAudioRef.current.currentTime = 0;
      const playPromise = captureAudioRef.current.play();
      
      // Handle play promise to avoid console errors
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Auto-play was prevented or other error
          console.debug('Audio play prevented:', error);
        });
      }
    } catch (error) {
      console.debug('Error playing capture sound:', error);
    }
  }, [enabled]);
  
  // Play start game sound
  const playStartGame = useCallback(() => {
    if (!enabled || !startGameAudioRef.current) return;
    
    try {
      // Reset the audio to start and play
      startGameAudioRef.current.currentTime = 0;
      const playPromise = startGameAudioRef.current.play();
      
      // Handle play promise to avoid console errors
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Auto-play was prevented or other error
          console.debug('Audio play prevented:', error);
        });
      }
    } catch (error) {
      console.debug('Error playing start game sound:', error);
    }
  }, [enabled]);
  
  // Play move sound
  const playMove = useCallback(() => {
    if (!enabled || !moveAudioRef.current) return;
    
    try {
      // Reset the audio to start and play
      moveAudioRef.current.currentTime = 0;
      const playPromise = moveAudioRef.current.play();
      
      // Handle play promise to avoid console errors
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Auto-play was prevented or other error
          console.debug('Audio play prevented:', error);
        });
      }
    } catch (error) {
      console.debug('Error playing move sound:', error);
    }
  }, [enabled]);
  
  return {
    playCapture,
    playStartGame,
    playMove,
  };
}