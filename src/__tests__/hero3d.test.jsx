/**
 * hero3d.test.jsx — WebGL-absent degradation.
 *
 * REGRESSION GUARD: `new THREE.WebGLRenderer()` throws when no WebGL context
 * can be created (sandboxed browsers, GPU blocklists, driver resets). That
 * throw happened inside an effect, so React escalated it to the app-level
 * ErrorBoundary and the ENTIRE site rendered "Something went wrong" — observed
 * live on 2026-08-15. Hero3D must now degrade to a static visual instead.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const WebGLRenderer = vi.fn();

vi.mock('three', () => {
  class Vec3 { set() {} }
  class Obj3D {
    constructor() {
      this.rotation = { x: 0, y: 0, z: 0 };
      this.position = new Vec3();
      this.userData = {};
      this.children = [];
    }
    add(child) { this.children.push(child); }
  }
  const disposable = () => ({ dispose: () => {} });
  return {
    Scene: Obj3D,
    Group: Obj3D,
    Mesh: Obj3D,
    Points: Obj3D,
    PerspectiveCamera: class extends Obj3D { updateProjectionMatrix() {} },
    WebGLRenderer,
    IcosahedronGeometry: disposable,
    TorusGeometry: disposable,
    BufferGeometry: class { setAttribute() {} dispose() {} },
    BufferAttribute: class {},
    MeshPhongMaterial: disposable,
    MeshBasicMaterial: disposable,
    PointsMaterial: disposable,
    AmbientLight: Obj3D,
    PointLight: Obj3D,
    Raycaster: class { setFromCamera() {} intersectObjects() { return []; } },
    Vector2: class {},
    Clock: class { getElapsedTime() { return 0; } },
  };
});

let Hero3D;
beforeEach(async () => {
  vi.clearAllMocks();
  ({ default: Hero3D } = await import('../components/Hero3D'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Hero3D without WebGL', () => {
  it('renders the static fallback instead of throwing when no context exists', () => {
    // jsdom returns null for a 'webgl' context — the real-world failure shape.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(() => render(<Hero3D />)).not.toThrow();
    expect(screen.getByRole('img', { name: /orbital/i })).toBeInTheDocument();
    // The probe must short-circuit before three is constructed at all.
    expect(WebGLRenderer).not.toHaveBeenCalled();
  });

  it('falls back when the renderer constructor throws despite a passing probe', () => {
    // Probe succeeds...
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension: () => ({ loseContext: () => {} }),
    });
    // ...but context creation fails at construction time (GPU reset, context limit).
    WebGLRenderer.mockImplementation(() => {
      throw new TypeError('Could not create a WebGL context');
    });

    expect(() => render(<Hero3D />)).not.toThrow();
    expect(screen.getByRole('img', { name: /orbital/i })).toBeInTheDocument();
  });
});
