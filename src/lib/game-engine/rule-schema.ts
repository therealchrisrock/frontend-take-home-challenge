/**
 * Comprehensive rule configuration schema for unified game engine
 * Supports all draughts variants through configuration
 */

import { z } from 'zod';
import type { PieceColor, PieceType } from '../game-logic';

/**
 * Direction types for piece movement
 */
export const DirectionSchema = z.enum(['forward', 'backward', 'all']);
export type Direction = z.infer<typeof DirectionSchema>;

/**
 * Piece placement configuration for board setup
 */
export const PieceSetupSchema = z.object({
  black: z.array(z.number().int().min(0)), // Row numbers for black pieces
  red: z.array(z.number().int().min(0))    // Row numbers for red pieces
});
export type PieceSetup = z.infer<typeof PieceSetupSchema>;

/**
 * Movement rules for different piece types
 */
export const MovementRulesSchema = z.object({
  regularPieces: z.object({
    directions: z.object({
      red: DirectionSchema,
      black: DirectionSchema
    }),
    canCaptureBackward: z.boolean(),
    canMoveBackward: z.boolean().optional().default(false)
  }),
  kings: z.object({
    canFly: z.boolean(),           // Can move/capture multiple squares
    canCaptureBackward: z.boolean(),
    maxDistance: z.number().int().positive().optional() // Limit flying distance
  })
});
export type MovementRules = z.infer<typeof MovementRulesSchema>;

/**
 * Capture and jump rules
 */
export const CaptureRulesSchema = z.object({
  mandatory: z.boolean(),          // Must capture if possible
  requireMaximum: z.boolean(),     // Must make longest capture sequence
  kingPriority: z.boolean(),       // Kings must capture if both king/man can capture
  chainCaptures: z.boolean().default(true), // Allow multiple jumps in one turn
  captureDirection: z.object({
    regular: z.enum(['forward', 'backward', 'all']),
    king: z.enum(['all'])
  }),
  promotion: z.object({
    duringCapture: z.boolean().default(false), // Can promote mid-capture sequence
    stopsCaptureChain: z.boolean().default(true) // Promotion ends capture sequence
  })
});
export type CaptureRules = z.infer<typeof CaptureRulesSchema>;

/**
 * Promotion (kinging) rules
 */
export const PromotionRulesSchema = z.object({
  toOppositeEnd: z.boolean().default(true), // Promote when reaching opposite end
  customRows: z.object({
    red: z.array(z.number().int().min(0)).optional(),
    black: z.array(z.number().int().min(0)).optional()
  }).optional(),
  immediateEffect: z.boolean().default(true) // King powers available immediately
});
export type PromotionRules = z.infer<typeof PromotionRulesSchema>;

/**
 * Draw and endgame conditions
 */
export const DrawRulesSchema = z.object({
  fortyMoveRule: z.boolean().default(false),        // 40 moves without capture/promotion
  twentyFiveMoveRule: z.boolean().default(false),   // 25 moves in endgame positions
  repetitionLimit: z.number().int().min(1).default(3), // Triple repetition
  insufficientMaterial: z.boolean().default(true),   // Auto-draw with insufficient material
  staleMate: z.boolean().default(true),              // No legal moves = draw
  customDrawConditions: z.array(z.string()).optional() // Custom draw rules
});
export type DrawRules = z.infer<typeof DrawRulesSchema>;

/**
 * Tournament-specific rules and behaviors
 */
export const TournamentRulesSchema = z.object({
  touchMove: z.boolean().default(false),           // Must move touched piece
  timeControls: z.object({
    enabled: z.boolean(),
    blitz: z.object({ baseTime: z.number(), increment: z.number() }),
    rapid: z.object({ baseTime: z.number(), increment: z.number() }),
    classical: z.object({ baseTime: z.number(), increment: z.number() })
  }).optional(),
  notation: z.object({
    required: z.boolean().default(false),
    format: z.enum(['algebraic', 'numeric', 'descriptive']).default('algebraic')
  }),
  openingRestrictions: z.object({
    threeMove: z.boolean().default(false),
    customPositions: z.array(z.string()).optional() // FEN-like notation
  }),
  officialCompliance: z.object({
    wcdf: z.boolean().default(false),  // World Checkers/Draughts Federation
    fmjd: z.boolean().default(false)   // Fédération Mondiale du Jeu de Dames
  })
});
export type TournamentRules = z.infer<typeof TournamentRulesSchema>;

/**
 * Metadata about the variant
 */
export const VariantMetadataSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string(),
  origin: z.string().optional(),        // Country/region of origin
  aliases: z.array(z.string()).optional(), // Alternative names
  popularity: z.enum(['common', 'regional', 'rare']).default('regional'),
  officialRules: z.object({
    organization: z.string().optional(), // Governing body
    lastUpdated: z.string().optional(),  // ISO date string
    version: z.string().optional()       // Rule version
  }).optional()
});
export type VariantMetadata = z.infer<typeof VariantMetadataSchema>;

/**
 * Board configuration
 */
export const BoardConfigSchema = z.object({
  size: z.number().int().min(6).max(12),    // Board dimensions (size x size)
  pieceCount: z.number().int().positive(),   // Total pieces per player
  startingRows: PieceSetupSchema,
  coordinates: z.object({
    showNumbers: z.boolean().default(false),
    showLetters: z.boolean().default(false)
  }).optional()
});
export type BoardConfig = z.infer<typeof BoardConfigSchema>;

/**
 * Complete variant configuration schema
 */
export const VariantConfigSchema = z.object({
  metadata: VariantMetadataSchema,
  board: BoardConfigSchema,
  movement: MovementRulesSchema,
  capture: CaptureRulesSchema,
  promotion: PromotionRulesSchema,
  draws: DrawRulesSchema,
  tournament: TournamentRulesSchema.optional(),
  
  // Extensibility for custom rules
  customRules: z.record(z.any()).optional(),
  
  // Version control
  schemaVersion: z.string().default('1.0.0'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type VariantConfig = z.infer<typeof VariantConfigSchema>;

/**
 * Collection of all variant configurations
 */
export const VariantCollectionSchema = z.record(z.string(), VariantConfigSchema);
export type VariantCollection = z.infer<typeof VariantCollectionSchema>;

/**
 * Validate a variant configuration
 */
export function validateConfig(config: unknown): config is VariantConfig {
  try {
    VariantConfigSchema.parse(config);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate with detailed error reporting
 */
export function validateConfigWithErrors(config: unknown): {
  valid: boolean;
  errors: string[];
  data?: VariantConfig;
} {
  try {
    const data = VariantConfigSchema.parse(config);
    return { valid: true, errors: [], data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error']
    };
  }
}