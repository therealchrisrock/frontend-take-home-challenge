# UI Component Architecture

## Component Hierarchy

```text
GameController (Container)
├── GameStats (Display)
├── Board (Container)
│   └── Square (64 instances)
│       └── Piece (Presentational)
└── IntegratedChat (Feature)
```

## Shadcn/ui Integration

**Decision**: Use Shadcn components as design system foundation

**Benefits**:
- ✅ Consistent design language
- ✅ Accessible by default
- ✅ Tailwind-based (tree-shakeable)
- ✅ Copy-paste, not dependency

**Trade-off**: Customization flexibility vs. consistency
- Solution: Extend via variants, not overrides

## Drag and Drop Implementation

**Current**: HTML5 Drag and Drop API
```typescript
<div
  draggable={true}
  onDragStart={(e) => e.dataTransfer.setData('position', JSON.stringify(position))}
  onDragEnd={() => setDragging(false)}
>
```

**Alternative considered**: react-dnd
- ❌ Additional 50KB bundle
- ❌ Learning curve
- ✅ Better touch support
- ✅ More control

**Decision**: Native API sufficient for desktop-first app

## Responsive Design Strategy

**Breakpoint approach**:
```css
/* Mobile: Full screen board */
sm: 640px   → Side-by-side layout
md: 768px   → Show game stats panel
lg: 1024px  → Show chat sidebar
xl: 1280px  → Enhanced spacing
```

## 3D Background Optimization

**Problem**: Three.js scene impacts performance

**Solution**: Progressive enhancement
1. **Static fallback**: CSS gradient for low-end devices
2. **Simple clouds**: Basic geometry for mid-range
3. **Volumetric clouds**: Full effects for high-end

**Detection**:
```typescript
const use3D = 
  window.matchMedia('(prefers-reduced-motion: no-preference)').matches &&
  navigator.hardwareConcurrency > 4;
```

## Component Performance

**Optimizations applied**:
- React.memo for Square components (64 instances)
- useMemo for valid moves calculation
- useCallback for drag handlers
- CSS transforms instead of position changes
