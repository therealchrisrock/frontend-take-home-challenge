'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CloudsBackgroundProps {
  className?: string;
}

export function CloudsBackground({ className = '' }: CloudsBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    console.log('CloudsBackground: Starting initialization');
    
    if (!mountRef.current) {
      console.error('CloudsBackground: Mount ref is null');
      return;
    }

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    console.log(`CloudsBackground: Canvas dimensions - ${width}x${height}`);

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.Fog(0xffa652, -100, 3000);
    console.log('CloudsBackground: Scene created with fog');

    // Camera setup - matching the demo
    const camera = new THREE.PerspectiveCamera(30, width / height, 1, 3000);
    camera.position.z = 6000;
    console.log('CloudsBackground: Camera created at position', camera.position);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      alpha: false 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);
    
    // Check WebGL context
    const gl = renderer.getContext();
    console.log('CloudsBackground: WebGL context obtained', !!gl);
    console.log('CloudsBackground: Renderer created and attached to DOM');

    // Cloud geometry - large plane for volumetric effect
    const geometry = new THREE.PlaneGeometry(8000, 8000);
    console.log('CloudsBackground: Geometry created with vertices:', geometry.attributes.position?.count ?? 0);

    // Shader material for volumetric clouds
    console.log('CloudsBackground: Creating shader material');
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 },
        cloudColor: { value: new THREE.Color(0xffa652) },
        bgColor: { value: new THREE.Color(0xffb366) }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 cloudColor;
        uniform vec3 bgColor;
        varying vec2 vUv;
        
        // Simplex 2D noise
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                   -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod(i, 289.0);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
            dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        float fbm(vec2 p) {
          float f = 0.0;
          float w = 0.5;
          for (int i = 0; i < 5; i++) {
            f += w * snoise(p);
            p *= 2.0;
            w *= 0.5;
          }
          return f;
        }
        
        void main() {
          vec2 uv = vUv;
          
          // Animate UVs
          float t = time * 0.00005;
          uv += vec2(t, -t * 0.3);
          
          // Generate cloud pattern using FBM
          float noise = fbm(uv * 3.0 + time * 0.0001);
          noise = (noise + 1.0) * 0.5; // Normalize to 0-1
          
          // Add more octaves for detail
          noise += fbm(uv * 8.0 - time * 0.0002) * 0.25;
          noise += fbm(uv * 16.0 + time * 0.0003) * 0.125;
          
          // Shape the clouds
          noise = smoothstep(0.4, 0.6, noise);
          
          // Mix colors
          vec3 color = mix(bgColor, cloudColor, noise);
          
          // Add some variation
          color += vec3(fbm(uv * 20.0) * 0.1);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      transparent: false
    });
    
    // Check shader compilation
    material.onBeforeCompile = (shader) => {
      console.log('CloudsBackground: Shader compiled successfully');
    };
    
    console.log('CloudsBackground: Material created with uniforms:', material.uniforms);

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    scene.add(mesh);
    console.log('CloudsBackground: Mesh created and added to scene');
    console.log('CloudsBackground: Mesh position:', mesh.position);
    console.log('CloudsBackground: Scene children:', scene.children.length);

    // Animation loop
    let frameCount = 0;
    const animate = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime.current;
      
      // Update time uniform
      if (material.uniforms.time) {
        material.uniforms.time.value = elapsedTime;
      }
      
      // Subtle camera movement
      camera.position.x = Math.sin(elapsedTime * 0.00005) * 100;
      camera.position.y = Math.cos(elapsedTime * 0.00003) * 100;
      
      // Log first few frames
      if (frameCount < 5) {
        console.log(`CloudsBackground: Frame ${frameCount} - Camera pos:`, camera.position.toArray());
        console.log(`CloudsBackground: Frame ${frameCount} - Time uniform:`, material.uniforms.time?.value);
        frameCount++;
      }
      
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    console.log('CloudsBackground: Starting animation loop');
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      
      // Clean up Three.js resources
      geometry.dispose();
      material.dispose();
      
      if (rendererRef.current && mountRef.current?.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      sceneRef.current = null;
      rendererRef.current = null;
      meshRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className={`fixed inset-0 ${className}`}
    />
  );
}