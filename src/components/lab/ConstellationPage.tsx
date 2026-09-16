import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PROJECTS } from '../../constants';
import { projectPath } from '../../utils/slug';
import ProjectCard from '../ProjectCard';
import Constellation from './Constellation';

/**
 * The constellation page (prototype): the map at the top, the ordinary cards
 * underneath. Hovering a card lights its star; a star opens the case study.
 * Neither is the only way in.
 */
const ConstellationPage = () => {
  const [highlight, setHighlight] = useState<string | null>(null);
  return (
    <main className="min-h-screen bg-white text-slate-800 dark:bg-[#030014] dark:text-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <a href="/lab" className="inline-flex items-center gap-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          <ArrowLeft size={16} aria-hidden="true" /> Back to the lab
        </a>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-widest text-primary">Prototype</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Selected work</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Systems I’ve built across AI, aerospace and the web — and the engineering they share. A line joins two projects only
          where a real pattern runs through both.
        </p>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 sm:p-8" aria-label="Constellation">
          <Constellation highlight={highlight} />
        </section>

        <section className="mt-14" aria-labelledby="all-projects">
          <h2 id="all-projects" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary">
            All projects
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((p) => (
              <div key={p.id} onMouseEnter={() => setHighlight(p.title)} onMouseLeave={() => setHighlight(null)}>
                <ProjectCard project={p} onClick={(project) => window.location.assign(projectPath(project.title))} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default ConstellationPage;
