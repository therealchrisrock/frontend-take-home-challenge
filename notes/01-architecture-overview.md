# Architecture Overview

## Stack Choice: T3 Stack

**Decision**: Built on Create T3 App (Next.js, TypeScript, tRPC, Prisma, Tailwind)

**Trade-offs**:
- ✅ Type-safe from database to UI
- ✅ Built-in SSR/SSG capabilities
- ✅ Excellent DX with hot reload and TypeScript
- ❌ Heavier bundle than vanilla JS
- ❌ Learning curve for tRPC patterns

## Application Structure

```text
src/
├── app/          # Next.js App Router (pages + layouts)
├── components/   # Reusable UI components
│   ├── game/    # Game-specific (Board, Piece, Square)
│   ├── chat/    # Real-time chat system
│   ├── social/  # Friends & messaging
│   └── ui/      # Shadcn/ui components
├── lib/         # Core business logic
├── hooks/       # Custom React hooks
├── server/      # Backend (tRPC routers, DB)
└── trpc/        # tRPC client config
```

**Key Decision**: Separation of concerns with feature-based grouping in components while keeping shared logic in lib/

## Routing Strategy

**Decision**: App Router (Next.js 14+)

**Trade-offs**:
- ✅ Server Components by default (better performance)
- ✅ Nested layouts for shared UI
- ✅ Built-in loading/error states
- ❌ Different mental model from Pages Router
- ❌ Some third-party library compatibility issues

## Data Flow

```sql
User Action → React Component → tRPC Procedure → Prisma → SQLite
                     ↓
              Local State Update
                     ↓
              UI Re-render
```

**Trade-off**: Optimistic updates vs. server authority
- Chose hybrid: optimistic for game moves, server-authoritative for persistence
