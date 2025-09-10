"use client";

import { useState } from "react";
import { m, AnimatePresence, LayoutGroup } from "framer-motion";
import { Label } from "~/components/ui/label";
import { Shuffle } from "lucide-react";

interface MotionColorSelectorProps {
  value: "red" | "black" | "random";
  onChange: (value: "red" | "black" | "random") => void;
}

/**
 * Animated color selector with smooth swapping transitions
 * Inspired by Framer Motion swapping elements example
 */
export function MotionColorSelector({
  value,
  onChange,
}: MotionColorSelectorProps) {
  const [isHovering, setIsHovering] = useState<string | null>(null);

  const colors = [
    { id: "red", label: "Red", color: "bg-red-600", border: "border-red-700" },
    {
      id: "black",
      label: "Black",
      color: "bg-gray-800",
      border: "border-gray-900",
    },
    { id: "random", label: "Random", icon: true },
  ] as const;

  const selectedIndex = colors.findIndex((c) => c.id === value);

  return (
    <div>
      <Label className="mb-2 block text-sm text-gray-700">Your Color</Label>

      <LayoutGroup>
        <div
          className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1"
          style={{ minHeight: "44px" }}
        >
          {/* Color options */}
          {colors.map((color) => (
            <div key={color.id} className="relative">
              {/* Animated background for selected item */}
              {value === color.id && (
                <m.div
                  layoutId="colorSelector"
                  className="absolute inset-0 rounded-md border border-gray-200 bg-white shadow-sm"
                  initial={false}
                  transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                  }}
                />
              )}
              <m.button
                onClick={() => onChange(color.id)}
                onHoverStart={() => setIsHovering(color.id)}
                onHoverEnd={() => setIsHovering(null)}
                className="relative z-10 flex w-full items-center justify-center gap-1 rounded-md px-2 py-2 sm:gap-2 sm:px-3"
                whileTap={{ scale: 0.98 }}
              >
                <AnimatePresence mode="wait">
                  {color.icon ? (
                    <m.div
                      key="random-icon"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{
                        scale: 1,
                        rotate: 0,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        },
                      }}
                      exit={{ scale: 0, rotate: 180 }}
                    >
                      <Shuffle
                        className={`h-5 w-5 transition-colors ${
                          value === "random" ? "text-blue-600" : "text-gray-600"
                        }`}
                      />
                    </m.div>
                  ) : (
                    <m.div
                      key={`${color.id}-piece`}
                      className="relative"
                      layout
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{
                        scale: 1,
                        rotate: 0,
                      }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <m.div
                        className={`h-5 w-5 rounded-full ${color.color} border-2 ${color.border}`}
                        animate={{
                          scale:
                            isHovering === color.id
                              ? 1.2
                              : value === color.id
                                ? 1.1
                                : 1,
                          y: value === color.id ? -2 : 0,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      />
                      {value === color.id && (
                        <m.div
                          className={`absolute inset-0 rounded-full ${color.color} opacity-30`}
                          initial={{ scale: 0.8 }}
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 0, 0.3],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                      {/* Crown icon for selected piece */}
                      <AnimatePresence>
                        {value === color.id && (
                          <m.div
                            className="absolute -top-2 left-1/2 -translate-x-1/2"
                            initial={{ scale: 0, y: 10, opacity: 0 }}
                            animate={{
                              scale: 0.7,
                              y: -6,
                              opacity: 1,
                              rotate: [0, -10, 10, -10, 10, 0],
                            }}
                            exit={{ scale: 0, y: 10, opacity: 0 }}
                            transition={{
                              rotate: {
                                delay: 0.3,
                                duration: 0.5,
                                ease: "easeInOut",
                              },
                              default: {
                                type: "spring",
                                stiffness: 400,
                                damping: 25,
                              },
                            }}
                          >
                            <span className="text-yellow-500">👑</span>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </m.div>
                  )}
                </AnimatePresence>

                <m.span
                  className={`text-xs font-medium transition-colors sm:text-sm ${
                    value === color.id ? "text-gray-900" : "text-gray-600"
                  }`}
                  animate={{
                    y: value === color.id ? -1 : 0,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                  }}
                >
                  {color.label}
                </m.span>
              </m.button>
            </div>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}
