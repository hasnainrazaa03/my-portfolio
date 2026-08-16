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

    {/* `perspective` gives the tilted rings real foreshortening; without it
        rotateX flattens them into plain ellipses. */}
    <div className="relative h-[320px] w-[320px]" style={{ perspective: '900px' }}>
      {/* Outer ring — amber. The tilt lives on a static wrapper because the
          `spin` keyframe animates `transform` and would otherwise clobber it. */}
      <div className="absolute inset-0" style={{ transform: 'rotateX(74deg)' }}>
        <div className="h-full w-full animate-spin-reverse-slow rounded-full border-2 border-accent/45 motion-reduce:animate-none" />
      </div>
      {/* Middle ring — purple, tilted the other way */}
      <div className="absolute inset-[14%]" style={{ transform: 'rotateX(66deg) rotateZ(28deg)' }}>
        <div className="h-full w-full animate-spin-slower rounded-full border-2 border-nebula/55 motion-reduce:animate-none" />
      </div>

      {/* Core — nested hexagonal wireframe standing in for the icosahedron.
          Drawn as SVG rather than a CSS clip-path: a clipped element also clips
          its own border and box-shadow, which rendered as a washed-out blob. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute h-40 w-40 animate-pulse-slow rounded-full bg-primary/25 blur-2xl motion-reduce:animate-none" />
        <svg
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
          className="relative h-40 w-40 animate-spin-slower motion-reduce:animate-none"
        >
          <polygon
            points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5"
            fill="rgba(45,212,191,0.07)"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="text-primary"
          />
          <polygon
            points="50,22 74,36 74,64 50,78 26,64 26,36"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            className="text-primary/50"
          />
          {/* Struts tying the shells together — reads as wireframe depth. */}
          <g stroke="currentColor" strokeWidth="1.2" className="text-primary/35">
            <line x1="50" y1="3" x2="50" y2="22" />
            <line x1="91" y1="26.5" x2="74" y2="36" />
            <line x1="9" y1="73.5" x2="26" y2="64" />
          </g>
        </svg>
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
