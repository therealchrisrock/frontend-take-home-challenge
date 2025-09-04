import type { PieceColor } from './game-logic';

// Re-export PieceColor for convenience
export type { PieceColor } from './game-logic';

/**
 * Time control configuration for a game
 */
export interface TimeControl {
  /** Display format preference */
  format: 'X|Y' | 'X+Y';
  /** Starting time in minutes */
  initialMinutes: number;
  /** Seconds added per move (increment) */
  incrementSeconds: number;
  /** Preset type or custom */
  preset?: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'custom';
}

/**
 * Current time state for both players
 */
export interface TimeState {
  /** Red player's remaining time in milliseconds */
  redTime: number;
  /** Black player's remaining time in milliseconds */
  blackTime: number;
  /** Which player's clock is currently running */
  activePlayer: PieceColor | null;
  /** Whether the timers are paused */
  isPaused: boolean;
  /** Timestamp when time was last updated (for sync) */
  lastUpdateTime: number;
  /** Timestamp when current player's turn started */
  turnStartTime: number | null;
}

/**
 * Move with timing information
 */
export interface TimedMove {
  /** Standard move information */
  from: { row: number; col: number };
  to: { row: number; col: number };
  captures?: { row: number; col: number }[];
  /** Time spent thinking on this move (milliseconds) */
  timeSpent: number;
  /** Time remaining after making this move (milliseconds) */
  timeRemaining: number;
}

/**
 * Time control presets
 */
export const TIME_CONTROL_PRESETS: Record<string, TimeControl> = {
  bullet: {
    format: 'X|Y',
    initialMinutes: 1,
    incrementSeconds: 0,
    preset: 'bullet'
  },
  blitz: {
    format: 'X|Y',
    initialMinutes: 5,
    incrementSeconds: 0,
    preset: 'blitz'
  },
  rapid: {
    format: 'X|Y',
    initialMinutes: 10,
    incrementSeconds: 5,
    preset: 'rapid'
  },
  classical: {
    format: 'X|Y',
    initialMinutes: 30,
    incrementSeconds: 0,
    preset: 'classical'
  }
} as const;

/**
 * Time warning levels
 */
export interface TimeWarning {
  /** Warning level */
  level: 'low' | 'critical' | 'urgent';
  /** Threshold in milliseconds */
  threshold: number;
  /** Visual indicator */
  color: string;
  /** Audio warning enabled */
  playSound: boolean;
}

/**
 * Default warning thresholds
 */
export const DEFAULT_TIME_WARNINGS: TimeWarning[] = [
  {
    level: 'low',
    threshold: 30000, // 30 seconds
    color: 'orange',
    playSound: false
  },
  {
    level: 'critical',
    threshold: 10000, // 10 seconds
    color: 'red',
    playSound: true
  },
  {
    level: 'urgent',
    threshold: 5000, // 5 seconds
    color: 'red',
    playSound: true
  }
];

/**
 * Time control settings with preferences
 */
export interface TimeControlSettings {
  /** Current time control configuration */
  timeControl: TimeControl | null;
  /** Audio warnings enabled */
  audioWarnings: boolean;
  /** Custom warning thresholds */
  warnings: TimeWarning[];
  /** Auto-pause on tab blur */
  autoPause: boolean;
}

/**
 * Helper function to format time in MM:SS or SS.T format
 */
export function formatTime(milliseconds: number, showTenths = false): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  
  if (totalSeconds < 60 && showTenths) {
    const tenths = Math.floor((milliseconds % 1000) / 100);
    return `${totalSeconds}.${tenths}`;
  }
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse time control string in X|Y or X+Y format
 */
export function parseTimeControl(input: string): TimeControl | null {
  const trimmed = input.trim();
  
  // Match X|Y format
  const pipeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\|(\d+)$/);
  if (pipeMatch) {
    return {
      format: 'X|Y',
      initialMinutes: parseFloat(pipeMatch[1]!),
      incrementSeconds: parseInt(pipeMatch[2]!, 10),
      preset: 'custom'
    };
  }
  
  // Match X+Y format
  const plusMatch = trimmed.match(/^(\d+(?:\.\d+)?)\+(\d+)$/);
  if (plusMatch) {
    return {
      format: 'X+Y',
      initialMinutes: parseFloat(plusMatch[1]!),
      incrementSeconds: parseInt(plusMatch[2]!, 10),
      preset: 'custom'
    };
  }
  
  return null;
}

/**
 * Validate time control configuration
 */
export function validateTimeControl(timeControl: TimeControl): string | null {
  if (timeControl.initialMinutes < 0.5) {
    return 'Initial time must be at least 0.5 minutes';
  }
  
  if (timeControl.initialMinutes > 180) {
    return 'Initial time cannot exceed 180 minutes';
  }
  
  if (timeControl.incrementSeconds < 0) {
    return 'Increment cannot be negative';
  }
  
  if (timeControl.incrementSeconds > 60) {
    return 'Increment cannot exceed 60 seconds';
  }
  
  return null;
}

/**
 * Create initial time state from time control
 */
export function createInitialTimeState(timeControl: TimeControl): TimeState {
  const initialTime = Math.floor(timeControl.initialMinutes * 60 * 1000);
  
  return {
    redTime: initialTime,
    blackTime: initialTime,
    activePlayer: null,
    isPaused: false,
    lastUpdateTime: Date.now(),
    turnStartTime: null
  };
}

/**
 * Check if time has expired for a player
 */
export function isTimeExpired(timeState: TimeState, player: PieceColor): boolean {
  const playerTime = player === 'red' ? timeState.redTime : timeState.blackTime;
  return playerTime <= 0;
}

/**
 * Get current time warning level for a player
 */
export function getTimeWarningLevel(
  timeState: TimeState, 
  player: PieceColor,
  warnings: TimeWarning[] = DEFAULT_TIME_WARNINGS
): TimeWarning | null {
  const playerTime = player === 'red' ? timeState.redTime : timeState.blackTime;
  
  // Find the most severe warning that applies
  for (const warning of warnings.sort((a, b) => a.threshold - b.threshold)) {
    if (playerTime <= warning.threshold) {
      return warning;
    }
  }
  
  return null;
}

/**
 * Convert time control to display string
 */
export function timeControlToString(timeControl: TimeControl): string {
  const { format, initialMinutes, incrementSeconds } = timeControl;
  const separator = format === 'X|Y' ? '|' : '+';
  return `${initialMinutes}${separator}${incrementSeconds}`;
}

/**
 * Get time control preset by key
 */
export function getTimeControlPreset(key: string): TimeControl | null {
  return TIME_CONTROL_PRESETS[key] ?? null;
}