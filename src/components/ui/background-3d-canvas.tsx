'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Background3DCanvasProps {
  className?: string;
}

export function Background3DCanvas({ className = '' }: Background3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 1;
    camera.rotation.x = 1.16;
    camera.rotation.y = -0.12;
    camera.rotation.z = 0.27;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      alpha: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffa500, 0.8);
    scene.add(ambient);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xff8c00, 0.8);
    directionalLight.position.set(0, 0, 1);
    scene.add(directionalLight);

    // Orange point light for warm glow
    const pointLight = new THREE.PointLight(0xff6b35, 1, 100);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // Cloud texture - procedural generation
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create gradient for cloud-like appearance
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
      
      // Add some noise
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const radius = Math.random() * 20 + 5;
        const opacity = Math.random() * 0.3;
        
        const noiseGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        noiseGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        noiseGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = noiseGradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    }

    const cloudTexture = new THREE.CanvasTexture(canvas);

    // Fog for depth
    scene.fog = new THREE.FogExp2(0xffa500, 0.001);

    // Cloud geometry - using a plane geometry for clouds
    const cloudGeo = new THREE.PlaneGeometry(500, 500, 20, 20);
    
    // Cloud material with transparency
    const cloudMaterial = new THREE.MeshLambertMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      color: new THREE.Color(0xffb366)
    });

    // Create multiple cloud layers
    const clouds: THREE.Mesh[] = [];
    for (let p = 0; p < 50; p++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMaterial.clone());
      
      cloud.position.set(
        Math.random() * 800 - 400,
        500,
        Math.random() * 500 - 450
      );
      cloud.rotation.x = 1.16;
      cloud.rotation.y = -0.12 + Math.random() * 0.1;
      cloud.rotation.z = Math.random() * 2 * Math.PI;
      cloud.material.opacity = 0.3 + Math.random() * 0.3;
      cloud.scale.setScalar(0.5 + Math.random() * 0.5);
      
      clouds.push(cloud);
      scene.add(cloud);
    }

    // Sky background
    const skyGeo = new THREE.PlaneGeometry(2000, 2000);
    const skyMat = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(0xffd4a3),
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.z = -500;
    scene.add(sky);

    // Animation variables
    let time = 0;

    // Animation loop
    const animate = () => {
      time += 0.0005;
      
      // Animate clouds
      clouds.forEach((cloud, index) => {
        cloud.position.z += 0.2;
        cloud.position.x += Math.sin(time + index) * 0.1;
        cloud.rotation.z += 0.001;
        
        // Reset cloud position when it goes too far
        if (cloud.position.z > 200) {
          cloud.position.z = -450;
        }
      });

      // Subtle camera movement
      camera.position.x = Math.sin(time * 0.5) * 0.1;
      camera.position.y = Math.cos(time * 0.3) * 0.1;

      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

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
      clouds.forEach(cloud => {
        cloud.geometry.dispose();
        if (cloud.material instanceof THREE.Material) {
          cloud.material.dispose();
        }
      });
      
      cloudTexture.dispose();
      cloudGeo.dispose();
      cloudMaterial.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      
      if (rendererRef.current && mountRef.current?.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      sceneRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className={`fixed inset-0 bg-3d-canvas ${className}`}
    />
  );
}