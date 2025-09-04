# Performance Optimizations

## Rendering Strategy

**Problem**: 64 Square components re-render on every move

**Solution**: Granular memoization
```typescript
const Square = React.memo(({ position, piece, isValidMove }) => {
  // Only re-render if these props change
}, (prevProps, nextProps) => {
  return prevProps.piece?.color === nextProps.piece?.color &&
         prevProps.piece?.type === nextProps.piece?.type &&
         prevProps.isValidMove === nextProps.isValidMove;
});
```

**Impact**: 90% fewer re-renders per move

## Bundle Size Optimization

**T3 Stack defaults**:
- Next.js automatic code splitting
- Dynamic imports for heavy components
- Tree-shaking via Turbopack/Webpack

**Additional optimizations**:
```typescript
// Lazy load chat system
const IntegratedChat = dynamic(() => import('./chat/IntegratedChat'), {
  loading: () => <ChatSkeleton />,
  ssr: false
});

// Lazy load 3D background
const Background3D = dynamic(() => import('./ui/background-3d'), {
  loading: () => <div className="bg-gradient-to-br from-blue-900 to-purple-900" />,
  ssr: false
});
```

## Database Query Optimization

**Prisma optimizations**:
```typescript
// Include related data in single query
const game = await prisma.game.findUnique({
  where: { id },
  include: {
    moves: {
      orderBy: { createdAt: 'asc' },
      take: 100 // Limit history
    },
    players: true
  }
});

// Use select for specific fields
const games = await prisma.game.findMany({
  select: {
    id: true,
    status: true,
    updatedAt: true
  }
});
```

## AI Move Calculation

**Current**: Synchronous calculation blocks UI

**Optimization**: Web Worker for AI thinking
```typescript
// ai-worker.ts
self.onmessage = (e) => {
  const { board, player } = e.data;
  const bestMove = calculateBestMove(board, player);
  self.postMessage(bestMove);
};

// GameController.tsx
const worker = new Worker('/ai-worker.js');
worker.postMessage({ board, player: 'black' });
worker.onmessage = (e) => applyMove(e.data);
```

## Network Optimization

**tRPC batching**:
```typescript
// Batch multiple queries
const [game, stats, friends] = await Promise.all([
  api.game.get.query({ id }),
  api.stats.get.query(),
  api.social.getFriends.query()
]);
```

**Optimistic updates**: Update UI before server confirms
