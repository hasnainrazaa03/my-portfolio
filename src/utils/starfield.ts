/**
 * starfield.ts — the Star particle used by SpaceBackground.
 *
 * WHY IT LIVES HERE: the class was declared inline inside the component's
 * effect, which makes React Compiler bail out of optimizing the whole component
 * ("Inline `class` declarations are not supported"). Hoisting it also makes the
 * motion logic unit-testable, which it wasn't before.
 *
 * The class closes over per-run values (canvas size, theme, viewport class),
 * so those are passed in as a `StarfieldEnv` rather than captured — the effect
 * re-runs on theme change and rebuilds the env.
 */

export interface StarfieldEnv {
  canvas: { width: number; height: number };
  ctx: Pick<CanvasRenderingContext2D, 'fillStyle' | 'beginPath' | 'arc' | 'fill'>;
  isMobile: boolean;
  isDark: boolean;
  prefersReducedMotion: boolean;
}

export class Star {
  x = 0;
  y = 0;
  size = 0;
  speedY = 0;
  brightness = 0;

  constructor(private env: StarfieldEnv) {
    this.init();
  }

  init() {
    const { canvas, isMobile, isDark } = this.env;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    const sizeBase = isMobile ? 1 : isDark ? 2 : 1.5;
    this.size = Math.random() * sizeBase;
    this.speedY = Math.random() * 0.5 + 0.1;
    this.brightness = Math.random();
  }

  update() {
    if (this.env.prefersReducedMotion) return;

    this.y += this.speedY;
    if (this.y > this.env.canvas.height) {
      this.y = 0;
      this.x = Math.random() * this.env.canvas.width;
    }

    this.brightness += (Math.random() - 0.5) * 0.1;
    if (this.brightness > 1) this.brightness = 1;
    if (this.brightness < 0.3) this.brightness = 0.3;
  }

  draw() {
    const { ctx, isDark } = this.env;
    ctx.fillStyle = isDark
      ? `rgba(255, 255, 255, ${this.brightness})`
      : `rgba(15, 23, 42, ${this.brightness * 0.5})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Star count for a viewport width — fewer on mobile to save battery. */
export function starCountFor(viewportWidth: number): number {
  return viewportWidth < 768 ? 60 : 150;
}
