'use client';

interface FallbackBackgroundProps {
  className?: string;
  gradient?: string;
}

export function FallbackBackground({ 
  className = '', 
  gradient = 'bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100' 
}: FallbackBackgroundProps) {
  return (
    <div className={`fixed inset-0 ${gradient} ${className}`}>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-orange-200/20 to-transparent animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/30 via-transparent to-orange-200/30 animate-float" />
      </div>
    </div>
  );
}