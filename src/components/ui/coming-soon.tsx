"use client";

import { cn } from "~/lib/utils";
import { Sparkles, Snowflake, Clock, Construction } from "lucide-react";
import { useEffect, useState } from "react";

interface ComingSoonProps {
  message?: string;
  description?: string;
  className?: string;
  showIcon?: boolean;
  variant?: "default" | "minimal" | "detailed";
  icon?: "sparkles" | "snowflake" | "clock" | "construction";
  children?: React.ReactNode;
}

export function ComingSoon({
  message = "Coming Soon",
  description,
  className,
  showIcon = true,
  variant = "default",
  icon = "sparkles",
  children,
}: ComingSoonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const IconComponent = {
    sparkles: Sparkles,
    snowflake: Snowflake,
    clock: Clock,
    construction: Construction,
  }[icon];

  const renderContent = () => {
    if (variant === "minimal") {
      return (
        <div className="flex items-center gap-2">
          {showIcon && (
            <IconComponent className="h-5 w-5 animate-pulse text-white/90 drop-shadow-md" />
          )}
          <span className="text-sm font-semibold text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            {message}
          </span>
        </div>
      );
    }

    if (variant === "detailed") {
      return (
        <div className="mx-auto max-w-sm space-y-3 p-6 text-center">
          {showIcon && (
            <div className="relative inline-block">
              <IconComponent className="h-12 w-12 animate-pulse text-white/90 drop-shadow-lg" />
              <div className="absolute inset-0 animate-pulse bg-white/20 blur-xl" />
            </div>
          )}
          <h3 className="text-xl font-bold text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            {message}
          </h3>
          {description && (
            <p className="text-sm text-white/80 drop-shadow-md">
              {description}
            </p>
          )}
          <div className="flex justify-center gap-1">
            <div
              className="h-1 w-1 animate-bounce rounded-full bg-white/60"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="h-1 w-1 animate-bounce rounded-full bg-white/60"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="h-1 w-1 animate-bounce rounded-full bg-white/60"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      );
    }

    // Default variant
    return (
      <div className="space-y-2 text-center">
        {showIcon && (
          <IconComponent className="mx-auto h-8 w-8 animate-pulse text-white/90 drop-shadow-lg" />
        )}
        <p className="text-xl font-bold text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          {message}
        </p>
        {description && (
          <p className="text-sm text-white/80 drop-shadow-lg">{description}</p>
        )}
      </div>
    );
  };

  return (
    <div className={cn("relative", className)}>
      {/* Render children if provided (the content to be overlaid) */}
      {children}

      {/* Frosty overlay */}
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center",
          "bg-gradient-to-br from-white/30 via-blue-100/20 to-slate-200/25",
          "backdrop-blur-md",
          "border border-white/10",
          "shadow-inner",
          "transition-all duration-500",
          mounted ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Animated frost particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="animate-float absolute top-0 left-1/4 h-2 w-2 rounded-full bg-white/40"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="animate-float absolute top-1/3 right-1/3 h-1.5 w-1.5 rounded-full bg-white/30"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="animate-float absolute bottom-1/4 left-1/3 h-1 w-1 rounded-full bg-white/50"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="animate-float absolute top-1/2 right-1/4 h-1.5 w-1.5 rounded-full bg-blue-200/30"
            style={{ animationDelay: "1.5s" }}
          />
          <div
            className="animate-float absolute right-1/2 bottom-1/3 h-2 w-2 rounded-full bg-blue-100/40"
            style={{ animationDelay: "0.5s" }}
          />
        </div>

        {/* Shimmer effect */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)",
            animation: "shimmer 3s infinite",
          }}
        />

        {/* Content */}
        <div className="relative z-20">{renderContent()}</div>
      </div>

      {/* Add keyframes for animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(120deg);
          }
          66% {
            transform: translateY(5px) rotate(240deg);
          }
        }
      `}</style>
    </div>
  );
}
