"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export interface GameSettings {
  soundEffectsEnabled: boolean;
  sfxVolume: number; // 0-100
  reducedMotion: boolean;
}

interface SettingsContextType {
  settings: GameSettings;
  updateSettings: (partial: Partial<GameSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: GameSettings = {
  soundEffectsEnabled: true,
  sfxVolume: 50,
  reducedMotion: false,
};

const STORAGE_KEY = "checkers-game-settings";

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

function getInitialSettings(): GameSettings {
  // Check for browser's prefers-reduced-motion setting
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // Try to load from localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle missing properties in stored settings
        return {
          ...defaultSettings,
          ...parsed,
          // Respect browser preference for reduced motion if not explicitly set
          reducedMotion: parsed.reducedMotion ?? prefersReducedMotion,
        };
      }
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
    }
  }

  // Return defaults with browser preference
  return {
    ...defaultSettings,
    reducedMotion: prefersReducedMotion,
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<GameSettings>(getInitialSettings);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      // Dispatch custom event for reduced motion changes
      // This allows components to react immediately to changes
      window.dispatchEvent(
        new CustomEvent("reducedMotionChanged", {
          detail: settings.reducedMotion,
        }),
      );
    } catch (error) {
      console.warn("Failed to save settings to localStorage:", error);
    }
  }, [settings]);

  // Listen for browser preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't explicitly set a preference
      setSettings((prev) => {
        // Check if current setting matches the previous browser preference
        // If so, update to new browser preference
        const wasBrowserDefault = prev.reducedMotion === !e.matches;
        if (wasBrowserDefault) {
          return { ...prev, reducedMotion: e.matches };
        }
        return prev;
      });
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    const prefersReducedMotion =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    setSettings({
      ...defaultSettings,
      reducedMotion: prefersReducedMotion,
    });
  }, []);

  const contextValue: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}
