import { getBoardGridStyleFromSize } from "~/app/(checkers)/_lib/board-style";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

interface GameSkeletonProps {
  size?: number;
}

export function GameSkeleton({ size = 8 }: GameSkeletonProps) {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col items-center justify-start">
            {/* Board Skeleton */}
            <div
              className="aspect-square w-full rounded-lg border-4 p-2 shadow-lg"
              style={{
                maxWidth: "min(100%, calc(100vh - 2rem))",
                borderColor: "var(--board-border)",
                backgroundColor: "var(--board-border)",
              }}
            >
              <div
                className="grid h-full w-full gap-0"
                style={getBoardGridStyleFromSize(size)}
              >
                {Array.from({ length: size * size }, (_, i) => {
                  const row = Math.floor(i / size);
                  const col = i % size;
                  const isDark = (row + col) % 2 === 1;
                  const pieceRows = Math.floor(size / 2) - 1;
                  const hasPiece =
                    isDark && (row < pieceRows || row >= size - pieceRows);
                  const isRed = row >= size - pieceRows;

                  return (
                    <div
                      key={i}
                      className={`relative flex aspect-square items-center justify-center`}
                      style={{
                        background: isDark
                          ? "linear-gradient(to bottom right, var(--board-dark-from), var(--board-dark-to))"
                          : "linear-gradient(to bottom right, var(--board-light-from), var(--board-light-to))",
                      }}
                    >
                      {/* Deterministic initial-piece placeholders using skin colors */}
                      {hasPiece && (
                        <div
                          className="relative h-3/4 w-3/4 rounded-full border-4 shadow-xl"
                          style={{
                            background: isRed
                              ? "linear-gradient(to bottom right, var(--piece-red-from), var(--piece-red-to))"
                              : "linear-gradient(to bottom right, var(--piece-black-from), var(--piece-black-to))",
                            borderColor: isRed
                              ? "var(--piece-red-border)"
                              : "var(--piece-black-border)",
                          }}
                        >
                          <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-tl from-white/20 to-transparent" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Game Stats Skeleton */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/10">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <Skeleton className="mx-auto mb-1 h-4 w-16" />
                    <Skeleton className="mx-auto h-8 w-20" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="mx-auto mb-1 h-4 w-16" />
                    <Skeleton className="mx-auto h-8 w-20" />
                  </div>
                </div>
                <div className="text-center">
                  <Skeleton className="mx-auto mb-1 h-4 w-24" />
                  <Skeleton className="mx-auto h-6 w-32" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <Skeleton className="mx-auto mb-1 h-4 w-12" />
                    <Skeleton className="mx-auto h-5 w-8" />
                  </div>
                  <div>
                    <Skeleton className="mx-auto mb-1 h-4 w-16" />
                    <Skeleton className="mx-auto h-5 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Control Panel Skeleton */}
            <Card className="border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <Skeleton className="mx-auto mb-1 h-4 w-12" />
                    <Skeleton className="mx-auto h-8 w-16" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="mx-auto mb-1 h-4 w-12" />
                    <Skeleton className="mx-auto h-8 w-16" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>

            {/* Game Controls Skeleton */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/10">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </CardContent>
            </Card>

            {/* Storage Skeleton */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/10">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3 rounded" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                </div>
              </CardContent>
            </Card>

            {/* Chat Skeleton */}
            <Card className="border-gray-200 bg-white">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-80 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
