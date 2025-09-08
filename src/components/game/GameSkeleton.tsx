import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { type BoardConfig, getBoardConfig, getBoardGridStyle } from '~/lib/board-config';

interface GameSkeletonProps {
  config?: BoardConfig;
}

export function GameSkeleton({ config = getBoardConfig('american') }: GameSkeletonProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          <div className="flex flex-col items-center justify-start">
            {/* Board Skeleton */}
            <div 
              className="w-full aspect-square rounded-lg shadow-lg border-4 p-2"
              style={{ 
                maxWidth: 'min(100%, calc(100vh - 2rem))',
                borderColor: 'var(--board-border)',
                backgroundColor: 'var(--board-border)'
              }}
            >
              <div className="grid gap-0 w-full h-full" style={getBoardGridStyle(config)}>
                {Array.from({ length: config.size * config.size }, (_, i) => {
                  const row = Math.floor(i / config.size);
                  const col = i % config.size;
                  const isDark = (row + col) % 2 === 1;
                  const hasPiece = isDark && ((row < config.pieceRows) || (row >= config.size - config.pieceRows));
                  const isRed = row >= config.size - config.pieceRows;
                  
                  return (
                    <div
                      key={i}
                      className={`
                        aspect-square flex items-center justify-center relative
                      `}
                      style={{
                        background: isDark
                          ? 'linear-gradient(to bottom right, var(--board-dark-from), var(--board-dark-to))'
                          : 'linear-gradient(to bottom right, var(--board-light-from), var(--board-light-to))'
                      }}
                    >
                      {/* Deterministic initial-piece placeholders using skin colors */}
                      {hasPiece && (
                        <div 
                          className="w-3/4 h-3/4 rounded-full border-4 shadow-xl relative"
                          style={{
                            background: isRed 
                              ? 'linear-gradient(to bottom right, var(--piece-red-from), var(--piece-red-to))'
                              : 'linear-gradient(to bottom right, var(--piece-black-from), var(--piece-black-to))',
                            borderColor: isRed ? 'var(--piece-red-border)' : 'var(--piece-black-border)'
                          }}
                        >
                          <div className="absolute inset-2 rounded-full bg-gradient-to-tl from-white/20 to-transparent animate-pulse" />
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
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <Skeleton className="h-4 w-16 mx-auto mb-1" />
                    <Skeleton className="h-8 w-20 mx-auto" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="h-4 w-16 mx-auto mb-1" />
                    <Skeleton className="h-8 w-20 mx-auto" />
                  </div>
                </div>
                <div className="text-center">
                  <Skeleton className="h-4 w-24 mx-auto mb-1" />
                  <Skeleton className="h-6 w-32 mx-auto" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <Skeleton className="h-4 w-12 mx-auto mb-1" />
                    <Skeleton className="h-5 w-8 mx-auto" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16 mx-auto mb-1" />
                    <Skeleton className="h-5 w-12 mx-auto" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Control Panel Skeleton */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <Skeleton className="h-4 w-12 mx-auto mb-1" />
                    <Skeleton className="h-8 w-16 mx-auto" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="h-4 w-12 mx-auto mb-1" />
                    <Skeleton className="h-8 w-16 mx-auto" />
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
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300">
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
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300">
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
                <div className="text-xs space-y-1">
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
            <Card className="bg-white border-gray-200">
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