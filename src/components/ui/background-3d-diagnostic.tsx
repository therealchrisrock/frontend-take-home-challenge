'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface DiagnosticCloudsProps {
  className?: string;
}

export function DiagnosticClouds({ className = '' }: DiagnosticCloudsProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const log = (message: string, data?: any) => {
    const msg = data ? `${message}: ${JSON.stringify(data)}` : message;
    console.log(`[DiagnosticClouds] ${msg}`);
    setDiagnostics(prev => [...prev, msg]);
  };

  useEffect(() => {
    const logs: string[] = [];
    log('=== INITIALIZATION START ===');
    
    if (!mountRef.current) {
      log('ERROR: Mount ref is null');
      return;
    }

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    log(`Canvas dimensions`, { width, height });

    // Test 1: Basic renderer test with clear color
    log('TEST 1: Creating renderer with orange clear color');
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0xff6600, 1); // Bright orange
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    
    // Check WebGL capabilities
    const gl = renderer.getContext();
    log('WebGL context', {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION)
    });

    // Test 2: Simple scene with colored cube
    log('TEST 2: Creating simple scene with colored cube');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    log('Camera position', camera.position.toArray());

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    log('Lights added');

    // Test 3: Add a simple colored box
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    scene.add(box);
    log('Red box added to scene');

    // Test 4: Add a textured plane
    log('TEST 3: Creating textured plane');
    const planeGeometry = new THREE.PlaneGeometry(3, 3);
    
    // Create texture using canvas
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 256;
    textureCanvas.height = 256;
    const ctx = textureCanvas.getContext('2d');
    
    if (ctx) {
      // Draw a gradient
      const gradient = ctx.createLinearGradient(0, 0, 256, 256);
      gradient.addColorStop(0, '#ff0000');
      gradient.addColorStop(0.5, '#00ff00');
      gradient.addColorStop(1, '#0000ff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
      
      // Draw some circles
      ctx.fillStyle = 'white';
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 256, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      log('Canvas texture created');
    }
    
    const texture = new THREE.CanvasTexture(textureCanvas);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      map: texture,
      side: THREE.DoubleSide 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.z = -2;
    scene.add(plane);
    log('Textured plane added');

    // Test 5: Add shader material plane
    log('TEST 4: Creating shader material');
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0xff0000) },
        color2: { value: new THREE.Color(0x0000ff) }
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
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        
        void main() {
          float mixValue = sin(time + vUv.x * 10.0) * 0.5 + 0.5;
          vec3 color = mix(color1, color2, mixValue);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
    
    // Check for shader compilation errors
    renderer.compile(scene, camera);
    const properties = renderer.properties.get(shaderMaterial);
    const shaderProgram = (properties as any)?.program;
    if (shaderProgram) {
      const glProgram = shaderProgram.program;
      const programLog = gl.getProgramInfoLog(glProgram);
      if (programLog) {
        log('Shader program log', programLog);
      } else {
        log('Shader compiled successfully');
      }
    }
    
    const shaderPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      shaderMaterial
    );
    shaderPlane.position.set(2, 0, 0);
    scene.add(shaderPlane);
    log('Shader plane added');

    // Animation loop
    let frameCount = 0;
    const clock = new THREE.Clock();
    
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      
      // Rotate the box
      box.rotation.x = elapsedTime;
      box.rotation.y = elapsedTime * 0.5;
      
      // Update shader uniform
      if (shaderMaterial.uniforms.time) {
        shaderMaterial.uniforms.time.value = elapsedTime;
      }
      
      // Log first few frames
      if (frameCount < 3) {
        log(`Frame ${frameCount}`, {
          sceneChildren: scene.children.length,
          boxVisible: box.visible,
          boxPosition: box.position.toArray(),
          cameraPosition: camera.position.toArray(),
          elapsedTime: elapsedTime.toFixed(2)
        });
        
        // Check what's being rendered
        const renderInfo = renderer.info;
        log(`Render info frame ${frameCount}`, {
          geometries: renderInfo.memory.geometries,
          textures: renderInfo.memory.textures,
          render: {
            calls: renderInfo.render.calls,
            triangles: renderInfo.render.triangles,
            points: renderInfo.render.points,
            lines: renderInfo.render.lines
          }
        });
        frameCount++;
      }
      
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    log('=== STARTING ANIMATION ===');
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
      log('=== CLEANUP ===');
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      
      boxGeometry.dispose();
      boxMaterial.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
      texture.dispose();
      shaderMaterial.dispose();
      
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, []);

  return (
    <>
      <div 
        ref={mountRef} 
        className={`fixed inset-0 ${className}`}
      />
      {/* Diagnostic overlay */}
      <div className="fixed top-0 left-0 z-50 max-w-md max-h-96 overflow-auto bg-black/80 text-green-400 text-xs font-mono p-2 m-2 rounded">
        <div className="mb-2 text-yellow-400">Three.js Diagnostics:</div>
        {diagnostics.slice(-20).map((log, i) => (
          <div key={i} className="mb-1">{log}</div>
        ))}
      </div>
    </>
  );
}