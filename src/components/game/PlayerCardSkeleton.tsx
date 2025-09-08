import { Skeleton } from '~/components/ui/skeleton';
import { type PieceColor } from '~/lib/game-logic';

interface PlayerCardSkeletonProps {
  color: PieceColor;
  position: 'top' | 'bottom';
  className?: string;
}

export function PlayerCardSkeleton({ 
  color, 
  position, 
  className = '' 
}: PlayerCardSkeletonProps) {
  const getAccentColor = (color: PieceColor) => {
    return color === 'red' ? 'bg-red-600' : 'bg-gray-800';
  };

  const accentColor = getAccentColor(color);

  return (
    <div className={`transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-2 px-2">
        {/* Avatar Skeleton */}
        <div className="relative flex-shrink-0">
          <Skeleton className="w-8 h-8 rounded-full border border-gray-200" />
          
          {/* Color indicator - static since we know the color */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${accentColor} border border-white shadow-sm`} />
        </div>

        {/* Player Info Skeleton */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Player name skeleton */}
            <Skeleton className="h-4 w-20 rounded" />
            
            {/* Badge skeleton (for Guest or AI difficulty) */}
            <Skeleton className="h-4 w-12 rounded-full" />
            
            {/* Crown icon skeleton (shown occasionally to represent current user) */}
            {Math.random() > 0.7 && (
              <Skeleton className="w-3 h-3 rounded" />
            )}
          </div>

          {/* W/L/D stats skeleton (shown for players with stats) */}
          <div className="mt-0.5">
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}