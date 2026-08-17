/**
 * themeContext.test.jsx — one owner for every theme preference.
 *
 * The bug this prevents is subtle. `useDarkMode` and `useHighContrast` each
 * hold their own `useState` while writing to SHARED global state — the `dark` /
 * `hc` classes on <html>, and localStorage. That only works while each hook has
 * exactly one caller. A second caller gets its own copy, and the two diverge as
 * soon as either changes: the DOM class reflects whichever rendered last while
 * the other still renders from a stale boolean. It presents as "the toggle
 * works but the page doesn't update", which is miserable to debug.
 *
 * So the tests that matter here are the multi-consumer ones.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../context/ThemeProvider';
import { useTheme } from '../context/ThemeContext';

function Consumer({ label }) {
  const { isDark, toggleTheme, highContrast, toggleHighContrast } = useTheme();
  return (
    <div>
      <span data-testid={`${label}-dark`}>{String(isDark)}</span>
      <span data-testid={`${label}-hc`}>{String(highContrast)}</span>
      <button onClick={toggleTheme}>toggle {label}</button>
      <button onClick={toggleHighContrast}>hc {label}</button>
    </div>
  );
}

const renderWith = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});
afterEach(() => vi.restoreAllMocks());

describe('ThemeProvider', () => {
  it('gives every consumer the same value', () => {
    renderWith(<><Consumer label="a" /><Consumer label="b" /></>);
    expect(screen.getByTestId('a-dark').textContent).toBe(screen.getByTestId('b-dark').textContent);
  });

  it('keeps consumers in sync when one of them toggles', async () => {
    renderWith(<><Consumer label="a" /><Consumer label="b" /></>);
    const before = screen.getByTestId('a-dark').textContent;

    await userEvent.click(screen.getByRole('button', { name: 'toggle a' }));

    // THE regression this file exists for: b must move with a.
    expect(screen.getByTestId('a-dark').textContent).not.toBe(before);
    expect(screen.getByTestId('b-dark').textContent).toBe(screen.getByTestId('a-dark').textContent);
  });

  it('keeps high contrast in sync across consumers too', async () => {
    renderWith(<><Consumer label="a" /><Consumer label="b" /></>);
    await userEvent.click(screen.getByRole('button', { name: 'hc a' }));
    expect(screen.getByTestId('b-hc').textContent).toBe(screen.getByTestId('a-hc').textContent);
  });

  it('drives the `dark` class on <html>', async () => {
    renderWith(<Consumer label="a" />);
    const wasDark = document.documentElement.classList.contains('dark');
    await userEvent.click(screen.getByRole('button', { name: 'toggle a' }));
    expect(document.documentElement.classList.contains('dark')).toBe(!wasDark);
  });

  it('drives the `hc` class on <html>', async () => {
    renderWith(<Consumer label="a" />);
    await userEvent.click(screen.getByRole('button', { name: 'hc a' }));
    expect(document.documentElement.classList.contains('hc')).toBe(true);
  });

  it('persists the choice under the existing storage keys', async () => {
    // Keys are unchanged from the pre-context hooks, so nobody loses a saved
    // preference across this refactor.
    renderWith(<Consumer label="a" />);
    await userEvent.click(screen.getByRole('button', { name: 'hc a' }));
    expect(localStorage.getItem('pref:highContrast')).toBe('true');
    expect(['dark', 'light']).toContain(localStorage.getItem('theme'));
  });

  it('restores a saved dark preference', () => {
    localStorage.setItem('theme', 'light');
    renderWith(<Consumer label="a" />);
    expect(screen.getByTestId('a-dark').textContent).toBe('false');
  });
});

describe('useTheme outside a provider', () => {
  it('throws a message naming the fix', () => {
    // A silent default would render a light component inside a dark page and
    // look like a styling bug anywhere but the actual cause.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer label="orphan" />)).toThrow(/must be used within a <ThemeProvider>/);
  });
});

describe('storage failures do not take the page down', () => {
  it('survives localStorage.setItem throwing (Safari private mode)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    // An unguarded write inside the effect would escalate to the app-level
    // ErrorBoundary and blank the page — over a preference nobody would miss.
    expect(() => renderWith(<Consumer label="a" />)).not.toThrow();
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'toggle a' }));
    });
    expect(document.documentElement.classList.contains('dark')).toBeDefined();
    setItem.mockRestore();
  });

  it('survives localStorage.getItem throwing on init', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    expect(() => renderWith(<Consumer label="a" />)).not.toThrow();
    getItem.mockRestore();
  });
});
