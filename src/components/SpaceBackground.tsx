import React, { useEffect, useRef } from 'react';
import { Star, starCountFor } from '../utils/starfield';
import type { StarfieldEnv } from '../utils/starfield';

interface SpaceBackgroundProps {
  isDark: boolean;
}

const SpaceBackground = ({ isDark }: SpaceBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // A 2d context is near-universally available, but `getContext` still
    // returns null in sandboxed/headless contexts — and this component renders
    // full-screen under only the app-level error boundary, so an unguarded
    // throw here blanks the entire site (same failure mode Hero3D had).
    // Degrade to no starfield instead; the CSS background still renders.
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) {
      console.warn('[SpaceBackground] 2D canvas context unavailable — skipping starfield.');
      return;
    }
    // Re-bind the narrowed values so they can be handed to StarfieldEnv as
    // non-nullable types without `!` assertions.
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context;

    let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    const isMobile = window.innerWidth < 768;
    const numStars = starCountFor(window.innerWidth);

    // Per-run environment for the Star particles (see utils/starfield.ts).
    const env: StarfieldEnv = { canvas, ctx, isMobile, isDark, prefersReducedMotion };


    const stars: Star[] = [];
    for (let i = 0; i < numStars; i++) {
      stars.push(new Star(env));
    }

    let animationFrameId = 0;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (isDark) {
        gradient.addColorStop(0, '#030014'); 
        gradient.addColorStop(1, '#0F172A'); 
      } else {
        gradient.addColorStop(0, '#F8FAFC'); 
        gradient.addColorStop(1, '#E2E8F0'); 
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        star.update();
        star.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // A11Y/PERF: Under prefers-reduced-motion, render exactly one static
    // frame and skip the rAF loop entirely (no CPU/GPU cost, no motion).
    if (prefersReducedMotion) {
      animate(); // runs one frame; we cancel the queued rAF below.
      cancelAnimationFrame(animationFrameId);
    } else {
      animate();
    }

    // Pause rAF when the tab is hidden to save CPU/battery.
    const handleVisibilityChange = () => {
      if (prefersReducedMotion) return;
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        animate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      
      resizeTimeout = setTimeout(() => {
        setCanvasSize();
        
        // The viewport class can change across a resize; keep env in sync
        // so star sizing matches the new breakpoint.
        env.isMobile = window.innerWidth < 768;
        const newNumStars = starCountFor(window.innerWidth);
        
        stars.length = 0;
        for (let i = 0; i < newNumStars; i++) {
          stars.push(new Star(env));
        }
      }, 200);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [isDark]); 

  return (
    <canvas 
      ref={canvasRef} 
      className="space-bg fixed top-0 left-0 w-full h-full -z-10 transition-colors duration-500"
    />
  );
};

export default SpaceBackground;