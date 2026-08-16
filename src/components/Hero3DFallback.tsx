import React from 'react';

/**
 * Hero3DFallback — pure-CSS orbital visual shown when WebGL is unavailable
 * (headless/sandboxed browsers, GPU blocklists, driver resets, context loss).
 *
 * Deliberately mirrors the 3D scene's composition — teal wireframe core, a
 * purple equatorial ring, an amber outer ring, scattered particles — so the
 * degraded state reads as a design choice rather than a failure. No canvas, no
 * WebGL, no JS animation loop: transforms only, which the compositor handles.
 *
 * Motion is suppressed under prefers-reduced-motion via `motion-reduce:`.
 */
const PARTICLES = [
  { top: '12%', left: '22%', size: 3, delay: '0s' },
  { top: '28%', left: '78%', size: 2, delay: '0.6s' },
  { top: '68%', left: '14%', size: 2, delay: '1.2s' },
  { top: '82%', left: '64%', size: 3, delay: '1.8s' },
  { top: '46%', left: '90%', size: 2, delay: '2.4s' },
  { top: '8%',  left: '56%', size: 2, delay: '3.0s' },
];

const Hero3DFallback = () => (
  <div
    className="relative z-30 flex h-full min-h-[400px] w-full items-center justify-center"
    role="img"
    aria-label="Decorative orbital graphic"
  >
    {/* Ambient glow behind the core */}
    <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />

    <div className="relative h-[320px] w-[320px]">
      {/* Outer ring — amber. The tilt lives on a static wrapper because the
          `spin` keyframe animates `transform` and would otherwise clobber it. */}
      <div className="absolute inset-0" style={{ transform: 'rotateX(72deg)' }}>
        <div className="h-full w-full animate-spin-reverse-slow rounded-full border border-accent/40 motion-reduce:animate-none" />
      </div>
      {/* Middle ring — purple, tilted the other way */}
      <div className="absolute inset-[12%]" style={{ transform: 'rotateX(64deg) rotateZ(28deg)' }}>
        <div className="h-full w-full animate-spin-slower rounded-full border border-nebula/50 motion-reduce:animate-none" />
      </div>

      {/* Core — hexagonal wireframe standing in for the icosahedron */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="h-32 w-32 animate-spin-slower border-2 border-primary/80 bg-primary/5 shadow-[0_0_40px_rgba(45,212,191,0.35)] motion-reduce:animate-none"
          style={{
            clipPath:
              'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          }}
        />
        <div className="absolute h-10 w-10 animate-pulse-slow rounded-full bg-primary/60 blur-md motion-reduce:animate-none" />
      </div>

      {/* Drifting particles */}
      {PARTICLES.map((p) => (
        <span
          key={`${p.top}-${p.left}`}
          className="absolute animate-float-slow rounded-full bg-primary/70 motion-reduce:animate-none"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  </div>
);

export default Hero3DFallback;
