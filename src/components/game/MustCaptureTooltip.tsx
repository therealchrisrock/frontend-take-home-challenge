"use client";

import { useEffect } from "react";
import { cn } from "~/lib/utils";

interface MustCaptureTooltipProps {
  show: boolean;
  position?: { x: number; y: number };
  onClose: () => void;
}

export function MustCaptureTooltip({
  show,
  position,
  onClose,
}: MustCaptureTooltipProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show || !position) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-50 transform transition-all duration-200",
        "border-2 border-orange-400 bg-orange-100 text-orange-800",
        "rounded-lg px-3 py-2 text-xs font-medium shadow-lg",
        "flex items-center gap-2",
        show ? "scale-100 opacity-100" : "scale-95 opacity-0",
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -120%)",
      }}
    >
      <div className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
      <span>You must capture!</span>
      <div
        className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 transform"
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "5px solid rgb(251 146 60)",
        }}
      />
    </div>
  );
}
