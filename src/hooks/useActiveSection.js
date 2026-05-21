import { useState, useEffect } from 'react';

/**
 * PERF: a single module-level scroll listener is shared by every consumer of
 * this hook. Previously each consumer (Navigation, PageTitleUpdater) attached
 * its own listener and ran `getBoundingClientRect()` per section on every
 * scroll event, doubling layout work. Now we compute once and broadcast.
 */

let listenerAttached = false;
let lastSectionIds = [];
let lastActive = 'hero';
const subscribers = new Set();

function compute() {
  const spyLine = window.innerHeight * 0.3;
  for (const id of lastSectionIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top <= spyLine && rect.bottom > spyLine) {
      if (id !== lastActive) {
        lastActive = id;
        subscribers.forEach((cb) => cb(id));
      }
      return;
    }
  }
}

function attachIfNeeded() {
  if (listenerAttached || typeof window === 'undefined') return;
  listenerAttached = true;
  window.addEventListener('scroll', compute, { passive: true });
}

export const useActiveSection = (sectionIds) => {
  const [activeSection, setActiveSection] = useState(lastActive);

  useEffect(() => {
    // Track the *union* of all requested section IDs so the shared listener
    // covers every consumer's needs (consumers in this codebase pass the same list).
    lastSectionIds = sectionIds;
    attachIfNeeded();
    subscribers.add(setActiveSection);
    compute(); // immediate sync on mount

    return () => {
      subscribers.delete(setActiveSection);
    };
  }, [sectionIds]);

  return activeSection;
};
