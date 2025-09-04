'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { FallbackBackground } from './background-3d-fallback';

// Lazy load the Three.js component - it won't be included in the main bundle
const CloudsBackground = lazy(() => 
  import('./background-3d-diagnostic').then(module => ({
    default: module.DiagnosticClouds
  }))
);

interface Background3DProps {
  className?: string;
  fallbackGradient?: string;
  enable3D?: boolean; // Allow disabling 3D entirely
}

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

export function Background3D({ 
  className = '', 
  fallbackGradient = 'bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100',
  enable3D = true
}: Background3DProps) {
  const [hasWebGL, setHasWebGL] = useState(false);
  const [shouldLoad3D, setShouldLoad3D] = useState(false);

  useEffect(() => {
    // Only check for WebGL and load 3D if enabled
    if (enable3D) {
      const webglSupported = checkWebGLSupport();
      setHasWebGL(webglSupported);
      
      // Only load the 3D component if WebGL is supported
      if (webglSupported) {
        // Small delay to ensure smooth initial page load
        const timer = setTimeout(() => {
          setShouldLoad3D(true);
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, [enable3D]);

  // If 3D is disabled or WebGL is not supported, show the fallback
  if (!enable3D || !hasWebGL) {
    return <FallbackBackground className={className} gradient={fallbackGradient} />;
  }

  // If we should load 3D, lazy load the Three.js component
  if (shouldLoad3D) {
    return (
      <Suspense fallback={<FallbackBackground className={className} gradient={fallbackGradient} />}>
        <CloudsBackground className={className} />
      </Suspense>
    );
  }

  // Initial state while checking WebGL
  return <FallbackBackground className={className} gradient={fallbackGradient} />;
}