/**
 * reducedMotion.test.jsx — prefers-reduced-motion must be honoured globally.
 *
 * THE GAP THIS CLOSES: the app had 16 `whileInView` reveals and 9 hover
 * animations across 11 components — 40px slides, 0.8->1 scales, spring bounces
 * — and the `useReducedMotion()` hook was wired into exactly ONE of them
 * (CursorGlow). Anyone who asks their OS for less motion got all of it anyway,
 * which is a WCAG 2.3.3 problem and a genuine vestibular trigger.
 *
 * The fix is one `<MotionConfig reducedMotion="user">` at the root rather than
 * a hook threaded through 25 call sites, because the threaded version is what
 * drifted in the first place. These tests pin the root switch and the two
 * places Framer cannot reach: native scrolling in CSS and in the chat.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('global motion switch', () => {
  const app = read('src/App.tsx');

  it('wraps the app in MotionConfig with reducedMotion="user"', () => {
    expect(app).toMatch(/<MotionConfig\s+reducedMotion="user">/);
    expect(app).toMatch(/import \{ MotionConfig \} from 'framer-motion'/);
  });

  it('closes the MotionConfig it opens', () => {
    expect((app.match(/<MotionConfig/g) || []).length).toBe(
      (app.match(/<\/MotionConfig>/g) || []).length,
    );
  });
});

describe('native scrolling', () => {
  const css = read('src/index.css');

  it('declares smooth scrolling only when no preference is expressed', () => {
    // CSS smooth-scroll is opt-OUT, so an unguarded `html { scroll-behavior:
    // smooth }` applies to anchor jumps, browser find and keyboard paging
    // regardless of the user's setting.
    const guarded = /@media \(prefers-reduced-motion: no-preference\)\s*\{[^}]*html\s*\{[^}]*scroll-behavior:\s*smooth/s;
    expect(css).toMatch(guarded);

    // …and never unconditionally.
    const unguarded = css.replace(
      /@media \(prefers-reduced-motion: no-preference\)[\s\S]*?\n\}/g,
      '',
    );
    expect(unguarded).not.toMatch(/scroll-behavior:\s*smooth/);
  });

  it('neutralises stray animations under reduce', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
  });
});

describe('chat auto-scroll', () => {
  const messages = [{ role: 'assistant', content: 'Hello there.' }];

  const setMediaQuery = (matches) => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('reduce') ? matches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('scrolls smoothly by default', async () => {
    setMediaQuery(false);
    const { default: ChatMessages } = await import('../components/chat/ChatMessages');
    render(<ChatMessages messages={messages} isTyping={false} />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('jumps instantly when reduced motion is requested', async () => {
    setMediaQuery(true);
    const { default: ChatMessages } = await import('../components/chat/ChatMessages');
    render(<ChatMessages messages={messages} isTyping={false} />);
    // Framer's MotionConfig cannot reach a native scrollIntoView, so this path
    // has to check the media query itself.
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
  });
});
