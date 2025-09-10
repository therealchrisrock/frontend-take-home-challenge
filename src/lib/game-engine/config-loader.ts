/**
 * Configuration loader for game variants
 * Handles loading, validation, and caching of rule configurations
 */

import type { VariantConfig } from "./rule-schema";
import { validateConfigWithErrors } from "./rule-schema";

// Import TypeScript configurations (these will be bundled)
import { AmericanConfig } from "./rule-configs/american";
import { BrazilianConfig } from "./rule-configs/brazilian";
import { InternationalConfig } from "./rule-configs/international";
import { CanadianConfig } from "./rule-configs/canadian";

/**
 * Built-in variant configurations
 */
const BUILT_IN_CONFIGS: Record<string, VariantConfig> = {
  american: AmericanConfig,
  brazilian: BrazilianConfig,
  international: InternationalConfig,
  canadian: CanadianConfig,
};

/**
 * Configuration cache for performance
 */
class ConfigCache {
  private configs = new Map<string, VariantConfig>();
  private customConfigs = new Map<string, VariantConfig>();

  get(variantName: string): VariantConfig | undefined {
    return this.configs.get(variantName);
  }

  set(variantName: string, config: VariantConfig): void {
    this.configs.set(variantName, config);
  }

  setCustom(variantName: string, config: VariantConfig): void {
    this.customConfigs.set(variantName, config);
  }

  getCustom(variantName: string): VariantConfig | undefined {
    return this.customConfigs.get(variantName);
  }

  clear(): void {
    this.configs.clear();
    this.customConfigs.clear();
  }

  has(variantName: string): boolean {
    return (
      this.configs.has(variantName) ||
      BUILT_IN_CONFIGS.hasOwnProperty(variantName)
    );
  }

  getAllVariantNames(): string[] {
    const builtInNames = Object.keys(BUILT_IN_CONFIGS);
    const customNames = Array.from(this.customConfigs.keys());
    return [...builtInNames, ...customNames];
  }
}

/**
 * Global configuration cache
 */
const configCache = new ConfigCache();

/**
 * Configuration loader with validation and caching
 */
export class GameConfigLoader {
  /**
   * Load a variant configuration (now synchronous)
   */
  static loadVariant(variantName: string): VariantConfig {
    // Check cache first
    const cached = configCache.get(variantName);
    if (cached) {
      return cached;
    }

    // Try to load configuration
    let config: VariantConfig | undefined;

    // Check built-in configurations
    if (BUILT_IN_CONFIGS[variantName]) {
      config = BUILT_IN_CONFIGS[variantName];
    }
    // Check custom configurations
    else {
      config = configCache.getCustom(variantName);
    }

    if (!config) {
      throw new Error(`Unknown variant: ${variantName}`);
    }

    // Built-in configs are already validated by TypeScript
    // Only validate custom configs
    if (!BUILT_IN_CONFIGS[variantName]) {
      const validation = validateConfigWithErrors(config);
      if (!validation.valid) {
        throw new Error(
          `Invalid configuration for ${variantName}: ${validation.errors.join(", ")}`,
        );
      }
    }

    // Cache the configuration
    configCache.set(variantName, config);

    return config;
  }

  /**
   * Load multiple variants at once (now synchronous)
   */
  static loadVariants(variantNames: string[]): Record<string, VariantConfig> {
    const configs: Record<string, VariantConfig> = {};

    for (const name of variantNames) {
      configs[name] = this.loadVariant(name);
    }

    return configs;
  }

  /**
   * Get all available variant names
   */
  static getAvailableVariants(): string[] {
    return configCache.getAllVariantNames();
  }

  /**
   * Get all built-in variant names
   */
  static getBuiltInVariants(): string[] {
    return Object.keys(BUILT_IN_CONFIGS);
  }

  /**
   * Register a custom variant configuration
   */
  static registerCustomVariant(name: string, config: VariantConfig): void {
    // Validate the configuration
    const validation = validateConfigWithErrors(config);
    if (!validation.valid) {
      throw new Error(
        `Invalid custom configuration for ${name}: ${validation.errors.join(", ")}`,
      );
    }

    // Store in cache
    configCache.setCustom(name, config);
    configCache.set(name, config);
  }

  /**
   * Check if a variant exists
   */
  static hasVariant(variantName: string): boolean {
    return configCache.has(variantName);
  }

  /**
   * Get variant metadata without full loading
   */
  static getVariantMetadata(variantName: string): {
    name: string;
    displayName: string;
    description: string;
    boardSize: number;
    pieceCount: number;
  } | null {
    const config =
      BUILT_IN_CONFIGS[variantName] || configCache.getCustom(variantName);
    if (!config) {
      return null;
    }

    return {
      name: config.metadata.name,
      displayName: config.metadata.displayName,
      description: config.metadata.description,
      boardSize: config.board.size,
      pieceCount: config.board.pieceCount,
    };
  }

  /**
   * Get all variant metadata
   */
  static getAllVariantMetadata(): Array<{
    name: string;
    displayName: string;
    description: string;
    boardSize: number;
    pieceCount: number;
  }> {
    const variants = this.getAvailableVariants();
    return variants
      .map((name) => this.getVariantMetadata(name)!)
      .filter(Boolean);
  }

  /**
   * Clear configuration cache
   */
  static clearCache(): void {
    configCache.clear();
  }

  /**
   * Preload all built-in configurations (now synchronous)
   */
  static preloadBuiltInVariants(): void {
    const variantNames = this.getBuiltInVariants();
    this.loadVariants(variantNames);
  }

  /**
   * Export variant configuration (for saving/sharing)
   */
  static exportVariant(variantName: string): VariantConfig | null {
    return (
      BUILT_IN_CONFIGS[variantName] ||
      configCache.getCustom(variantName) ||
      null
    );
  }

  /**
   * Import variant configuration from JSON
   */
  static importVariant(name: string, jsonConfig: string): void {
    try {
      const config = JSON.parse(jsonConfig) as VariantConfig;
      this.registerCustomVariant(name, config);
    } catch (error) {
      throw new Error(
        `Failed to import variant ${name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create a variant configuration template
   */
  static createVariantTemplate(
    name: string,
    displayName: string,
    basedOn = "american",
  ): VariantConfig {
    const baseConfig = BUILT_IN_CONFIGS[basedOn];
    if (!baseConfig) {
      throw new Error(`Unknown base variant: ${basedOn}`);
    }

    return {
      ...baseConfig,
      metadata: {
        ...baseConfig.metadata,
        name,
        displayName,
        description: `Custom variant based on ${baseConfig.metadata.displayName}`,
        popularity: "rare",
        officialRules: undefined,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate variant compatibility with current schema
   */
  static validateVariant(config: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const validation = validateConfigWithErrors(config);
    const warnings: string[] = [];

    // Check for schema version compatibility
    if (validation.valid && validation.data) {
      const schemaVersion = validation.data.schemaVersion;
      if (schemaVersion !== "1.0.0") {
        warnings.push(
          `Schema version ${schemaVersion} may not be fully compatible with current version 1.0.0`,
        );
      }
    }

    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings,
    };
  }
}
