/**
 * Configuration loader for game variants
 * Handles loading, validation, and caching of rule configurations
 */

import type { VariantConfig, ResolvedVariantConfig, VariantCollection } from './rule-schema';
import { ConfigValidator } from './rule-schema';

// Import TypeScript configurations (these will be bundled)
import { AmericanConfig } from './rule-configs/american';
import { BrazilianConfig } from './rule-configs/brazilian';
import { InternationalConfig } from './rule-configs/international';

/**
 * Built-in variant configurations
 */
const BUILT_IN_CONFIGS: Record<string, VariantConfig> = {
  american: AmericanConfig as unknown as VariantConfig,
  brazilian: BrazilianConfig as unknown as VariantConfig,
  international: InternationalConfig as unknown as VariantConfig
};

/**
 * Configuration cache for performance
 */
class ConfigCache {
  private resolvedConfigs: Map<string, ResolvedVariantConfig> = new Map();
  private customConfigs: Map<string, VariantConfig> = new Map();

  get(variantName: string): ResolvedVariantConfig | undefined {
    return this.resolvedConfigs.get(variantName);
  }

  set(variantName: string, config: ResolvedVariantConfig): void {
    this.resolvedConfigs.set(variantName, config);
  }

  setCustom(variantName: string, config: VariantConfig): void {
    this.customConfigs.set(variantName, config);
  }

  getCustom(variantName: string): VariantConfig | undefined {
    return this.customConfigs.get(variantName);
  }

  clear(): void {
    this.resolvedConfigs.clear();
    this.customConfigs.clear();
  }

  has(variantName: string): boolean {
    return this.resolvedConfigs.has(variantName) || 
           BUILT_IN_CONFIGS.hasOwnProperty(variantName);
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
   * Load and resolve a variant configuration
   */
  static async loadVariant(variantName: string): Promise<ResolvedVariantConfig> {
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

    // Validate configuration
    const validation = ConfigValidator.validateWithErrors(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration for ${variantName}: ${validation.errors.join(', ')}`);
    }

    // Resolve computed values
    const resolvedConfig = ConfigValidator.resolve(config);

    // Cache the resolved configuration
    configCache.set(variantName, resolvedConfig);

    return resolvedConfig;
  }

  /**
   * Load multiple variants at once
   */
  static async loadVariants(variantNames: string[]): Promise<Record<string, ResolvedVariantConfig>> {
    const configs: Record<string, ResolvedVariantConfig> = {};
    
    for (const name of variantNames) {
      configs[name] = await this.loadVariant(name);
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
    const validation = ConfigValidator.validateWithErrors(config);
    if (!validation.valid) {
      throw new Error(`Invalid custom configuration for ${name}: ${validation.errors.join(', ')}`);
    }

    // Store in cache
    configCache.setCustom(name, config);

    // Clear resolved cache for this variant to force re-resolution
    if (configCache.has(name)) {
      const current = configCache.get(name);
      if (current) {
        configCache.set(name, ConfigValidator.resolve(config));
      }
    }
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
    const config = BUILT_IN_CONFIGS[variantName] || configCache.getCustom(variantName);
    if (!config) {
      return null;
    }

    return {
      name: config.metadata.name,
      displayName: config.metadata.displayName,
      description: config.metadata.description,
      boardSize: config.board.size,
      pieceCount: config.board.pieceCount
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
    return variants.map(name => this.getVariantMetadata(name)!).filter(Boolean);
  }

  /**
   * Clear configuration cache
   */
  static clearCache(): void {
    configCache.clear();
  }

  /**
   * Preload all built-in configurations
   */
  static async preloadBuiltInVariants(): Promise<void> {
    const variantNames = this.getBuiltInVariants();
    await this.loadVariants(variantNames);
  }

  /**
   * Export variant configuration (for saving/sharing)
   */
  static exportVariant(variantName: string): VariantConfig | null {
    return BUILT_IN_CONFIGS[variantName] || configCache.getCustom(variantName) || null;
  }

  /**
   * Import variant configuration from JSON
   */
  static importVariant(name: string, jsonConfig: string): void {
    try {
      const config = JSON.parse(jsonConfig) as VariantConfig;
      this.registerCustomVariant(name, config);
    } catch (error) {
      throw new Error(`Failed to import variant ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a variant configuration template
   */
  static createVariantTemplate(
    name: string,
    displayName: string,
    basedOn: string = 'american'
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
        popularity: 'rare',
        officialRules: undefined
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
    const validation = ConfigValidator.validateWithErrors(config);
    const warnings: string[] = [];

    // Check for schema version compatibility
    if (validation.valid && validation.data) {
      const schemaVersion = validation.data.schemaVersion;
      if (schemaVersion !== '1.0.0') {
        warnings.push(`Schema version ${schemaVersion} may not be fully compatible with current version 1.0.0`);
      }
    }

    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings
    };
  }
}