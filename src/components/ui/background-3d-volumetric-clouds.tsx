'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface VolumetricCloudsProps {
  className?: string;
}

export function VolumetricClouds({ className = '' }: VolumetricCloudsProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    
    // Camera setup - reasonable distance
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 1;
    camera.rotation.x = 1.16;
    camera.rotation.y = -0.12;
    camera.rotation.z = 0.27;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      alpha: false 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Ambient light for overall illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    // Fog for depth
    scene.fog = new THREE.Fog(0xffa652, 1, 20);

    // Create cloud texture using canvas
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    if (context) {
      const gradient = context.createRadialGradient(
        size / 2, size / 2, size * 0.1,
        size / 2, size / 2, size * 0.5
      );
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.25, 'rgba(255,255,255,0.8)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Cloud material
    const cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        fogColor: { value: new THREE.Color(0xffa652) },
        fogNear: { value: 1 },
        fogFar: { value: 20 },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vFogDepth;
        varying vec3 vWorldPosition;
        uniform float time;
        
        void main() {
          vUv = uv;
          
          vec3 transformed = position;
          
          // Add wave motion
          transformed.z += sin(position.x * 2.0 + time) * 0.1;
          transformed.z += cos(position.y * 2.0 + time * 0.7) * 0.1;
          
          vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          vec4 mvPosition = viewMatrix * worldPosition;
          vFogDepth = -mvPosition.z;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3 fogColor;
        uniform float fogNear;
        uniform float fogFar;
        uniform float time;
        
        varying vec2 vUv;
        varying float vFogDepth;
        varying vec3 vWorldPosition;
        
        void main() {
          // Animated UV coordinates
          vec2 uv = vUv;
          uv.x += sin(time * 0.1) * 0.01;
          uv.y += cos(time * 0.15) * 0.01;
          
          vec4 diffuseColor = texture2D(map, uv);
          
          // Apply orange tint to clouds
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.7, 0.4), 0.3);
          
          // Calculate fog
          float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          
          gl_FragColor.rgb = mix(diffuseColor.rgb, fogColor, fogFactor);
          gl_FragColor.a = diffuseColor.a * (1.0 - fogFactor * 0.5);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Cloud geometry
    const cloudGeo = new THREE.PlaneGeometry(1, 1);
    
    // Create multiple cloud layers
    const clouds: THREE.Mesh[] = [];
    for (let i = 0; i < 50; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMaterial.clone());
      
      cloud.position.set(
        Math.random() * 10 - 5,
        Math.random() * 10 - 5,
        Math.random() * 10 - 10
      );
      
      const scale = 0.5 + Math.random() * 2;
      cloud.scale.set(scale, scale, 1);
      
      cloud.rotation.z = Math.random() * Math.PI;
      cloud.material.opacity = 0.3 + Math.random() * 0.5;
      
      clouds.push(cloud);
      scene.add(cloud);
    }

    // Sky background mesh
    const skyGeo = new THREE.PlaneGeometry(50, 50);
    const skyMat = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(0xffb366),
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.z = -15;
    scene.add(sky);

    // Animation
    const clock = new THREE.Clock();
    
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      
      // Update time uniform for all clouds
      clouds.forEach((cloud, index) => {
        if (cloud.material instanceof THREE.ShaderMaterial && cloud.material.uniforms.time) {
          cloud.material.uniforms.time.value = elapsedTime;
        }
        
        // Move clouds
        cloud.position.z += 0.01;
        cloud.position.x += Math.sin(elapsedTime * 0.5 + index) * 0.001;
        
        // Rotate slowly
        cloud.rotation.z += 0.001;
        
        // Reset position when too close
        if (cloud.position.z > 5) {
          cloud.position.z = -10;
        }
      });
      
      // Camera sway
      camera.position.x = Math.sin(elapsedTime * 0.3) * 0.1;
      camera.position.y = Math.cos(elapsedTime * 0.2) * 0.1;
      
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
      
      clouds.forEach(cloud => {
        cloud.geometry.dispose();
        if (cloud.material instanceof THREE.Material) {
          cloud.material.dispose();
        }
      });
      
      texture.dispose();
      cloudGeo.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      
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
    />
  );
}