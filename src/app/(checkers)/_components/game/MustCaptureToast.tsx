"use client";

import { useEffect } from "react";
import { cn } from "~/lib/utils";

interface MustCaptureToastProps {
  show: boolean;
  onClose: () => void;
}

export function MustCaptureToast({ show, onClose }: MustCaptureToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 transform transition-all duration-300",
        "border-2 border-orange-400 bg-orange-100 text-orange-800",
        "rounded-lg px-4 py-2 text-sm font-medium shadow-lg",
        "flex items-center gap-2",
        show
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-full opacity-0",
      )}
    >
      <div className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
      <span>You must capture when possible!</span>
    </div>
  );
}
