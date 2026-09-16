import React from 'react';
import { ArrowLeft, ArrowRight, Wind, Radar, Sparkles, FileSearch, Orbit } from 'lucide-react';
import { PROJECTS } from '../../constants';
import { projectPath } from '../../utils/slug';

/**
 * The lab index: everything on the site a visitor can operate, in one place.
 * Prototypes are labelled as such.
 */
const naca = PROJECTS.find((p) => /NACA 4412/.test(p.title));

const ITEMS = [
  {
    href: '/#hero',
    icon: Wind,
    title: 'Teach a neural network to predict lift',
    text: 'The front page: drag an airfoil in ideal flow while a small network learns the lift curve from it in your browser.',
  },
  {
    href: naca ? projectPath(naca.title) : '/#projects',
    icon: Sparkles,
    title: 'Lift against angle of attack',
    text: 'Thin-airfoil theory for the NACA 4412 and 0012, with the stall region marked as not modelled.',
  },
  {
    href: '/fit',
    icon: FileSearch,
    title: 'Compare a job description',
    text: 'Paste a posting and see what the record supports, what it does not, and the work behind every claim.',
  },
  {
    href: '/lab/constellation',
    icon: Orbit,
    title: 'Project constellation',
    text: 'Selected projects as a star map, joined where they share real engineering patterns.',
    prototype: true,
  },
  {
    href: '/lab/mission-control',
    icon: Radar,
    title: 'Mission Control',
    text: 'A simulated orbital insertion with live telemetry, a sensor fault, a decision to make, and a system that recovers.',
    prototype: true,
  },
];

const LabPage = () => (
  <main className="min-h-screen bg-white text-slate-800 dark:bg-[#030014] dark:text-slate-200">
    <div className="mx-auto max-w-4xl px-6 py-16">
      <a href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
        <ArrowLeft size={16} aria-hidden="true" /> Home
      </a>
      <h1 className="mt-8 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Interactive lab</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
        Things on this site you can operate rather than read.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 list-none p-0">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_rgba(45,212,191,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-white/5"
            >
              <span className="flex items-center gap-3">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <item.icon size={18} aria-hidden="true" />
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{item.title}</span>
                {item.prototype && (
                  <span className="ml-auto rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Prototype
                  </span>
                )}
              </span>
              <span className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.text}</span>
              <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                Open <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  </main>
);

export default LabPage;
