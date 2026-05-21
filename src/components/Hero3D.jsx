import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Hero3D = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    // PERF: lower DPR ceiling — the visual difference >1.5 is imperceptible
    // for this scene and the GPU cost on retina displays is significant.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mountRef.current.appendChild(renderer.domElement);

    const pivotGroup = new THREE.Group(); 
    scene.add(pivotGroup);

    const geometryCore = new THREE.IcosahedronGeometry(1.4, 0);
    const materialCore = new THREE.MeshPhongMaterial({ 
      color: 0x2DD4BF, 
      emissive: 0x081c1a,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });
    const core = new THREE.Mesh(geometryCore, materialCore);
    core.userData = { isInteractable: true }; 
    pivotGroup.add(core);

    const geometryRing1 = new THREE.TorusGeometry(2.1, 0.03, 16, 100);
    const materialRing1 = new THREE.MeshBasicMaterial({ color: 0x7042f8, transparent: true, opacity: 0.6 });
    const ring1 = new THREE.Mesh(geometryRing1, materialRing1);
    ring1.rotation.x = Math.PI / 2;
    ring1.rotation.y = -0.2;
    ring1.userData = { isInteractable: true };
    pivotGroup.add(ring1);

    const geometryRing2 = new THREE.TorusGeometry(2.7, 0.02, 16, 100);
    const materialRing2 = new THREE.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.4 });
    const ring2 = new THREE.Mesh(geometryRing2, materialRing2);
    ring2.rotation.x = Math.PI / 1.5;
    ring2.rotation.y = 0.5;
    ring2.userData = { isInteractable: true };
    pivotGroup.add(ring2);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 400;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 12; 
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0x2DD4BF,
      transparent: true,
      opacity: 0.5,
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    pivotGroup.add(particlesMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x2DD4BF, 3);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const randomizeColors = () => {
      const colors = [0x2DD4BF, 0xF59E0B, 0x7042f8, 0xEF4444, 0x10B981];
      pivotGroup.children.forEach(child => {
        if (child.userData.isInteractable && child.material && child.material.color) {
          child.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
        }
      });
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(pivotGroup.children);
      if (intersects.length > 0) {
        randomizeColors();
      }
    };

    // A11Y: keyboard equivalent for the click-to-recolor interaction.
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        randomizeColors();
      }
    };

    mountRef.current.addEventListener('mousemove', handleMouseMove);
    mountRef.current.addEventListener('click', handleClick);
    mountRef.current.addEventListener('keydown', handleKeyDown);

    const clock = new THREE.Clock();

    // A11Y: honor prefers-reduced-motion — render one static frame and stop.
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // PERF: pause rAF when the canvas is offscreen or the tab is hidden.
    let isVisible = true;
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isVisible || document.hidden) return;

      const time = clock.getElapsedTime();

      core.rotation.y += 0.005;
      core.rotation.x = Math.sin(time * 0.5) * 0.2;
      
      ring1.rotation.z -= 0.002;
      ring1.rotation.x = (Math.PI / 2) + Math.sin(time * 0.2) * 0.1;
      
      ring2.rotation.z += 0.003;
      ring2.rotation.y = 0.5 + Math.cos(time * 0.3) * 0.1;

      particlesMesh.rotation.y = time * 0.05;

      const targetX = mouseY * 0.5;
      const targetY = mouseX * 0.5;

      pivotGroup.rotation.x += 0.05 * (targetX - pivotGroup.rotation.x);
      pivotGroup.rotation.y += 0.05 * (targetY - pivotGroup.rotation.y);

      renderer.render(scene, camera);
    };

    if (reducedMotion) {
      // Render a single static frame so the scene is visible without motion.
      renderer.render(scene, camera);
    } else {
      animate();
    }

    let observer = null;
    if (typeof IntersectionObserver !== 'undefined' && mountRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => { isVisible = entry.isIntersecting; },
        { threshold: 0 }
      );
      observer.observe(mountRef.current);
    }

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Capture the current ref node so the cleanup runs against the same
    // DOM element this effect attached to (React may null out the ref by
    // the time cleanup fires).
    const mountEl = mountRef.current;
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
      if (mountEl) {
        mountEl.removeEventListener('mousemove', handleMouseMove);
        mountEl.removeEventListener('click', handleClick);
        mountEl.removeEventListener('keydown', handleKeyDown);
        if (renderer.domElement) mountEl.removeChild(renderer.domElement);
      }
      
      geometryCore.dispose(); geometryRing1.dispose(); geometryRing2.dispose(); particlesGeometry.dispose();
      materialCore.dispose(); materialRing1.dispose(); materialRing2.dispose(); particlesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full min-h-[400px] cursor-pointer relative z-30" 
      title="Click the shapes or press Enter to change colors"
      role="button"
      tabIndex={0}
      aria-label="Interactive 3D tech core — press Enter or Space to randomize colors"
    />
  );
};

export default Hero3D;