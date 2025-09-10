"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { type Skin, type SkinUnlockProgress } from "./types";
import { skins } from "./definitions";

interface SkinContextValue {
  currentSkin: Skin;
  availableSkins: Skin[];
  unlockedSkins: Set<string>;
  skinProgress: Map<string, SkinUnlockProgress>;
  selectSkin: (skinId: string) => void;
  unlockSkin: (skinId: string) => void;
  checkUnlockCondition: (
    skinId: string,
    type: string,
    value: number | string,
  ) => void;
  updateProgress: (skinId: string, progress: number) => void;
}

const SkinContext = createContext<SkinContextValue | null>(null);

const STORAGE_KEY_CURRENT = "checkers-current-skin";
const STORAGE_KEY_UNLOCKED = "checkers-unlocked-skins";
const STORAGE_KEY_PROGRESS = "checkers-skin-progress";
const SKIN_COOKIE_KEY = "checkers-skin";

export function SkinProvider({ children }: { children: React.ReactNode }) {
  // Get all free themes (locked: false)
  const defaultUnlocked = new Set(
    Object.values(skins)
      .filter((skin) => !skin.locked)
      .map((skin) => skin.id),
  );

  const [currentSkinId, setCurrentSkinId] = useState<string>("the-og");
  const [unlockedSkins, setUnlockedSkins] =
    useState<Set<string>>(defaultUnlocked);
  const [skinProgress, setSkinProgress] = useState<
    Map<string, SkinUnlockProgress>
  >(new Map());
  const [mounted, setMounted] = useState(false);

  // Load saved data from localStorage
  useEffect(() => {
    setMounted(true);

    const savedCurrent = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (savedCurrent && skins[savedCurrent]) {
      setCurrentSkinId(savedCurrent);
    }

    const savedUnlocked = localStorage.getItem(STORAGE_KEY_UNLOCKED);
    if (savedUnlocked) {
      try {
        const unlocked = JSON.parse(savedUnlocked) as string[];
        // Merge saved unlocks with default free themes
        const mergedUnlocked = new Set([...defaultUnlocked, ...unlocked]);
        setUnlockedSkins(mergedUnlocked);
      } catch (e) {
        console.error("Failed to parse unlocked skins", e);
      }
    }

    const savedProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress) as Array<
          [string, SkinUnlockProgress]
        >;
        setSkinProgress(new Map(progress));
      } catch (e) {
        console.error("Failed to parse skin progress", e);
      }
    }
  }, []);

  // Apply skin CSS variables
  useEffect(() => {
    if (!mounted) return;

    const skin = skins[currentSkinId];
    if (!skin) return;

    // Remove server-side styles to avoid conflicts
    const serverStyles = document.getElementById("skin-styles-server");
    if (serverStyles) {
      serverStyles.remove();
    }

    // Apply board colors
    const root = document.documentElement;

    // Board colors
    root.style.setProperty("--board-light-from", skin.board.lightSquare.from);
    root.style.setProperty("--board-light-to", skin.board.lightSquare.to);
    root.style.setProperty("--board-dark-from", skin.board.darkSquare.from);
    root.style.setProperty("--board-dark-to", skin.board.darkSquare.to);
    root.style.setProperty("--board-border", skin.board.border);
    root.style.setProperty("--board-selected-ring", skin.board.selectedRing);
    root.style.setProperty(
      "--board-highlighted-ring",
      skin.board.highlightedRing,
    );
    root.style.setProperty("--board-possible-move", skin.board.possibleMove);
    root.style.setProperty(
      "--board-possible-move-glow",
      skin.board.possibleMoveGlow,
    );
    root.style.setProperty("--board-arrow-stroke", skin.board.arrow.stroke);
    root.style.setProperty("--board-arrow-fill", skin.board.arrow.fill);
    root.style.setProperty("--board-arrow-glow", skin.board.arrow.glow);

    // Piece colors
    root.style.setProperty("--piece-red-base", skin.pieces.red.base);
    root.style.setProperty("--piece-red-from", skin.pieces.red.gradient.from);
    root.style.setProperty("--piece-red-to", skin.pieces.red.gradient.to);
    root.style.setProperty("--piece-red-border", skin.pieces.red.border);
    root.style.setProperty("--piece-red-crown", skin.pieces.red.crown);

    root.style.setProperty("--piece-black-base", skin.pieces.black.base);
    root.style.setProperty(
      "--piece-black-from",
      skin.pieces.black.gradient.from,
    );
    root.style.setProperty("--piece-black-to", skin.pieces.black.gradient.to);
    root.style.setProperty("--piece-black-border", skin.pieces.black.border);
    root.style.setProperty("--piece-black-crown", skin.pieces.black.crown);

    // // UI colors (override CSS custom properties)
    // root.style.setProperty('--background', skin.ui.background);
    // root.style.setProperty('--foreground', skin.ui.foreground);
    // root.style.setProperty('--card', skin.ui.card);
    // root.style.setProperty('--card-foreground', skin.ui.cardForeground);
    // root.style.setProperty('--primary', skin.ui.primary);
    // root.style.setProperty('--primary-foreground', skin.ui.primaryForeground);
    // root.style.setProperty('--secondary', skin.ui.secondary);
    // root.style.setProperty('--secondary-foreground', skin.ui.secondaryForeground);
    // root.style.setProperty('--accent', skin.ui.accent);
    // root.style.setProperty('--accent-foreground', skin.ui.accentForeground);
    // root.style.setProperty('--muted', skin.ui.muted);
    // root.style.setProperty('--muted-foreground', skin.ui.mutedForeground);
    // root.style.setProperty('--border', skin.ui.border);
    // root.style.setProperty('--ring', skin.ui.ring);
  }, [currentSkinId, mounted]);

  const selectSkin = useCallback(
    (skinId: string) => {
      if (!skins[skinId]) return;
      if (!unlockedSkins.has(skinId)) {
        console.warn(`Skin ${skinId} is locked`);
        return;
      }

      setCurrentSkinId(skinId);
      localStorage.setItem(STORAGE_KEY_CURRENT, skinId);

      // Also update cookie for server-side rendering
      document.cookie = `${SKIN_COOKIE_KEY}=${skinId}; path=/; max-age=31536000; SameSite=Lax`;
    },
    [unlockedSkins],
  );

  const unlockSkin = useCallback((skinId: string) => {
    if (!skins[skinId]) return;

    setUnlockedSkins((prev) => {
      const newSet = new Set(prev);
      newSet.add(skinId);
      localStorage.setItem(
        STORAGE_KEY_UNLOCKED,
        JSON.stringify(Array.from(newSet)),
      );
      return newSet;
    });

    // Update progress to mark as unlocked
    setSkinProgress((prev) => {
      const newMap = new Map(prev);
      const progress = newMap.get(skinId) || {
        skinId,
        progress: 0,
        target: 0,
        unlocked: false,
      };
      progress.unlocked = true;
      progress.unlockedAt = new Date();
      newMap.set(skinId, progress);

      localStorage.setItem(
        STORAGE_KEY_PROGRESS,
        JSON.stringify(Array.from(newMap)),
      );
      return newMap;
    });
  }, []);

  const checkUnlockCondition = useCallback(
    (skinId: string, type: string, value: number | string) => {
      const skin = skins[skinId];
      if (!skin?.unlockCondition) return;
      if (unlockedSkins.has(skinId)) return;

      const condition = skin.unlockCondition;

      if (condition.type === type) {
        if (condition.type === "code" && condition.value === value) {
          unlockSkin(skinId);
        } else if (
          typeof condition.value === "number" &&
          typeof value === "number" &&
          value >= condition.value
        ) {
          unlockSkin(skinId);
        } else if (condition.value === value) {
          unlockSkin(skinId);
        }
      }
    },
    [unlockedSkins, unlockSkin],
  );

  const updateProgress = useCallback(
    (skinId: string, progress: number) => {
      const skin = skins[skinId];
      if (!skin?.unlockCondition) return;
      if (unlockedSkins.has(skinId)) return;

      const condition = skin.unlockCondition;

      setSkinProgress((prev) => {
        const newMap = new Map(prev);
        const currentProgress = newMap.get(skinId) || {
          skinId,
          progress: 0,
          target: typeof condition.value === "number" ? condition.value : 0,
          unlocked: false,
        };

        currentProgress.progress = progress;

        // Check if target is reached
        if (currentProgress.target > 0 && progress >= currentProgress.target) {
          unlockSkin(skinId);
        }

        newMap.set(skinId, currentProgress);
        localStorage.setItem(
          STORAGE_KEY_PROGRESS,
          JSON.stringify(Array.from(newMap)),
        );
        return newMap;
      });
    },
    [unlockedSkins, unlockSkin],
  );

  const allSkins: Skin[] = Object.values(skins).sort((a, b) => {
    if (a.id === "the-og") return -1;
    if (b.id === "the-og") return 1;
    return 0;
  });
  const availableSkins = allSkins.map((skin) => ({
    ...skin,
    locked: !unlockedSkins.has(skin.id),
  }));

  const defaultSkin: Skin = skins["the-og"] ?? skins.classic!;
  const currentSkin: Skin =
    (skins[currentSkinId] as Skin | undefined) ?? defaultSkin;

  if (!mounted) {
    // Return a minimal context during SSR
    return (
      <SkinContext.Provider
        value={{
          currentSkin: defaultSkin,
          availableSkins: allSkins,
          unlockedSkins: defaultUnlocked,
          skinProgress: new Map(),
          selectSkin: () => {},
          unlockSkin: () => {},
          checkUnlockCondition: () => {},
          updateProgress: () => {},
        }}
      >
        {children}
      </SkinContext.Provider>
    );
  }

  return (
    <SkinContext.Provider
      value={{
        currentSkin,
        availableSkins,
        unlockedSkins,
        skinProgress,
        selectSkin,
        unlockSkin,
        checkUnlockCondition,
        updateProgress,
      }}
    >
      {children}
    </SkinContext.Provider>
  );
}

export function useSkin() {
  const context = useContext(SkinContext);
  if (!context) {
    throw new Error("useSkin must be used within a SkinProvider");
  }
  return context;
}
