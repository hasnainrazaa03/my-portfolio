import { useState, useEffect } from 'react';

/**
 * PERF: a single module-level scroll listener is shared by every consumer of
 * this hook. Previously each consumer (Navigation, PageTitleUpdater) attached
 * its own listener and ran `getBoundingClientRect()` per section on every
 * scroll event, doubling layout work. Now we compute once and broadcast.
 */

type Subscriber = (id: string) => void;

const DEFAULT_SECTION = 'hero';

let listenerAttached = false;
/**
 * The UNION of every consumer's ids, kept as a Set so order of registration
 * cannot matter. The previous "last consumer wins" assignment meant Navigation
 * (which does not list `hero`) overwrote PageTitleUpdater's list on every
 * render, so `hero` was never watched and nothing could ever become active
 * again after scrolling back to the top.
 */
const watched = new Set<string>([DEFAULT_SECTION]);
let lastActive = DEFAULT_SECTION;
const subscribers = new Set<Subscriber>();

function broadcast(id: string): void {
  if (id === lastActive) return;
  lastActive = id;
  subscribers.forEach((cb) => cb(id));
}

function compute(): void {
  const spyLine = window.innerHeight * 0.3;
  for (const id of watched) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top <= spyLine && rect.bottom > spyLine) {
      broadcast(id);
      return;
    }
  }
  // Nothing under the spy line (above the first section, or between two):
  // fall back rather than leaving the last section highlighted forever.
  broadcast(DEFAULT_SECTION);
}

function attachIfNeeded(): void {
  if (listenerAttached || typeof window === 'undefined') return;
  listenerAttached = true;
  window.addEventListener('scroll', compute, { passive: true });
}

export const useActiveSection = (sectionIds: string[]): string => {
  const [activeSection, setActiveSection] = useState<string>(lastActive);

  useEffect(() => {
    for (const id of sectionIds) watched.add(id);
    attachIfNeeded();
    subscribers.add(setActiveSection);
    compute(); // immediate sync on mount

    return () => {
      subscribers.delete(setActiveSection);
    };
  }, [sectionIds]);

  return activeSection;
};
