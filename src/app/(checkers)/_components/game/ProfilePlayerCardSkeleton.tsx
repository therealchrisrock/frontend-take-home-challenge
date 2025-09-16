import { Skeleton } from "~/components/ui/skeleton";

interface ProfilePlayerCardSkeletonProps {
  className?: string;
}

export function ProfilePlayerCardSkeleton({
  className = "",
}: ProfilePlayerCardSkeletonProps) {
  return (
    <div className={`transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-2 px-2">
        {/* Avatar Skeleton */}
        <div className="relative flex-shrink-0">
          <Skeleton className="h-8 w-8 rounded-full border border-gray-200" />
        </div>

        {/* Player Info Skeleton */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {/* Player name skeleton */}
            <Skeleton className="h-4 w-24 rounded" />
            
            {/* Crown icon placeholder for current user */}
            <Skeleton className="h-3 w-3 rounded" />
          </div>

          {/* Stats skeleton */}
          <div className="mt-0.5">
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}