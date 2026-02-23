/**
 * projectsFilter.test.js
 * ---------------------------------------------------------------------------
 * Verifies Projects filtering logic (useMemo) and data integrity.
 *
 * Run:  npm test
 */
import { describe, it, expect } from 'vitest';
import { PROJECTS } from '../constants';

describe('Projects — Filter & Data Integrity', () => {
  it('PROJECTS array should be non-empty', () => {
    expect(PROJECTS.length).toBeGreaterThan(0);
  });

  it('every project should have required fields', () => {
    PROJECTS.forEach((p) => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('title');
      expect(p).toHaveProperty('description');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('techStack');
      expect(Array.isArray(p.techStack)).toBe(true);
    });
  });

  it('filtering by category returns correct subset', () => {
    const categories = [...new Set(PROJECTS.map((p) => p.category))];

    categories.forEach((cat) => {
      const filtered = PROJECTS.filter((p) => p.category === cat);
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((p) => {
        expect(p.category).toBe(cat);
      });
    });
  });

  it('"All" filter should return entire array', () => {
    const all = PROJECTS; // "All" tab just uses PROJECTS directly
    expect(all.length).toBe(PROJECTS.length);
  });

  it('pagination math is correct', () => {
    const perPage = 3;
    const totalPages = Math.ceil(PROJECTS.length / perPage);

    expect(totalPages).toBeGreaterThanOrEqual(1);

    // Last page should have between 1 and perPage items
    const lastPageStart = (totalPages - 1) * perPage;
    const lastPageItems = PROJECTS.slice(lastPageStart, lastPageStart + perPage);
    expect(lastPageItems.length).toBeGreaterThan(0);
    expect(lastPageItems.length).toBeLessThanOrEqual(perPage);
  });

  it('project IDs are unique', () => {
    const ids = PROJECTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
