/**
 * architectureFlow.test.jsx — the case-study diagram shows the mechanism.
 *
 * What makes it worth having: stages sit in the context that runs them, every
 * arrow says what it carries, and every guard shows its condition and outcome.
 * These assert those properties against the real Vimaan content, plus the
 * schema rules that keep future diagrams honest.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import ArchitectureFlow from '../components/ArchitectureFlow';
import { PROJECTS } from '../constants';
import { ArchitectureSchema } from '../data/contentSchema';
import { ARCHITECTURES } from '../data/architectures';

afterEach(cleanup);

const diagram = ARCHITECTURES['Project Vimaan'];

describe('the Vimaan runtime diagram', () => {
  it('exists, and passes the content schema', () => {
    expect(diagram).toBeTruthy();
    expect(ArchitectureSchema.safeParse(diagram).success).toBe(true);
  });

  it('puts every stage inside the thread that runs it', () => {
    render(<ArchitectureFlow diagram={diagram} />);
    for (const lane of diagram.lanes) {
      const region = screen.getByRole('region', { name: lane.label });
      const items = within(region).getAllByRole('listitem');
      expect(items).toHaveLength(lane.stages.length);
      for (const stage of lane.stages) expect(within(region).getByText(stage.label)).toBeInTheDocument();
    }
  });

  it('names the one thing that crosses between threads', () => {
    render(<ArchitectureFlow diagram={diagram} />);
    expect(screen.getByText(/queue\.Queue — the only thing the two threads share/)).toBeInTheDocument();
  });

  it('labels every arrow with what it carries', () => {
    const { container } = render(<ArchitectureFlow diagram={diagram} />);
    const text = container.textContent;
    for (const lane of diagram.lanes) {
      for (const stage of lane.stages) if (stage.passes) expect(text).toContain(`passes ${stage.passes}`);
    }
  });

  it('shows all four guards, each with its condition and outcome', () => {
    const { container } = render(<ArchitectureFlow diagram={diagram} />);
    const exits = diagram.lanes.flatMap((l) => l.stages).filter((s) => s.exit);
    expect(exits.map((s) => s.label)).toEqual([
      'Confidence floor',
      'Actionable intent?',
      'Safety interlocks',
      'Slot validation',
    ]);
    for (const s of exits) {
      expect(container.textContent).toContain(`Stops here if ${s.exit.when}`);
      expect(container.textContent).toContain(s.exit.outcome);
    }
  });

  it('keeps every guard BEFORE the stage that commands the simulator', () => {
    // The order is the safety argument: nothing reaches the aircraft without
    // passing every guard.
    const stages = diagram.lanes.flatMap((l) => l.stages).map((s) => s.label);
    const command = stages.indexOf('Command the simulator');
    for (const guard of ['Confidence floor', 'Actionable intent?', 'Safety interlocks', 'Slot validation']) {
      expect(stages.indexOf(guard), guard).toBeLessThan(command);
    }
  });

  it('makes no latency claim — the path has never been measured end to end', () => {
    const all = JSON.stringify(diagram);
    expect(all).not.toMatch(/\b\d+\s?ms\b|latency|milliseconds/i);
  });
});

describe('the schema keeps diagrams diagrams', () => {
  it('rejects a box label long enough to be a paragraph', () => {
    const bad = structuredClone(diagram);
    bad.lanes[0].stages[0].label = 'A stage label that has turned into a whole sentence about the system';
    expect(ArchitectureSchema.safeParse(bad).success).toBe(false);
  });

  it('requires one hand-off label per boundary between lanes', () => {
    const bad = structuredClone(diagram);
    bad.handoffs = [];
    expect(ArchitectureSchema.safeParse(bad).success).toBe(false);
  });

  it('gives every diagram a real project, and every diagram passes', () => {
    // Keyed by title, so a renamed project would orphan its diagram silently.
    const titles = PROJECTS.map((p) => p.title);
    for (const [title, d] of Object.entries(ARCHITECTURES)) {
      expect(titles, `${title} is not a project`).toContain(title);
      expect(ArchitectureSchema.safeParse(d).success, title).toBe(true);
    }
  });

  it('stays out of constants.ts, which ships in the entry bundle', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(`${process.cwd()}/src/constants.ts`, 'utf8');
    expect(src).not.toMatch(/\barchitecture:\s*\{/);
  });
});
