import { Skeleton } from "~/components/ui/skeleton";

export function FriendItemSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg p-3 hover:bg-accent">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="mb-1 h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

export function FriendListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <FriendItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function EmptyStateSkeleton() {
  return (
    <div className="py-4 text-center">
      <Skeleton className="mx-auto h-4 w-48" />
    </div>
  );
}

export function SearchBarSkeleton() {
  return <Skeleton className="mb-4 h-10 w-full" />;
}