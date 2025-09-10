/**
 * Game Engine - Main exports
 * Configuration-driven rules system for all draughts variants
 */

// Core engine
export { GameRules } from "./game-rules";

// Configuration system
export { GameConfigLoader } from "./config-loader";
export type {
  VariantConfig,
  VariantCollection,
  VariantMetadata,
  BoardConfig,
  MovementRules,
  CaptureRules,
  PromotionRules,
  DrawRules,
  TournamentRules,
  Direction,
  PieceSetup,
} from "./rule-schema";
export { validateConfig, validateConfigWithErrors } from "./rule-schema";

// Import for local use in utility functions
import { GameRules } from "./game-rules";
import { GameConfigLoader } from "./config-loader";
import { validateConfigWithErrors } from "./rule-schema";
import type { VariantConfig } from "./rule-schema";

// Remove backward compatibility exports since we're removing the old system

// Convenience constants
export const GAME_VARIANTS = {
  AMERICAN: "american" as const,
  BRAZILIAN: "brazilian" as const,
  INTERNATIONAL: "international" as const,
} as const;

export const PLAY_MODES = {
  CASUAL: "casual" as const,
  TOURNAMENT: "tournament" as const,
} as const;

/**
 * Quick utility functions
 */

/**
 * Create a game rules engine for a variant
 */
export const createGameRules = (variant: string, config?: VariantConfig) => {
  const rules = new GameRules(variant, config);
  if (!config) {
    rules.initialize();
  }
  return rules;
};

/**
 * Load a variant configuration
 */
export const loadVariantConfig = (variant: string) => {
  return GameConfigLoader.loadVariant(variant);
};

// Removed legacy compatibility - use createGameRules instead

/**
 * Get available variants with metadata
 */
export const getAvailableVariants = () => {
  return GameConfigLoader.getAllVariantMetadata();
};

/**
 * Preload all built-in variants for performance
 */
export const preloadVariants = () => {
  GameConfigLoader.preloadBuiltInVariants();
};

/**
 * Validate a custom variant configuration
 */
export const validateVariantConfig = (config: unknown) => {
  return validateConfigWithErrors(config);
};

/**
 * Register a custom variant
 */
export const registerCustomVariant = (name: string, config: VariantConfig) => {
  GameConfigLoader.registerCustomVariant(name, config);
};

/**
 * Create a variant template based on existing variant
 */
export const createVariantTemplate = (
  name: string,
  displayName: string,
  basedOn = "american",
) => {
  return GameConfigLoader.createVariantTemplate(name, displayName, basedOn);
};

/**
 * Performance and debugging utilities
 */
export const ENGINE_UTILS = {
  /**
   * Clear all configuration caches
   */
  clearCache: () => GameConfigLoader.clearCache(),

  /**
   * Check if a variant is loaded in cache
   */
  isCached: (variant: string) => GameConfigLoader.hasVariant(variant),

  /**
   * Get cache statistics
   */
  getCacheStats: () => ({
    availableVariants: GameConfigLoader.getAvailableVariants(),
    builtInVariants: GameConfigLoader.getBuiltInVariants(),
  }),

  /**
   * Export variant configuration as JSON
   */
  exportVariant: (variant: string) => GameConfigLoader.exportVariant(variant),

  /**
   * Import variant from JSON string
   */
  importVariant: (name: string, jsonConfig: string) =>
    GameConfigLoader.importVariant(name, jsonConfig),

  /**
   * Validate variant compatibility
   */
  validateCompatibility: (config: unknown) =>
    GameConfigLoader.validateVariant(config),
};

// Migration helpers removed - old system no longer exists

/**
 * Re-export original game logic for backward compatibility
 */
export type {
  Board,
  PieceColor,
  PieceType,
  Position,
  Move,
  Piece,
} from "../game-logic";
export {
  createInitialBoard,
  makeMove,
  checkWinner,
  getRandomAIMove,
  isValidSquare,
} from "../game-logic";

/**
 * Type exports for TypeScript users
 */
export type GameVariant = "american" | "brazilian" | "international";
export type PlayMode = "casual" | "tournament";

/**
 * Version information
 */
export const ENGINE_VERSION = "2.0.0";
export const SCHEMA_VERSION = "1.0.0";

/**
 * Feature flags
 */
export const FEATURES = {
  CUSTOM_VARIANTS: true,
  TOURNAMENT_COMPLIANCE: true,
  PERFORMANCE_OPTIMIZATION: true,
  RULE_VALIDATION: true,
} as const;
