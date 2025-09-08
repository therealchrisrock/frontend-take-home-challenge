'use client';

import { useEffect } from 'react';
import { cn } from '~/lib/utils';

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
        'fixed top-4 right-4 z-50 transition-all duration-300 transform',
        'bg-orange-100 border-2 border-orange-400 text-orange-800',
        'px-4 py-2 rounded-lg shadow-lg text-sm font-medium',
        'flex items-center gap-2',
        show 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0 pointer-events-none'
      )}
    >
      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
      <span>You must capture when possible!</span>
    </div>
  );
}