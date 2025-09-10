import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Utility functions for dynamically importing Framer Motion components
 * These help reduce initial bundle size by loading animation features on-demand
 */

// AnimatePresence - needed for exit animations
export const DynamicAnimatePresence = dynamic(
  () =>
    import("framer-motion").then((mod) => ({
      default: mod.AnimatePresence,
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

// LayoutGroup - needed for shared layout animations
export const DynamicLayoutGroup = dynamic(
  () =>
    import("framer-motion").then((mod) => ({
      default: mod.LayoutGroup,
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

// Reorder components for drag-to-reorder functionality
export const DynamicReorder = {
  Group: dynamic(
    () =>
      import("framer-motion").then((mod) => ({
        default: mod.Reorder.Group,
      })),
    { ssr: false },
  ),
  Item: dynamic(
    () =>
      import("framer-motion").then((mod) => ({
        default: mod.Reorder.Item,
      })),
    { ssr: false },
  ),
};

/**
 * Helper to create a dynamic motion component
 * Usage: const MotionDiv = createDynamicMotion('div');
 */
export function createDynamicMotion<T extends keyof JSX.IntrinsicElements>(
  element: T,
): ComponentType<any> {
  return dynamic(
    () =>
      import("framer-motion").then((mod) => ({
        default: mod.motion[element] as ComponentType<any>,
      })),
    {
      ssr: false,
      loading: () => null,
    },
  );
}

/**
 * Pre-defined dynamic motion components for common HTML elements
 * These are loaded on-demand when used
 */
export const DynamicMotion = {
  div: createDynamicMotion("div"),
  span: createDynamicMotion("span"),
  button: createDynamicMotion("button"),
  a: createDynamicMotion("a"),
  section: createDynamicMotion("section"),
  article: createDynamicMotion("article"),
  header: createDynamicMotion("header"),
  footer: createDynamicMotion("footer"),
  nav: createDynamicMotion("nav"),
  aside: createDynamicMotion("aside"),
  main: createDynamicMotion("main"),
  ul: createDynamicMotion("ul"),
  li: createDynamicMotion("li"),
  img: createDynamicMotion("img"),
  svg: createDynamicMotion("svg"),
};

/**
 * Helper to lazy load heavy animation features
 * Use this when you need complex animations that aren't needed initially
 */
export async function loadAnimationFeatures() {
  const {
    AnimatePresence,
    motion,
    useAnimation,
    useInView,
    useScroll,
    useTransform,
    useSpring,
    useMotionValue,
  } = await import("framer-motion");

  return {
    AnimatePresence,
    motion,
    useAnimation,
    useInView,
    useScroll,
    useTransform,
    useSpring,
    useMotionValue,
  };
}
