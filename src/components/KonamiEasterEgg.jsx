import React, { useEffect, useState } from 'react';

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

/**
 * Listens for the classic Konami code and reveals a small "cockpit" overlay.
 * Purely additive — does not modify any existing DOM until activated.
 */
const KonamiEasterEgg = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let buf = [];
    const onKey = (e) => {
      // Ignore typing in form fields.
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      buf = [...buf, e.key].slice(-KONAMI.length);
      if (buf.length === KONAMI.length &&
          buf.every((k, i) => k.toLowerCase() === KONAMI[i].toLowerCase())) {
        setActive(true);
        buf = [];
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => { if (e.key === 'Escape') setActive(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="konami-title"
      onClick={() => setActive(false)}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-6 cursor-pointer animate-fade-slide"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-md w-full rounded-2xl border border-primary/40 bg-slate-900/90 p-8 text-center font-mono text-primary shadow-[0_0_60px_rgba(45,212,191,0.35)] cursor-default"
      >
        <div className="text-5xl mb-3" aria-hidden="true">🚀</div>
        <h2 id="konami-title" className="text-lg font-bold tracking-wider mb-2">
          COCKPIT UNLOCKED
        </h2>
        <pre className="text-[11px] leading-snug text-primary/80 my-4 select-none">
{`╔══════════════════════════╗
║  PRE-LAUNCH CHECKLIST    ║
║  ────────────────────    ║
║  THRUSTERS . . . . [ OK ]║
║  TELEMETRY . . . . [ OK ]║
║  AI COPILOT  . . . [ OK ]║
║  KONAMI MODE . . . [ ON ]║
╚══════════════════════════╝`}
        </pre>
        <p className="text-xs text-slate-300">
          You found a secret. Nicely done.
        </p>
        <button
          type="button"
          onClick={() => setActive(false)}
          className="mt-5 px-4 py-1.5 rounded-md bg-primary text-black text-sm font-semibold hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Close (Esc)
        </button>
      </div>
    </div>
  );
};

export default KonamiEasterEgg;
