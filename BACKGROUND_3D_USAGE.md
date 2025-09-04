# 3D Background Component Usage Guide

## Overview
The 3D background system is designed with complete isolation from the game logic, ensuring Three.js is only loaded when actually needed.

## Architecture

### Component Structure
```text
src/components/ui/
├── background-3d.tsx           # Main wrapper with lazy loading
├── background-3d-canvas.tsx    # Three.js implementation (dynamically imported)
└── background-3d-fallback.tsx  # Lightweight CSS-only fallback
```

### Key Features
1. **Code Splitting**: Three.js (~1MB) is only loaded when the 3D background is enabled
2. **WebGL Detection**: Automatic fallback to CSS animation if WebGL is not supported
3. **Complete Isolation**: Background components are completely separate from game logic
4. **Performance Optimized**: Uses requestAnimationFrame and proper cleanup

## Usage

### Basic Implementation
```tsx
import { Background3D } from '~/components/ui/background-3d';

export default function MyPage() {
  return (
    <div>
      {/* 3D Background */}
      <Background3D 
        enable3D={true}  // Set to false to use fallback without loading Three.js
        fallbackGradient="bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100"
      />
      
      {/* Your content */}
      <div className="relative z-10">
        {/* Content goes here */}
      </div>
    </div>
  );
}
```

### Disabling 3D (No Three.js Bundle)
```tsx
// This will NOT load Three.js at all
<Background3D enable3D={false} />
```

### Custom Fallback Gradient
```tsx
<Background3D 
  enable3D={true}
  fallbackGradient="bg-gradient-to-br from-blue-50 via-purple-100 to-pink-100"
/>
```

## Bundle Impact

### When `enable3D={false}`:
- Three.js is NOT included in any bundle
- Only the lightweight fallback component loads (~2KB)
- No WebGL checks are performed

### When `enable3D={true}`:
- WebGL support is checked
- If supported: Three.js is dynamically imported (separate chunk)
- If not supported: Falls back to CSS animation
- Initial page load is not affected (lazy loading with delay)

## Testing

### To verify Three.js is not bundled:
1. Set `enable3D={false}` in your implementation
2. Build the project: `pnpm build`
3. Check the build output - Three.js chunks should not be created
4. Or use the Bundle Analyzer: `pnpm build && pnpm analyze`

### To test the fallback:
1. Disable WebGL in your browser developer tools
2. The CSS fallback should appear automatically

## Performance Considerations

- Initial render shows fallback immediately (no delay)
- Three.js loads after 100ms delay if WebGL is supported
- Proper cleanup on unmount prevents memory leaks
- Uses `Suspense` for smooth transitions

## Switching Between Versions

### Current Implementation
The original home page is at `/src/app/page.tsx`
The enhanced version is at `/src/app/page-enhanced.tsx`

### To use the enhanced version:
1. Rename current `page.tsx` to `page-original.tsx`
2. Rename `page-enhanced.tsx` to `page.tsx`

### Or test at `/demo` route:
Visit `http://localhost:3000/demo` to see the enhanced version

## Customization

### Modify Cloud Colors
Edit `src/components/ui/background-3d-canvas.tsx`:
```tsx
// Line 46-48: Adjust light colors
const ambient = new THREE.AmbientLight(0xffa500, 0.8);  // Orange ambient
const directionalLight = new THREE.DirectionalLight(0xff8c00, 0.8);  // Darker orange
const pointLight = new THREE.PointLight(0xff6b35, 1, 100);  // Red-orange glow
```

### Adjust Animation Speed
Edit `src/components/ui/background-3d-canvas.tsx`:
```tsx
// Line 136: Change speed multiplier
time += 0.0005;  // Increase for faster animation

// Line 139-140: Adjust cloud movement
cloud.position.z += 0.2;  // Forward speed
cloud.rotation.z += 0.001;  // Rotation speed
```

### Change Number of Clouds
Edit `src/components/ui/background-3d-canvas.tsx`:
```tsx
// Line 98: Adjust cloud count
for (let p = 0; p < 50; p++) {  // Change 50 to desired number
```

## Troubleshooting

### Three.js still in bundle when disabled
- Ensure you're using `enable3D={false}` prop
- Clear Next.js cache: `rm -rf .next`
- Rebuild: `pnpm build`

### Performance issues
- Reduce cloud count (see customization above)
- Lower pixel ratio: `renderer.setPixelRatio(1)`
- Disable antialiasing: Already set to `false` by default

### WebGL not working but should be
- Check browser console for WebGL errors
- Ensure hardware acceleration is enabled
- Try different browser

## Benefits of This Architecture

1. **Zero impact when not used**: Three.js is completely excluded from bundles when `enable3D={false}`
2. **Progressive enhancement**: Users without WebGL still get a nice animated background
3. **Maintainable**: Background system is isolated from game logic
4. **Flexible**: Easy to swap out or disable without touching game code
5. **Performance-first**: Lazy loading ensures fast initial page load
