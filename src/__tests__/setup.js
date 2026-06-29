// Vitest setup: extends `expect` with jest-dom matchers + jsdom shims.
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia. Several components query it for
// `prefers-reduced-motion`; return a safe inert stub.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom doesn't implement Element.scrollIntoView; several components call it
// (e.g. the chatbot auto-scrolls to the latest message). No-op stub.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom doesn't implement IntersectionObserver. Provide a no-op.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

// Some jsdom builds shipped with vitest 4 don't expose localStorage by
// default. Provide a minimal in-memory shim so hooks that persist user
// preferences (theme, high-contrast, etc.) can run under test.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map();
  window.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}
