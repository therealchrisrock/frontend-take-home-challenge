/**
 * American Checkers rule configuration
 */

export const AmericanConfig = {
  "metadata": {
    "name": "american",
    "displayName": "American Checkers",
    "description": "Standard 8×8 checkers with flying kings and mandatory captures. Also known as English Draughts.",
    "origin": "United States",
    "aliases": ["English Draughts", "Straight Checkers"],
    "popularity": "common" as const,
    "officialRules": {
      "organization": "World Checkers/Draughts Federation (WCDF)",
      "lastUpdated": "2023-01-01",
      "version": "2023.1"
    }
  },
  "board": {
    "size": 8,
    "pieceCount": 12,
    "startingRows": {
      "black": [0, 1, 2],
      "red": [5, 6, 7]
    },
    "squareColors": {
      "light": "#F0D9B5",
      "dark": "#B58863"
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
      "canCaptureBackward": false,
      "canMoveBackward": false
    },
    "kings": {
      "canFly": true,
      "canCaptureBackward": true
    }
  },
  "capture": {
    "mandatory": true,
    "requireMaximum": false,
    "kingPriority": false,
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
    "fortyMoveRule": true,
    "twentyFiveMoveRule": false,
    "repetitionLimit": 3,
    "insufficientMaterial": true,
    "staleMate": true
  },
  "tournament": {
    "touchMove": true,
    "timeControls": {
      "enabled": true,
      "blitz": { "baseTime": 5, "increment": 3 },
      "rapid": { "baseTime": 15, "increment": 5 },
      "classical": { "baseTime": 60, "increment": 0 }
    },
    "notation": {
      "required": true,
      "format": "algebraic" as const
    },
    "openingRestrictions": {
      "threeMove": true
    },
    "officialCompliance": {
      "wcdf": true,
      "fmjd": false
    }
  },
  "schemaVersion": "1.0.0"
} as const;