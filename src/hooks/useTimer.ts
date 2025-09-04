'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  type TimeState,
  type TimeControl,
  type PieceColor,
  createInitialTimeState,
  isTimeExpired
} from '~/lib/time-control-types';

interface UseTimerOptions {
  /** Time control configuration */
  timeControl: TimeControl | null;
  /** Callback when time expires for a player */
  onTimeExpired?: (player: PieceColor) => void;
  /** Callback for time state updates */
  onTimeUpdate?: (timeState: TimeState) => void;
  /** Update frequency in milliseconds */
  updateInterval?: number;
}

interface UseTimerReturn {
  /** Current time state */
  timeState: TimeState;
  /** Start timer for specified player */
  startTimer: (player: PieceColor) => void;
  /** Stop current timer */
  stopTimer: () => void;
  /** Pause/resume timer */
  pauseTimer: () => void;
  /** Resume timer */
  resumeTimer: () => void;
  /** Add increment to specified player */
  addIncrement: (player: PieceColor) => void;
  /** Reset timers to initial state */
  resetTimers: () => void;
  /** Set time state (for sync) */
  setTimeState: (state: TimeState) => void;
  /** Get current turn duration */
  getCurrentTurnTime: () => number;
  /** Whether timer is running */
  isRunning: boolean;
}

export function useTimer({
  timeControl,
  onTimeExpired,
  onTimeUpdate,
  updateInterval = 100 // 100ms for smooth updates
}: UseTimerOptions): UseTimerReturn {
  
  // Initialize time state
  const [timeState, setTimeStateInternal] = useState<TimeState>(() => 
    timeControl ? createInitialTimeState(timeControl) : {
      redTime: 0,
      blackTime: 0,
      activePlayer: null,
      isPaused: false,
      lastUpdateTime: Date.now(),
      turnStartTime: null
    }
  );

  // Track animation frame and interval refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const isRunning = Boolean(timeState.activePlayer && !timeState.isPaused);

  // Store callback in ref to avoid dependency issues
  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Update time state and notify listeners
  const updateTimeState = useCallback((newState: TimeState) => {
    setTimeStateInternal(newState);
    onTimeUpdateRef.current?.(newState);
  }, []); // No dependencies to avoid infinite loops

  // Calculate elapsed time since last update
  const calculateElapsedTime = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    lastUpdateRef.current = now;
    return elapsed;
  }, []);

  // Timer tick function
  const tick = useCallback(() => {
    if (!timeControl || !timeState.activePlayer || timeState.isPaused) {
      return;
    }

    const elapsed = calculateElapsedTime();
    const newTimeState = { ...timeState };
    
    // Subtract elapsed time from active player
    if (timeState.activePlayer === 'red') {
      newTimeState.redTime = Math.max(0, timeState.redTime - elapsed);
    } else {
      newTimeState.blackTime = Math.max(0, timeState.blackTime - elapsed);
    }
    
    newTimeState.lastUpdateTime = Date.now();
    
    // Check for time expiration
    if (isTimeExpired(newTimeState, timeState.activePlayer)) {
      newTimeState.activePlayer = null;
      newTimeState.isPaused = true;
      newTimeState.turnStartTime = null;
      
      // Clear interval to stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Notify time expiration
      onTimeExpired?.(timeState.activePlayer);
    }
    
    updateTimeState(newTimeState);
  }, [timeState, timeControl, calculateElapsedTime, updateTimeState, onTimeExpired]);

  // Start timer for specified player
  const startTimer = useCallback((player: PieceColor) => {
    if (!timeControl) return;
    
    // Stop existing timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const now = Date.now();
    lastUpdateRef.current = now;
    
    const newTimeState: TimeState = {
      ...timeState,
      activePlayer: player,
      isPaused: false,
      turnStartTime: now,
      lastUpdateTime: now
    };
    
    updateTimeState(newTimeState);
    
    // Start new interval
    intervalRef.current = setInterval(tick, updateInterval);
  }, [timeControl, timeState, updateTimeState, tick, updateInterval]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    const newTimeState: TimeState = {
      ...timeState,
      activePlayer: null,
      isPaused: false,
      turnStartTime: null,
      lastUpdateTime: Date.now()
    };
    
    updateTimeState(newTimeState);
  }, [timeState, updateTimeState]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (!timeState.activePlayer) return;
    
    // Perform final tick to account for time up to pause
    if (!timeState.isPaused) {
      const elapsed = calculateElapsedTime();
      const newTimeState = { ...timeState };
      
      if (timeState.activePlayer === 'red') {
        newTimeState.redTime = Math.max(0, timeState.redTime - elapsed);
      } else {
        newTimeState.blackTime = Math.max(0, timeState.blackTime - elapsed);
      }
      
      newTimeState.isPaused = true;
      newTimeState.lastUpdateTime = Date.now();
      
      updateTimeState(newTimeState);
    }
    
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [timeState, updateTimeState, calculateElapsedTime]);

  // Resume timer
  const resumeTimer = useCallback(() => {
    if (!timeState.activePlayer || !timeState.isPaused) return;
    
    const now = Date.now();
    lastUpdateRef.current = now;
    
    const newTimeState: TimeState = {
      ...timeState,
      isPaused: false,
      lastUpdateTime: now
    };
    
    updateTimeState(newTimeState);
    
    // Restart interval
    intervalRef.current = setInterval(tick, updateInterval);
  }, [timeState, updateTimeState, tick, updateInterval]);

  // Add increment to specified player
  const addIncrement = useCallback((player: PieceColor) => {
    if (!timeControl || timeControl.incrementSeconds === 0) return;
    
    const incrementMs = timeControl.incrementSeconds * 1000;
    const newTimeState = { ...timeState };
    
    if (player === 'red') {
      newTimeState.redTime += incrementMs;
    } else {
      newTimeState.blackTime += incrementMs;
    }
    
    newTimeState.lastUpdateTime = Date.now();
    updateTimeState(newTimeState);
  }, [timeControl, timeState, updateTimeState]);

  // Reset timers
  const resetTimers = useCallback(() => {
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    const newTimeState = timeControl 
      ? createInitialTimeState(timeControl)
      : {
          redTime: 0,
          blackTime: 0,
          activePlayer: null,
          isPaused: false,
          lastUpdateTime: Date.now(),
          turnStartTime: null
        };
    
    updateTimeState(newTimeState);
  }, [timeControl, updateTimeState]);

  // Set time state (for synchronization)
  const setTimeState = useCallback((state: TimeState) => {
    // Update internal state
    updateTimeState(state);
    
    // Update refs
    lastUpdateRef.current = state.lastUpdateTime;
    
    // Handle timer interval based on new state
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (state.activePlayer && !state.isPaused && timeControl) {
      intervalRef.current = setInterval(tick, updateInterval);
    }
  }, [updateTimeState, timeControl, tick, updateInterval]);

  // Get current turn duration
  const getCurrentTurnTime = useCallback(() => {
    if (!timeState.turnStartTime) return 0;
    return Date.now() - timeState.turnStartTime;
  }, [timeState.turnStartTime]);

  // Handle page visibility changes (pause when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning) {
        pauseTimer();
      } else if (!document.hidden && timeState.isPaused && timeState.activePlayer) {
        // Auto-resume if we were paused due to visibility
        resumeTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, timeState.isPaused, timeState.activePlayer, pauseTimer, resumeTimer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Reset timers when time control changes
  useEffect(() => {
    if (!timeControl) {
      const newTimeState: TimeState = {
        isRunning: false,
        redTime: 0,
        blackTime: 0,
        activePlayer: null,
        isPaused: false,
        lastUpdateTime: Date.now(),
        turnStartTime: null
      };
      updateTimeState(newTimeState);
    } else {
      const newTimeState: TimeState = {
        isRunning: false,
        redTime: timeControl.initialTime * 1000,
        blackTime: timeControl.initialTime * 1000,
        activePlayer: null,
        isPaused: false,
        lastUpdateTime: Date.now(),
        turnStartTime: null
      };
      updateTimeState(newTimeState);
    }
  }, [timeControl, updateTimeState]); // Now updateTimeState is stable

  return {
    timeState,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    addIncrement,
    resetTimers,
    setTimeState,
    getCurrentTurnTime,
    isRunning
  };
}