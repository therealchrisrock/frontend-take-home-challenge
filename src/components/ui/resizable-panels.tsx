"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { cn } from "~/lib/utils";

interface ResizablePanelsProps {
  children: [ReactNode, ReactNode];
  direction?: "horizontal" | "vertical";
  defaultSize?: number; // 0-100, percentage for first panel
  minSize?: number; // 0-100, minimum percentage for each panel (defaults to 10)
  className?: string;
  panelClassName?: string;
  resizerClassName?: string;
}

export function ResizablePanels({
  children,
  direction = "vertical",
  defaultSize = 50,
  minSize = 10,
  className,
  panelClassName,
  resizerClassName,
}: ResizablePanelsProps) {
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();

        let percentage: number;
        if (direction === "horizontal") {
          percentage = ((e.clientX - rect.left) / rect.width) * 100;
        } else {
          percentage = ((e.clientY - rect.top) / rect.height) * 100;
        }

        // Clamp between minSize and (100 - minSize) to ensure both panels respect minimum size
        percentage = Math.max(minSize, Math.min(100 - minSize, percentage));
        setSize(percentage);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [direction],
  );

  const flexDirection = direction === "horizontal" ? "flex-row" : "flex-col";
  const resizerCursor =
    direction === "horizontal" ? "cursor-col-resize" : "cursor-row-resize";
  const resizerSize = direction === "horizontal" ? "w-1 h-full" : "w-full h-1";

  return (
    <div
      ref={containerRef}
      className={cn("flex h-full overflow-hidden", flexDirection, className)}
    >
      {/* First Panel */}
      <div
        className={cn("overflow-hidden", panelClassName)}
        style={{
          [direction === "horizontal" ? "width" : "height"]: `${size}%`,
        }}
      >
        {children[0]}
      </div>

      {/* Resizer */}
      <div
        className={cn(
          "bg-border hover:bg-border/80 group shrink-0 transition-colors",
          resizerCursor,
          resizerSize,
          isDragging && "bg-border/80",
          resizerClassName,
        )}
        onMouseDown={handleMouseDown}
      >
        <div
          className={cn(
            "flex h-full w-full items-center justify-center",
            "group-hover:bg-accent/50 transition-colors",
          )}
        >
          {direction === "horizontal" ? (
            <div className="flex flex-col gap-1">
              <div className="bg-foreground/40 h-1 w-0.5 rounded" />
              <div className="bg-foreground/40 h-1 w-0.5 rounded" />
              <div className="bg-foreground/40 h-1 w-0.5 rounded" />
            </div>
          ) : (
            <div className="flex gap-1">
              <div className="bg-foreground/40 h-0.5 w-1 rounded" />
              <div className="bg-foreground/40 h-0.5 w-1 rounded" />
              <div className="bg-foreground/40 h-0.5 w-1 rounded" />
            </div>
          )}
        </div>
      </div>

      {/* Second Panel */}
      <div
        className={cn("overflow-hidden", panelClassName)}
        style={{
          [direction === "horizontal" ? "width" : "height"]: `${100 - size}%`,
        }}
      >
        {children[1]}
      </div>
    </div>
  );
}
