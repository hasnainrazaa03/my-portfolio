import React, { Fragment } from 'react';
import type { ArchitectureDiagram } from '../types/content';

/**
 * ArchitectureFlow — a project's runtime path, drawn as the mechanism.
 *
 * What it is built to show, in order of importance:
 *
 *   1. WHERE WORK RUNS. Stages sit inside the execution context that owns them
 *      (a thread, a service), and the one thing that crosses between contexts
 *      is drawn and named. For Vimaan that boundary is the whole design: audio
 *      work blocks, so it lives off the simulator's thread.
 *   2. WHAT MOVES. Every arrow carries the data it passes ("transcript",
 *      "intent + slot logits"). An unlabeled arrow only says "related somehow".
 *   3. HOW IT REFUSES. Guards branch sideways with their condition and what the
 *      user hears instead, so a reader can see that nothing reaches the
 *      aircraft without passing every one.
 *
 * HTML rather than SVG, so labels wrap on a phone instead of shrinking to
 * nothing, and an ordered list gives screen readers the sequence for free.
 * Content comes from constants.ts and is length-capped by the schema: a box
 * holding a sentence is a paragraph drawn badly.
 */

interface Props {
  diagram: ArchitectureDiagram;
}

/** A small arrowhead in the current text colour. */
const Head = ({ direction }: { direction: 'down' | 'right' }) => (
  <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
    <polygon points={direction === 'down' ? '0,0 8,0 4,8' : '0,0 8,4 0,8'} fill="currentColor" />
  </svg>
);

/** The vertical arrow between two stages, labelled with what it carries. */
const Connector = ({ label, tall = false }: { label?: string; tall?: boolean }) => (
  <div className={`flex items-center gap-3 pl-5 text-slate-400 dark:text-slate-500 ${tall ? 'h-12' : 'h-8'}`}>
    <div className="flex h-full flex-col items-center">
      <span aria-hidden="true" className="w-px flex-1 bg-current" />
      <Head direction="down" />
    </div>
    {label && (
      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
        <span className="sr-only">passes </span>
        {label}
      </span>
    )}
  </div>
);

const ArchitectureFlow = ({ diagram }: Props) => (
  <figure className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0d1f] p-4 sm:p-7">
    <figcaption className="mb-6">
      <p className="font-bold text-slate-900 dark:text-white">{diagram.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{diagram.summary}</p>
    </figcaption>

    {diagram.lanes.map((lane, laneIndex) => {
      const lastStage = lane.stages[lane.stages.length - 1];
      const hasNextLane = laneIndex < diagram.lanes.length - 1;
      return (
        <Fragment key={lane.label}>
          <section
            aria-label={lane.label}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3 sm:p-4"
          >
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">{lane.label}</span>
              <span className="text-xs leading-snug text-slate-600 dark:text-slate-400">{lane.why}</span>
            </div>

            <ol className="list-none p-0">
              {lane.stages.map((stage, stageIndex) => {
                const last = stageIndex === lane.stages.length - 1;
                return (
                  <li key={stage.label}>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] sm:items-center sm:gap-4">
                      <div className="rounded-lg border border-slate-200 border-l-2 border-l-primary dark:border-white/10 dark:border-l-primary bg-white dark:bg-[#0f0d1f] px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{stage.label}</p>
                        {stage.detail && (
                          <p className="mt-0.5 text-xs leading-snug text-slate-600 dark:text-slate-400">{stage.detail}</p>
                        )}
                      </div>

                      {stage.exit && (
                        <div className="flex items-center gap-2 pl-5 text-xs sm:pl-0">
                          <span aria-hidden="true" className="flex items-center text-slate-400 dark:text-slate-500">
                            <span className="h-px w-4 bg-current sm:w-6" />
                            <Head direction="right" />
                          </span>
                          <span className="whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="sr-only">Stops here if </span>
                            {stage.exit.when}
                          </span>
                          <span className="rounded-md bg-slate-100 dark:bg-white/5 px-2 py-1 leading-snug text-slate-700 dark:text-slate-300">
                            <span className="sr-only">: </span>
                            {stage.exit.outcome}
                          </span>
                        </div>
                      )}
                    </div>

                    {!last && <Connector label={stage.passes} />}
                  </li>
                );
              })}
            </ol>
          </section>

          {hasNextLane && (
            <div className="flex flex-col items-start">
              <Connector label={lastStage.passes} />
              <div className="ml-1.5 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100">
                <span className="sr-only">Hand-off between threads: </span>
                {diagram.handoffs[laneIndex]}
              </div>
              <Connector />
            </div>
          )}
        </Fragment>
      );
    })}

    {diagram.notes.length > 0 && (
      <ul className="mt-6 space-y-2 border-t border-slate-200 dark:border-white/10 pt-4 list-none p-0">
        {diagram.notes.map((note) => (
          <li key={note} className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {note}
          </li>
        ))}
      </ul>
    )}
  </figure>
);

export default ArchitectureFlow;
