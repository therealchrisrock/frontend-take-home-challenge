import type { Variants } from "framer-motion";

/**
 * Reusable animation variants for consistent motion throughout the app
 */

// Fade animations
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export const fadeInScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: {
      duration: 0.15
    }
  }
};

// Slide animations
export const slideInFromRight: Variants = {
  initial: { x: "100%", opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300
    }
  },
  exit: { x: "100%", opacity: 0 }
};

export const slideInFromLeft: Variants = {
  initial: { x: "-100%", opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300
    }
  },
  exit: { x: "-100%", opacity: 0 }
};

export const slideInFromTop: Variants = {
  initial: { y: "-100%", opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300
    }
  },
  exit: { y: "-100%", opacity: 0 }
};

export const slideInFromBottom: Variants = {
  initial: { y: "100%", opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300
    }
  },
  exit: { y: "100%", opacity: 0 }
};

// Dropdown menu animations
export const dropdownMenu: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.95,
    y: -10
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.1
    }
  }
};

// Stagger children animations
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { opacity: 0, y: 10 }
};

// Tab animations
export const tabContent: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

// Toast/Notification animations
export const toastSlideIn: Variants = {
  initial: { 
    x: "100%",
    opacity: 0
  },
  animate: { 
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300
    }
  },
  exit: { 
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

// Game piece animations
export const pieceDrag = {
  whileDrag: { 
    scale: 1.1,
    rotate: 5,
    zIndex: 100,
    cursor: "grabbing"
  },
  whileHover: {
    scale: 1.05,
    transition: {
      duration: 0.2
    }
  }
};

export const pieceCapture: Variants = {
  initial: { scale: 1, opacity: 1 },
  exit: { 
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Sidebar animations
export const sidebarCollapse: Variants = {
  expanded: { 
    width: "12rem",
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  collapsed: { 
    width: "4rem",
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Pulse animation for indicators
export const pulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Loading skeleton shimmer
export const shimmer: Variants = {
  initial: {
    backgroundPosition: "-200% 0"
  },
  animate: {
    backgroundPosition: "200% 0",
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }
  }
};