import { type Skin } from './types';

export const skins: Record<string, Skin> = {
  classic: {
    id: 'classic',
    name: 'Classic Wood',
    description: 'Traditional wooden checkerboard',
    category: 'classic',
    board: {
      lightSquare: {
        from: 'rgb(251, 191, 36)', // amber-400
        to: 'rgb(245, 158, 11)',   // amber-500
      },
      darkSquare: {
        from: 'rgb(146, 64, 14)',   // amber-800
        to: 'rgb(120, 53, 15)',     // amber-900
      },
      border: 'rgb(92, 51, 23)',    // amber-950
      selectedRing: 'rgb(59, 130, 246)', // blue-500
      highlightedRing: 'rgb(250, 204, 21)', // yellow-400
      possibleMove: 'rgb(74, 222, 128)', // green-400
      possibleMoveGlow: 'rgba(74, 222, 128, 0.5)',
      arrow: {
        stroke: 'rgb(59, 130, 246)', // blue-500
        fill: 'rgba(59, 130, 246, 0.8)', // blue-500 with transparency
        glow: 'rgba(59, 130, 246, 0.3)', // blue-500 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(185, 28, 28)',
        gradient: {
          from: 'rgb(220, 38, 38)',
          to: 'rgb(153, 27, 27)',
        },
        border: 'rgb(127, 29, 29)',
        crown: 'rgb(251, 191, 36)',
      },
      black: {
        base: 'rgb(23, 23, 23)',
        gradient: {
          from: 'rgb(38, 38, 38)',
          to: 'rgb(10, 10, 10)',
        },
        border: 'rgb(0, 0, 0)',
        crown: 'rgb(251, 191, 36)',
      },
    },
    ui: {
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.205 0 0)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.97 0 0)',
      secondaryForeground: 'oklch(0.205 0 0)',
      accent: 'oklch(0.97 0 0)',
      accentForeground: 'oklch(0.205 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.708 0 0)',
    },
    preview: '🪵',
    locked: false,
  },
  
  'the-og': {
    id: 'the-og',
    name: 'The OG',
    description: 'Classic green-and-white board with red and black pieces',
    category: 'classic',
    board: {
      lightSquare: {
        from: 'rgb(255, 255, 255)', // white
        to: 'rgb(241, 245, 249)',   // slate-100
      },
      darkSquare: {
        from: 'rgb(21, 128, 61)',  // green-700
        to: 'rgb(22, 101, 52)',    // green-800
      },
      border: 'rgb(0, 0, 0)',
      selectedRing: 'rgb(59, 130, 246)', // blue-500
      highlightedRing: 'rgb(250, 204, 21)', // yellow-400
      possibleMove: 'rgb(74, 222, 128)', // green-400
      possibleMoveGlow: 'rgba(74, 222, 128, 0.5)',
      arrow: {
        stroke: 'rgb(59, 130, 246)',
        fill: 'rgba(59, 130, 246, 0.8)',
        glow: 'rgba(59, 130, 246, 0.3)',
      },
    },
    pieces: {
      red: {
        base: 'rgb(220, 38, 38)',
        gradient: {
          from: 'rgb(239, 68, 68)',
          to: 'rgb(185, 28, 28)',
        },
        border: 'rgb(127, 29, 29)',
        crown: 'rgb(251, 191, 36)',
      },
      black: {
        base: 'rgb(23, 23, 23)',
        gradient: {
          from: 'rgb(38, 38, 38)',
          to: 'rgb(10, 10, 10)',
        },
        border: 'rgb(0, 0, 0)',
        crown: 'rgb(251, 191, 36)',
      },
    },
    ui: {
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.205 0 0)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.97 0 0)',
      secondaryForeground: 'oklch(0.205 0 0)',
      accent: 'oklch(0.97 0 0)',
      accentForeground: 'oklch(0.205 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.708 0 0)',
    },
    preview: '🏁',
    locked: false,
  },
  
  midnight: {
    id: 'midnight',
    name: 'Midnight Shadow',
    description: 'Dark theme with purple accents',
    category: 'modern',
    board: {
      lightSquare: {
        from: 'rgb(147, 51, 234)', // purple-600
        to: 'rgb(126, 34, 206)',   // purple-700
      },
      darkSquare: {
        from: 'rgb(30, 27, 75)',
        to: 'rgb(15, 23, 42)',
      },
      border: 'rgb(15, 23, 42)',
      selectedRing: 'rgb(168, 85, 247)', // purple-500
      highlightedRing: 'rgb(217, 70, 239)', // fuchsia-400
      possibleMove: 'rgb(167, 139, 250)', // violet-400
      possibleMoveGlow: 'rgba(167, 139, 250, 0.5)',
      arrow: {
        stroke: 'rgb(168, 85, 247)', // purple-500
        fill: 'rgba(168, 85, 247, 0.8)', // purple-500 with transparency
        glow: 'rgba(168, 85, 247, 0.3)', // purple-500 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(239, 68, 68)',
        gradient: {
          from: 'rgb(248, 113, 113)',
          to: 'rgb(220, 38, 38)',
        },
        border: 'rgb(185, 28, 28)',
        crown: 'rgb(251, 191, 36)',
      },
      black: {
        base: 'rgb(55, 48, 163)',
        gradient: {
          from: 'rgb(79, 70, 229)',
          to: 'rgb(49, 46, 129)',
        },
        border: 'rgb(30, 27, 75)',
        crown: 'rgb(251, 191, 36)',
      },
    },
    ui: {
      background: 'oklch(0.145 0 0)',
      foreground: 'oklch(0.985 0 0)',
      card: 'oklch(0.205 0 0)',
      cardForeground: 'oklch(0.985 0 0)',
      primary: 'oklch(0.672 0.196 305.82)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.269 0 0)',
      secondaryForeground: 'oklch(0.985 0 0)',
      accent: 'oklch(0.672 0.196 305.82)',
      accentForeground: 'oklch(0.985 0 0)',
      muted: 'oklch(0.269 0 0)',
      mutedForeground: 'oklch(0.708 0 0)',
      border: 'oklch(1 0 0 / 10%)',
      ring: 'oklch(0.672 0.196 305.82)',
    },
    preview: '🌙',
    locked: true,
    unlockCondition: {
      type: 'wins',
      value: 5,
      description: 'Win 5 games',
    },
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean Depths',
    description: 'Underwater themed board',
    category: 'modern',
    board: {
      lightSquare: {
        from: 'rgb(34, 211, 238)', // cyan-400
        to: 'rgb(6, 182, 212)',    // cyan-500
      },
      darkSquare: {
        from: 'rgb(14, 116, 144)', // cyan-700
        to: 'rgb(21, 94, 117)',     // cyan-800
      },
      border: 'rgb(8, 51, 68)',
      selectedRing: 'rgb(34, 211, 238)',
      highlightedRing: 'rgb(94, 234, 212)', // teal-300
      possibleMove: 'rgb(52, 211, 153)', // emerald-400
      possibleMoveGlow: 'rgba(52, 211, 153, 0.5)',
      arrow: {
        stroke: 'rgb(34, 211, 238)', // cyan-400
        fill: 'rgba(34, 211, 238, 0.8)', // cyan-400 with transparency
        glow: 'rgba(34, 211, 238, 0.3)', // cyan-400 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(251, 146, 60)',
        gradient: {
          from: 'rgb(254, 215, 170)',
          to: 'rgb(249, 115, 22)',
        },
        border: 'rgb(234, 88, 12)',
        crown: 'rgb(250, 204, 21)',
      },
      black: {
        base: 'rgb(21, 94, 117)',
        gradient: {
          from: 'rgb(14, 116, 144)',
          to: 'rgb(8, 51, 68)',
        },
        border: 'rgb(3, 7, 18)',
        crown: 'rgb(250, 204, 21)',
      },
    },
    ui: {
      background: 'oklch(0.985 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.598 0.16 192.2)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.95 0.02 192)',
      secondaryForeground: 'oklch(0.145 0 0)',
      accent: 'oklch(0.758 0.14 162.4)',
      accentForeground: 'oklch(0.145 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.598 0.16 192.2)',
    },
    preview: '🌊',
    locked: true,
    unlockCondition: {
      type: 'games',
      value: 10,
      description: 'Play 10 games',
    },
  },

  forest: {
    id: 'forest',
    name: 'Forest Grove',
    description: 'Nature-inspired green theme',
    category: 'seasonal',
    board: {
      lightSquare: {
        from: 'rgb(134, 239, 172)', // green-300
        to: 'rgb(74, 222, 128)',    // green-400
      },
      darkSquare: {
        from: 'rgb(34, 197, 94)',   // green-500
        to: 'rgb(22, 163, 74)',     // green-600
      },
      border: 'rgb(20, 83, 45)',
      selectedRing: 'rgb(251, 191, 36)',
      highlightedRing: 'rgb(253, 224, 71)', // yellow-300
      possibleMove: 'rgb(254, 240, 138)', // yellow-200
      possibleMoveGlow: 'rgba(254, 240, 138, 0.5)',
      arrow: {
        stroke: 'rgb(251, 191, 36)', // amber-400
        fill: 'rgba(251, 191, 36, 0.8)', // amber-400 with transparency
        glow: 'rgba(251, 191, 36, 0.3)', // amber-400 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(239, 68, 68)',
        gradient: {
          from: 'rgb(252, 165, 165)',
          to: 'rgb(220, 38, 38)',
        },
        border: 'rgb(153, 27, 27)',
        crown: 'rgb(251, 191, 36)',
      },
      black: {
        base: 'rgb(92, 51, 23)',
        gradient: {
          from: 'rgb(120, 53, 15)',
          to: 'rgb(69, 26, 3)',
        },
        border: 'rgb(41, 37, 36)',
        crown: 'rgb(251, 191, 36)',
      },
    },
    ui: {
      background: 'oklch(0.985 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.598 0.17 142.1)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.95 0.03 142)',
      secondaryForeground: 'oklch(0.145 0 0)',
      accent: 'oklch(0.758 0.15 130)',
      accentForeground: 'oklch(0.145 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.598 0.17 142.1)',
    },
    preview: '🌲',
    locked: true,
    unlockCondition: {
      type: 'streak',
      value: 3,
      description: 'Win 3 games in a row',
    },
  },

  neon: {
    id: 'neon',
    name: 'Neon City',
    description: 'Cyberpunk-inspired with glowing effects',
    category: 'premium',
    board: {
      lightSquare: {
        from: 'rgb(236, 72, 153)', // pink-500
        to: 'rgb(219, 39, 119)',   // pink-600
      },
      darkSquare: {
        from: 'rgb(17, 24, 39)',
        to: 'rgb(3, 7, 18)',
      },
      border: 'rgb(249, 168, 212)', // pink-300
      selectedRing: 'rgb(34, 211, 238)', // cyan-400
      highlightedRing: 'rgb(168, 85, 247)', // purple-500
      possibleMove: 'rgb(129, 140, 248)', // indigo-400
      possibleMoveGlow: 'rgba(129, 140, 248, 0.8)',
      arrow: {
        stroke: 'rgb(34, 211, 238)', // cyan-400
        fill: 'rgba(34, 211, 238, 0.9)', // cyan-400 with transparency
        glow: 'rgba(34, 211, 238, 0.4)', // cyan-400 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(236, 72, 153)',
        gradient: {
          from: 'rgb(251, 207, 232)',
          to: 'rgb(219, 39, 119)',
        },
        border: 'rgb(249, 168, 212)',
        crown: 'rgb(34, 211, 238)',
      },
      black: {
        base: 'rgb(79, 70, 229)',
        gradient: {
          from: 'rgb(129, 140, 248)',
          to: 'rgb(55, 48, 163)',
        },
        border: 'rgb(165, 180, 252)',
        crown: 'rgb(34, 211, 238)',
      },
    },
    ui: {
      background: 'oklch(0.1 0 0)',
      foreground: 'oklch(0.985 0 0)',
      card: 'oklch(0.15 0 0)',
      cardForeground: 'oklch(0.985 0 0)',
      primary: 'oklch(0.702 0.241 0.935)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.2 0.05 300)',
      secondaryForeground: 'oklch(0.985 0 0)',
      accent: 'oklch(0.657 0.236 275.75)',
      accentForeground: 'oklch(0.985 0 0)',
      muted: 'oklch(0.25 0 0)',
      mutedForeground: 'oklch(0.708 0 0)',
      border: 'oklch(0.702 0.241 0.935 / 30%)',
      ring: 'oklch(0.702 0.241 0.935)',
    },
    preview: '💫',
    locked: true,
    unlockCondition: {
      type: 'achievement',
      value: 'perfect_game',
      description: 'Win a game without losing any pieces',
    },
  },

  marble: {
    id: 'marble',
    name: 'Marble Elite',
    description: 'Luxurious marble finish',
    category: 'premium',
    board: {
      lightSquare: {
        from: 'rgb(248, 250, 252)',
        to: 'rgb(241, 245, 249)',
      },
      darkSquare: {
        from: 'rgb(51, 65, 85)',
        to: 'rgb(30, 41, 59)',
      },
      border: 'rgb(203, 213, 225)',
      selectedRing: 'rgb(251, 191, 36)',
      highlightedRing: 'rgb(217, 119, 6)',
      possibleMove: 'rgb(251, 191, 36)',
      possibleMoveGlow: 'rgba(251, 191, 36, 0.5)',
      arrow: {
        stroke: 'rgb(217, 119, 6)', // amber-600
        fill: 'rgba(217, 119, 6, 0.8)', // amber-600 with transparency
        glow: 'rgba(217, 119, 6, 0.3)', // amber-600 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(225, 29, 72)',
        gradient: {
          from: 'rgb(244, 63, 94)',
          to: 'rgb(190, 18, 60)',
        },
        border: 'rgb(159, 18, 57)',
        crown: 'rgb(217, 119, 6)',
      },
      black: {
        base: 'rgb(15, 23, 42)',
        gradient: {
          from: 'rgb(30, 41, 59)',
          to: 'rgb(2, 6, 23)',
        },
        border: 'rgb(2, 6, 23)',
        crown: 'rgb(217, 119, 6)',
      },
    },
    ui: {
      background: 'oklch(0.99 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.281 0.052 257.11)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.96 0 0)',
      secondaryForeground: 'oklch(0.281 0.052 257.11)',
      accent: 'oklch(0.96 0 0)',
      accentForeground: 'oklch(0.281 0.052 257.11)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.281 0.052 257.11)',
    },
    preview: '🏛️',
    locked: true,
    unlockCondition: {
      type: 'purchase',
      value: 'premium',
      description: 'Unlock with premium membership',
    },
  },

  holiday: {
    id: 'holiday',
    name: 'Winter Holiday',
    description: 'Festive seasonal theme',
    category: 'seasonal',
    board: {
      lightSquare: {
        from: 'rgb(220, 38, 38)',
        to: 'rgb(185, 28, 28)',
      },
      darkSquare: {
        from: 'rgb(22, 101, 52)',
        to: 'rgb(20, 83, 45)',
      },
      border: 'rgb(217, 119, 6)',
      selectedRing: 'rgb(251, 191, 36)',
      highlightedRing: 'rgb(250, 204, 21)',
      possibleMove: 'rgb(254, 240, 138)',
      possibleMoveGlow: 'rgba(254, 240, 138, 0.7)',
      arrow: {
        stroke: 'rgb(251, 191, 36)', // amber-400
        fill: 'rgba(251, 191, 36, 0.8)', // amber-400 with transparency
        glow: 'rgba(251, 191, 36, 0.3)', // amber-400 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(220, 38, 38)',
        gradient: {
          from: 'rgb(239, 68, 68)',
          to: 'rgb(185, 28, 28)',
        },
        border: 'rgb(153, 27, 27)',
        crown: 'rgb(254, 240, 138)',
      },
      black: {
        base: 'rgb(248, 250, 252)',
        gradient: {
          from: 'rgb(255, 255, 255)',
          to: 'rgb(226, 232, 240)',
        },
        border: 'rgb(203, 213, 225)',
        crown: 'rgb(251, 191, 36)',
      },
    },
    ui: {
      background: 'oklch(0.985 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.577 0.245 27.325)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.598 0.17 142.1)',
      secondaryForeground: 'oklch(0.985 0 0)',
      accent: 'oklch(0.829 0.189 84.429)',
      accentForeground: 'oklch(0.145 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.577 0.245 27.325)',
    },
    preview: '🎄',
    locked: true,
    unlockCondition: {
      type: 'code',
      value: 'HOLIDAY2024',
      description: 'Enter special code',
    },
  },

  // Free sample themes
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    description: 'Warm sunset colors',
    category: 'classic',
    board: {
      lightSquare: {
        from: 'rgb(254, 215, 170)', // orange-200
        to: 'rgb(251, 146, 60)',    // orange-400
      },
      darkSquare: {
        from: 'rgb(220, 38, 38)',   // red-600
        to: 'rgb(153, 27, 27)',     // red-800
      },
      border: 'rgb(127, 29, 29)',
      selectedRing: 'rgb(251, 146, 60)',
      highlightedRing: 'rgb(254, 240, 138)',
      possibleMove: 'rgb(254, 215, 170)',
      possibleMoveGlow: 'rgba(254, 215, 170, 0.6)',
      arrow: {
        stroke: 'rgb(251, 146, 60)', // orange-400
        fill: 'rgba(251, 146, 60, 0.8)', // orange-400 with transparency
        glow: 'rgba(251, 146, 60, 0.3)', // orange-400 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(234, 88, 12)',
        gradient: {
          from: 'rgb(251, 146, 60)',
          to: 'rgb(194, 65, 12)',
        },
        border: 'rgb(154, 52, 18)',
        crown: 'rgb(254, 240, 138)',
      },
      black: {
        base: 'rgb(75, 85, 99)',
        gradient: {
          from: 'rgb(107, 114, 128)',
          to: 'rgb(55, 65, 81)',
        },
        border: 'rgb(31, 41, 55)',
        crown: 'rgb(254, 240, 138)',
      },
    },
    ui: {
      background: 'oklch(0.99 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.646 0.222 41.116)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.97 0.02 41)',
      secondaryForeground: 'oklch(0.145 0 0)',
      accent: 'oklch(0.769 0.188 70.08)',
      accentForeground: 'oklch(0.145 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.646 0.222 41.116)',
    },
    preview: '🌅',
    locked: false,
  },

  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean black and white',
    category: 'modern',
    board: {
      lightSquare: {
        from: 'rgb(255, 255, 255)',
        to: 'rgb(243, 244, 246)',
      },
      darkSquare: {
        from: 'rgb(55, 65, 81)',
        to: 'rgb(31, 41, 55)',
      },
      border: 'rgb(17, 24, 39)',
      selectedRing: 'rgb(99, 102, 241)',
      highlightedRing: 'rgb(139, 92, 246)',
      possibleMove: 'rgb(167, 139, 250)',
      possibleMoveGlow: 'rgba(167, 139, 250, 0.4)',
      arrow: {
        stroke: 'rgb(99, 102, 241)', // indigo-500
        fill: 'rgba(99, 102, 241, 0.8)', // indigo-500 with transparency
        glow: 'rgba(99, 102, 241, 0.3)', // indigo-500 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(239, 68, 68)',
        gradient: {
          from: 'rgb(252, 165, 165)',
          to: 'rgb(220, 38, 38)',
        },
        border: 'rgb(185, 28, 28)',
        crown: 'rgb(99, 102, 241)',
      },
      black: {
        base: 'rgb(17, 24, 39)',
        gradient: {
          from: 'rgb(31, 41, 55)',
          to: 'rgb(3, 7, 18)',
        },
        border: 'rgb(0, 0, 0)',
        crown: 'rgb(99, 102, 241)',
      },
    },
    ui: {
      background: 'oklch(0.995 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.145 0 0)',
      primaryForeground: 'oklch(0.995 0 0)',
      secondary: 'oklch(0.95 0 0)',
      secondaryForeground: 'oklch(0.145 0 0)',
      accent: 'oklch(0.95 0 0)',
      accentForeground: 'oklch(0.145 0 0)',
      muted: 'oklch(0.96 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.145 0 0)',
    },
    preview: '⚫',
    locked: false,
  },

  pastel: {
    id: 'pastel',
    name: 'Pastel Dreams',
    description: 'Soft pastel colors',
    category: 'modern',
    board: {
      lightSquare: {
        from: 'rgb(254, 202, 202)', // red-200
        to: 'rgb(252, 165, 165)',   // red-300
      },
      darkSquare: {
        from: 'rgb(196, 181, 253)', // violet-300
        to: 'rgb(167, 139, 250)',   // violet-400
      },
      border: 'rgb(139, 92, 246)',
      selectedRing: 'rgb(244, 114, 182)',
      highlightedRing: 'rgb(250, 204, 21)',
      possibleMove: 'rgb(187, 247, 208)',
      possibleMoveGlow: 'rgba(187, 247, 208, 0.7)',
      arrow: {
        stroke: 'rgb(244, 114, 182)', // pink-400
        fill: 'rgba(244, 114, 182, 0.8)', // pink-400 with transparency
        glow: 'rgba(244, 114, 182, 0.3)', // pink-400 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(244, 114, 182)',
        gradient: {
          from: 'rgb(251, 207, 232)',
          to: 'rgb(236, 72, 153)',
        },
        border: 'rgb(219, 39, 119)',
        crown: 'rgb(250, 204, 21)',
      },
      black: {
        base: 'rgb(147, 197, 253)',
        gradient: {
          from: 'rgb(191, 219, 254)',
          to: 'rgb(96, 165, 250)',
        },
        border: 'rgb(59, 130, 246)',
        crown: 'rgb(250, 204, 21)',
      },
    },
    ui: {
      background: 'oklch(0.995 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.702 0.241 0.935)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.95 0.05 330)',
      secondaryForeground: 'oklch(0.145 0 0)',
      accent: 'oklch(0.85 0.15 330)',
      accentForeground: 'oklch(0.145 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.702 0.241 0.935)',
    },
    preview: '🌸',
    locked: false,
  },

  retro: {
    id: 'retro',
    name: 'Retro Arcade',
    description: '80s arcade vibes',
    category: 'classic',
    board: {
      lightSquare: {
        from: 'rgb(254, 240, 138)', // yellow-200
        to: 'rgb(253, 224, 71)',    // yellow-300
      },
      darkSquare: {
        from: 'rgb(34, 197, 94)',   // green-500
        to: 'rgb(22, 163, 74)',     // green-600
      },
      border: 'rgb(21, 128, 61)',
      selectedRing: 'rgb(236, 72, 153)',
      highlightedRing: 'rgb(34, 211, 238)',
      possibleMove: 'rgb(251, 146, 60)',
      possibleMoveGlow: 'rgba(251, 146, 60, 0.6)',
      arrow: {
        stroke: 'rgb(236, 72, 153)', // pink-500
        fill: 'rgba(236, 72, 153, 0.8)', // pink-500 with transparency
        glow: 'rgba(236, 72, 153, 0.3)', // pink-500 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(239, 68, 68)',
        gradient: {
          from: 'rgb(248, 113, 113)',
          to: 'rgb(220, 38, 38)',
        },
        border: 'rgb(185, 28, 28)',
        crown: 'rgb(250, 204, 21)',
      },
      black: {
        base: 'rgb(99, 102, 241)',
        gradient: {
          from: 'rgb(129, 140, 248)',
          to: 'rgb(79, 70, 229)',
        },
        border: 'rgb(55, 48, 163)',
        crown: 'rgb(250, 204, 21)',
      },
    },
    ui: {
      background: 'oklch(0.985 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.598 0.17 142.1)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.829 0.189 84.429)',
      secondaryForeground: 'oklch(0.145 0 0)',
      accent: 'oklch(0.702 0.241 0.935)',
      accentForeground: 'oklch(0.985 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.598 0.17 142.1)',
    },
    preview: '👾',
    locked: false,
  },

  desert: {
    id: 'desert',
    name: 'Desert Sand',
    description: 'Warm desert tones',
    category: 'classic',
    board: {
      lightSquare: {
        from: 'rgb(254, 243, 199)', // amber-100
        to: 'rgb(253, 230, 138)',   // amber-200
      },
      darkSquare: {
        from: 'rgb(180, 83, 9)',    // amber-700
        to: 'rgb(146, 64, 14)',     // amber-800
      },
      border: 'rgb(113, 63, 18)',
      selectedRing: 'rgb(234, 88, 12)',
      highlightedRing: 'rgb(251, 191, 36)',
      possibleMove: 'rgb(253, 186, 116)',
      possibleMoveGlow: 'rgba(253, 186, 116, 0.5)',
      arrow: {
        stroke: 'rgb(234, 88, 12)', // orange-600
        fill: 'rgba(234, 88, 12, 0.8)', // orange-600 with transparency
        glow: 'rgba(234, 88, 12, 0.3)', // orange-600 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(194, 65, 12)',
        gradient: {
          from: 'rgb(234, 88, 12)',
          to: 'rgb(154, 52, 18)',
        },
        border: 'rgb(124, 45, 18)',
        crown: 'rgb(253, 230, 138)',
      },
      black: {
        base: 'rgb(120, 113, 108)',
        gradient: {
          from: 'rgb(168, 162, 158)',
          to: 'rgb(87, 83, 78)',
        },
        border: 'rgb(68, 64, 60)',
        crown: 'rgb(253, 230, 138)',
      },
    },
    ui: {
      background: 'oklch(0.99 0.01 70)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.646 0.222 41.116)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.9 0.05 70)',
      secondaryForeground: 'oklch(0.145 0 0)',
      accent: 'oklch(0.769 0.188 70.08)',
      accentForeground: 'oklch(0.145 0 0)',
      muted: 'oklch(0.95 0.02 70)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.9 0.03 70)',
      ring: 'oklch(0.646 0.222 41.116)',
    },
    preview: '🏜️',
    locked: false,
  },

  lavender: {
    id: 'lavender',
    name: 'Lavender Fields',
    description: 'Calming purple hues',
    category: 'modern',
    board: {
      lightSquare: {
        from: 'rgb(233, 213, 255)', // purple-200
        to: 'rgb(216, 180, 254)',   // purple-300
      },
      darkSquare: {
        from: 'rgb(126, 34, 206)',  // purple-700
        to: 'rgb(107, 33, 168)',    // purple-800
      },
      border: 'rgb(88, 28, 135)',
      selectedRing: 'rgb(217, 70, 239)',
      highlightedRing: 'rgb(240, 171, 252)',
      possibleMove: 'rgb(243, 232, 255)',
      possibleMoveGlow: 'rgba(243, 232, 255, 0.7)',
      arrow: {
        stroke: 'rgb(217, 70, 239)', // fuchsia-500
        fill: 'rgba(217, 70, 239, 0.8)', // fuchsia-500 with transparency
        glow: 'rgba(217, 70, 239, 0.3)', // fuchsia-500 glow
      },
    },
    pieces: {
      red: {
        base: 'rgb(244, 63, 94)',
        gradient: {
          from: 'rgb(251, 113, 133)',
          to: 'rgb(225, 29, 72)',
        },
        border: 'rgb(190, 18, 60)',
        crown: 'rgb(250, 204, 21)',
      },
      black: {
        base: 'rgb(88, 28, 135)',
        gradient: {
          from: 'rgb(107, 33, 168)',
          to: 'rgb(59, 7, 100)',
        },
        border: 'rgb(46, 16, 101)',
        crown: 'rgb(250, 204, 21)',
      },
    },
    ui: {
      background: 'oklch(0.995 0 0)',
      foreground: 'oklch(0.145 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0 0)',
      primary: 'oklch(0.672 0.196 305.82)',
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.95 0.04 305)',
      secondaryForeground: 'oklch(0.145 0 0)',
      accent: 'oklch(0.85 0.15 305)',
      accentForeground: 'oklch(0.145 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.556 0 0)',
      border: 'oklch(0.922 0 0)',
      ring: 'oklch(0.672 0.196 305.82)',
    },
    preview: '💜',
    locked: false,
  },
};