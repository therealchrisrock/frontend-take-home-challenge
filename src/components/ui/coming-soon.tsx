'use client';

import { cn } from '~/lib/utils';
import { Sparkles, Snowflake, Clock, Construction } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ComingSoonProps {
  message?: string;
  description?: string;
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'minimal' | 'detailed';
  icon?: 'sparkles' | 'snowflake' | 'clock' | 'construction';
  children?: React.ReactNode;
}

export function ComingSoon({
  message = 'Coming Soon',
  description,
  className,
  showIcon = true,
  variant = 'default',
  icon = 'sparkles',
  children
}: ComingSoonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const IconComponent = {
    sparkles: Sparkles,
    snowflake: Snowflake,
    clock: Clock,
    construction: Construction
  }[icon];

  const renderContent = () => {
    if (variant === 'minimal') {
      return (
        <div className="flex items-center gap-2">
          {showIcon && (
            <IconComponent className="w-5 h-5 text-white/90 animate-pulse drop-shadow-md" />
          )}
          <span className="text-sm font-semibold text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            {message}
          </span>
        </div>
      );
    }

    if (variant === 'detailed') {
      return (
        <div className="text-center space-y-3 max-w-sm mx-auto p-6">
          {showIcon && (
            <div className="relative inline-block">
              <IconComponent className="w-12 h-12 text-white/90 animate-pulse drop-shadow-lg" />
              <div className="absolute inset-0 blur-xl bg-white/20 animate-pulse" />
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
          <div className="flex gap-1 justify-center">
            <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      );
    }

    // Default variant
    return (
      <div className="text-center space-y-2">
        {showIcon && (
          <IconComponent className="w-8 h-8 text-white/90 mx-auto animate-pulse drop-shadow-lg" />
        )}
        <p className="text-xl font-bold text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          {message}
        </p>
        {description && (
          <p className="text-sm text-white/80 drop-shadow-lg">
            {description}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={cn('relative', className)}>
      {/* Render children if provided (the content to be overlaid) */}
      {children}
      
      {/* Frosty overlay */}
      <div 
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-center',
          'bg-gradient-to-br from-white/30 via-blue-100/20 to-slate-200/25',
          'backdrop-blur-md',
          'border border-white/10',
          'shadow-inner',
          'transition-all duration-500',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Animated frost particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-white/40 rounded-full animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-white/50 rounded-full animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-blue-200/30 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute bottom-1/3 right-1/2 w-2 h-2 bg-blue-100/40 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Shimmer effect */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)',
            animation: 'shimmer 3s infinite'
          }}
        />

        {/* Content */}
        <div className="relative z-20">
          {renderContent()}
        </div>
      </div>

      {/* Add keyframes for animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(120deg); }
          66% { transform: translateY(5px) rotate(240deg); }
        }
      `}</style>
    </div>
  );
}