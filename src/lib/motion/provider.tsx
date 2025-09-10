"use client";

import { LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

// Import features directly (the distribution path has changed in newer versions)
import { domAnimation } from "framer-motion";

// For development, you can use domMax for all features (larger bundle)
// import { domMax } from "framer-motion";

interface MotionProviderProps {
  children: ReactNode;
  strict?: boolean;
}

/**
 * LazyMotion provider that enables tree-shaking and reduces bundle size
 * from ~34kb to ~5kb by loading only the features you need
 */
export function MotionProvider({ children, strict = false }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict={strict}>
      {children}
    </LazyMotion>
  );
}