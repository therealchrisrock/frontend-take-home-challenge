/**
 * Central export for all motion utilities
 * This provides a clean API for importing motion features throughout the app
 */

export { MotionProvider } from "./provider";
export * from "./variants";
export * from "./dynamic";

// Re-export m component for use with LazyMotion
// Using 'm' instead of 'motion' reduces bundle size significantly
export {
  m,
  AnimatePresence,
  LayoutGroup,
  useAnimation,
  useInView,
} from "framer-motion";
