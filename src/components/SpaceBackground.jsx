import React, { useEffect, useRef } from 'react';

const SpaceBackground = ({ isDark }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let resizeTimeout;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    const isMobile = window.innerWidth < 768;
    const numStars = isMobile ? 60 : 150;

    const stars = [];

    class Star {
      constructor() {
        this.init();
      }

      init() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        const sizeBase = isMobile ? 1 : (isDark ? 2 : 1.5);
        this.size = Math.random() * sizeBase; 
        this.speedY = Math.random() * 0.5 + 0.1;
        this.brightness = Math.random();
      }

      update() {
        if (prefersReducedMotion) return;

        this.y += this.speedY; 
        if (this.y > canvas.height) {
          this.y = 0;
          this.x = Math.random() * canvas.width;
        }
        
        this.brightness += (Math.random() - 0.5) * 0.1;
        if (this.brightness > 1) this.brightness = 1;
        if (this.brightness < 0.3) this.brightness = 0.3;
      }

      draw() {
        const color = isDark ? `rgba(255, 255, 255, ${this.brightness})` : `rgba(15, 23, 42, ${this.brightness * 0.5})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < numStars; i++) {
      stars.push(new Star());
    }

    let animationFrameId;
    
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

    animate();

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      
      resizeTimeout = setTimeout(() => {
        setCanvasSize();
        
        const newIsMobile = window.innerWidth < 768;
        const newNumStars = newIsMobile ? 60 : 150;
        
        stars.length = 0;
        for (let i = 0; i < newNumStars; i++) {
          stars.push(new Star());
        }
      }, 200);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [isDark]); 

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 transition-colors duration-500"
    />
  );
};

export default SpaceBackground;