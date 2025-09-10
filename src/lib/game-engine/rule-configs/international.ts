/**
 * International Draughts rule configuration
 */
import type { VariantConfig } from '../rule-schema';

export const InternationalConfig = {
  "metadata": {
    "name": "international",
    "displayName": "International Draughts",
    "description": "Official 10×10 draughts with 20 pieces per player, flying kings, and FMJD tournament rules.",
    "origin": "Netherlands/France",
    "aliases": ["International Checkers", "Polish Draughts", "Continental Draughts"],
    "popularity": "common" as const,
    "officialRules": {
      "organization": "Fédération Mondiale du Jeu de Dames (FMJD)",
      "lastUpdated": "2023-03-15",
      "version": "2023.1"
    }
  },
  "board": {
    "size": 10,
    "pieceCount": 20,
    "startingRows": {
      "black": [0, 1, 2, 3],
      "red": [6, 7, 8, 9]
    },
    "coordinates": {
      "showNumbers": true,
      "showLetters": false
    }
  },
  "movement": {
    "regularPieces": {
      "directions": {
        "red": "forward" as const,
        "black": "forward" as const
      },
      "canCaptureBackward": true,
      "canMoveBackward": false
    },
    "kings": {
      "canFly": true,
      "canCaptureBackward": true
    }
  },
  "capture": {
    "mandatory": true,
    "requireMaximum": true,
    "kingPriority": true,
    "chainCaptures": true,
    "captureDirection": {
      "regular": "all" as const,
      "king": "all" as const
    },
    "promotion": {
      "duringCapture": false,
      "stopsCaptureChain": true
    }
  },
  "promotion": {
    "toOppositeEnd": true,
    "immediateEffect": true
  },
  "draws": {
    "fortyMoveRule": false,
    "twentyFiveMoveRule": true,
    "repetitionLimit": 3,
    "insufficientMaterial": true,
    "staleMate": true,
    "customDrawConditions": [
      "King vs King",
      "King vs King + 1 piece if no progress in 16 moves",
      "King vs King + 2 pieces if no progress in 32 moves"
    ]
  },
  "tournament": {
    "touchMove": true,
    "timeControls": {
      "enabled": true,
      "blitz": { "baseTime": 5, "increment": 3 },
      "rapid": { "baseTime": 25, "increment": 5 },
      "classical": { "baseTime": 120, "increment": 0 }
    },
    "notation": {
      "required": true,
      "format": "numeric" as const
    },
    "openingRestrictions": {
      "threeMove": false,
      "customPositions": ["official_opening_1", "official_opening_2"]
    },
    "officialCompliance": {
      "wcdf": false,
      "fmjd": true
    }
  },
  "schemaVersion": "1.0.0"
} as const satisfies VariantConfig;