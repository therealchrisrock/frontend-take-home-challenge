"use client";

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

interface AiThinkingIndicatorProps {
  isVisible?: boolean;
}

export function AiThinkingIndicator({ isVisible = true }: AiThinkingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 justify-between h-5 min-w-0">
      <motion.div
        className="relative"
        animate={{ 
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? 1 : 0.8
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <motion.div
          animate={isVisible ? {
            opacity: [0.3, 1, 0.3, 1, 0.1, 1, 0.3],
            scale: [1, 1.05, 1, 1.05, 0.95, 1.05, 1],
            filter: [
              "drop-shadow(0 0 0px rgba(251, 191, 36, 0))",
              "drop-shadow(0 0 20px rgba(251, 191, 36, 1))",
              "drop-shadow(0 0 5px rgba(251, 191, 36, 0.5))",
              "drop-shadow(0 0 25px rgba(251, 191, 36, 1))",
              "drop-shadow(0 0 2px rgba(251, 191, 36, 0.2))",
              "drop-shadow(0 0 20px rgba(251, 191, 36, 1))",
              "drop-shadow(0 0 0px rgba(251, 191, 36, 0))",
            ],
          } : {}}
          transition={isVisible ? {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          } : { duration: 0 }}
          className="relative"
        >
        <Lightbulb
          className="h-5 w-5 text-primary/50"
          fill="currentColor"
        />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={isVisible ? {
              opacity: [0, 0.6, 0.2, 0.8, 0, 0.6, 0],
              scale: [1, 1.2, 1.1, 1.3, 0.9, 1.2, 1],
            } : {}}
            transition={isVisible ? {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            } : { duration: 0 }}
          >
            <div className="h-8 w-8 rounded-full bg-primary/20 blur-md" />
          </motion.div>
        </motion.div>
      </motion.div>
      <span 
        className="text-xs text-gray-500 min-w-[60px]"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out'
        }}
      >
        {isVisible ? "Thinking..." : ""}
      </span>
    </div>
  );
}