/**
 * Canadian Checkers rule configuration (12x12, 30 pieces per player)
 */
import type { VariantConfig } from "../rule-schema";

export const CanadianConfig = {
  metadata: {
    name: "canadian",
    displayName: "Canadian Checkers",
    description:
      "12×12 board with 30 pieces per player; flying kings and backward captures allowed.",
    origin: "Canada",
    aliases: ["Canadian Draughts"],
    popularity: "regional" as const,
    officialRules: {
      organization: "Regional Federations",
      lastUpdated: "2023-01-01",
      version: "2023.1",
    },
  },
  board: {
    size: 12,
    pieceCount: 30,
    startingRows: {
      black: [0, 1, 2, 3, 4],
      red: [7, 8, 9, 10, 11],
    },
    coordinates: {
      showNumbers: true,
      showLetters: false,
    },
  },
  movement: {
    regularPieces: {
      directions: {
        red: "forward" as const,
        black: "forward" as const,
      },
      canCaptureBackward: true,
      canMoveBackward: false,
    },
    kings: {
      canFly: true,
      canCaptureBackward: true,
    },
  },
  capture: {
    mandatory: true,
    requireMaximum: true,
    kingPriority: true,
    chainCaptures: true,
    captureDirection: {
      regular: "all" as const,
      king: "all" as const,
    },
    promotion: {
      duringCapture: false,
      stopsCaptureChain: true,
    },
  },
  promotion: {
    toOppositeEnd: true,
    immediateEffect: true,
  },
  draws: {
    fortyMoveRule: false,
    twentyFiveMoveRule: true,
    repetitionLimit: 3,
    insufficientMaterial: true,
    staleMate: true,
  },
  tournament: {
    touchMove: true,
    timeControls: {
      enabled: true,
      blitz: { baseTime: 5, increment: 3 },
      rapid: { baseTime: 25, increment: 5 },
      classical: { baseTime: 120, increment: 0 },
    },
    notation: {
      required: true,
      format: "numeric" as const,
    },
    openingRestrictions: {
      threeMove: false,
    },
    officialCompliance: {
      wcdf: false,
      fmjd: false,
    },
  },
  schemaVersion: "1.0.0" as const,
} as const satisfies VariantConfig;
