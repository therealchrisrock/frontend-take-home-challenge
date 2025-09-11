"use client";

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

export function AiThinkingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{ opacity: 0.3 }}
        animate={{
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
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative"
      >
        <Lightbulb 
          className="h-5 w-5 text-amber-400"
          fill="currentColor"
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.6, 0.2, 0.8, 0, 0.6, 0],
            scale: [1, 1.2, 1.1, 1.3, 0.9, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="h-8 w-8 rounded-full bg-amber-400/20 blur-md" />
        </motion.div>
      </motion.div>
      <span className="text-xs text-gray-500">Thinking...</span>
    </div>
  );
}