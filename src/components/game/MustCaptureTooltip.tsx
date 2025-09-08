'use client';

import { useEffect } from 'react';
import { cn } from '~/lib/utils';

interface MustCaptureTooltipProps {
  show: boolean;
  position?: { x: number; y: number };
  onClose: () => void;
}

export function MustCaptureTooltip({ show, position, onClose }: MustCaptureTooltipProps) {
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
        'fixed z-50 transition-all duration-200 transform pointer-events-none',
        'bg-orange-100 border-2 border-orange-400 text-orange-800',
        'px-3 py-2 rounded-lg shadow-lg text-xs font-medium',
        'flex items-center gap-2',
        show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -120%)'
      }}
    >
      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
      <span>You must capture!</span>
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 top-full -mt-1"
        style={{
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid rgb(251 146 60)'
        }}
      />
    </div>
  );
}