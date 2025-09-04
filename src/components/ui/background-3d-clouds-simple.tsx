'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CloudsBackgroundSimpleProps {
  className?: string;
}

export function CloudsBackgroundSimple({ className = '' }: CloudsBackgroundSimpleProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    console.log('CloudsBackgroundSimple: Starting initialization');
    
    if (!mountRef.current) {
      console.error('CloudsBackgroundSimple: Mount ref is null');
      return;
    }

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    console.log(`CloudsBackgroundSimple: Canvas dimensions - ${width}x${height}`);

    // Scene setup with background color
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffb366); // Orange background
    console.log('CloudsBackgroundSimple: Scene created with orange background');

    // Camera setup - much closer
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    console.log('CloudsBackgroundSimple: Camera at position', camera.position.toArray());

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    console.log('CloudsBackgroundSimple: Renderer created');

    // Add some lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
    console.log('CloudsBackgroundSimple: Lights added');

    // Create a simple plane with basic material first
    const geometry = new THREE.PlaneGeometry(10, 10, 32, 32);
    
    // Simple gradient material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0xffa652) },
        color2: { value: new THREE.Color(0xffb366) }
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float time;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Simple wave animation
          pos.z = sin(pos.x * 0.5 + time) * 0.5 + cos(pos.y * 0.5 + time) * 0.5;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        varying vec2 vUv;
        
        void main() {
          // Simple animated gradient
          float mixValue = (sin(vUv.x * 10.0 + time) + 1.0) * 0.5;
          mixValue *= (cos(vUv.y * 10.0 - time * 0.5) + 1.0) * 0.5;
          
          vec3 color = mix(color1, color2, mixValue);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    console.log('CloudsBackgroundSimple: Mesh added to scene');

    // Animation loop
    let frameCount = 0;
    const clock = new THREE.Clock();
    
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      
      // Update shader time
      if (material.uniforms.time) {
        material.uniforms.time.value = elapsedTime;
      }
      
      // Rotate mesh slightly
      mesh.rotation.x = Math.sin(elapsedTime * 0.3) * 0.1;
      mesh.rotation.y = Math.cos(elapsedTime * 0.2) * 0.1;
      
      // Log first frame
      if (frameCount === 0) {
        console.log('CloudsBackgroundSimple: First frame rendering');
        console.log('CloudsBackgroundSimple: Scene children:', scene.children);
        console.log('CloudsBackgroundSimple: Mesh visible:', mesh.visible);
        console.log('CloudsBackgroundSimple: Material uniforms:', material.uniforms);
        frameCount++;
      }
      
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    console.log('CloudsBackgroundSimple: Starting animation');
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      
      renderer.setSize(newWidth, newHeight);
      console.log(`CloudsBackgroundSimple: Resized to ${newWidth}x${newHeight}`);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      console.log('CloudsBackgroundSimple: Cleaning up');
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      
      geometry.dispose();
      material.dispose();
      
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className={`fixed inset-0 ${className}`}
      style={{ backgroundColor: '#ffb366' }} // Fallback color
    />
  );
}