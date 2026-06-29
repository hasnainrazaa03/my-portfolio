/**
 * useFocusTrap.test.jsx — focus trap hook (Phase 3 / T3.3).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';

afterEach(cleanup);

function Harness({ onEscape, active = true, initialFocus = false }) {
  const ref = useRef(null);
  useFocusTrap(ref, { onEscape, active, initialFocus });
  return (
    <div ref={ref} data-testid="trap">
      <button>first</button>
      <button>middle</button>
      <button>last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('calls onEscape when Escape is pressed', () => {
    const onEscape = vi.fn();
    render(<Harness onEscape={onEscape} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does not call onEscape when inactive', () => {
    const onEscape = vi.fn();
    render(<Harness onEscape={onEscape} active={false} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('Tab from the last focusable wraps to the first', () => {
    render(<Harness />);
    const buttons = screen.getAllByRole('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab from the first focusable wraps to the last', () => {
    render(<Harness />);
    const buttons = screen.getAllByRole('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    first.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('restores focus to the previously-focused element on unmount', () => {
    // An element outside the trap that "opened" it.
    const opener = document.createElement('button');
    opener.textContent = 'opener';
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { unmount } = render(<Harness />);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
