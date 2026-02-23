/**
 * aboutImage.test.js
 * ---------------------------------------------------------------------------
 * Verifies the About section contains the portrait image with correct
 * alt text, circular avatar styling, and no visible degree caption.
 *
 * Uses a lightweight source-level check (no DOM rendering needed).
 * Run:  npm test
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const aboutSource = readFileSync(
  resolve(__dirname, '../components/About.jsx'),
  'utf-8'
);

describe('About — Portrait Image', () => {
  it('should render an <img> with src="/me.jpg"', () => {
    expect(aboutSource).toContain('src="/me.jpg"');
  });

  it('should have alt text "Hasnain Raza"', () => {
    expect(aboutSource).toContain('alt="Hasnain Raza"');
  });

  it('should NOT display a visible caption with name or degree', () => {
    // The caption was removed per request
    expect(aboutSource).not.toMatch(/MS CS, USC/);
  });

  it('should render a circular avatar (rounded-full)', () => {
    expect(aboutSource).toMatch(/rounded-full/);
  });

  it('should use neon-500 ring token on hover', () => {
    expect(aboutSource).toMatch(/ring-neon-500/);
  });

  it('should apply glass/backdrop-blur accent styling', () => {
    expect(aboutSource).toMatch(/backdrop-blur/);
  });
});
