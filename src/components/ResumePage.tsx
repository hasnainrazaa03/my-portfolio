import React, { useEffect } from 'react';
import {
  PERSONAL_INFO,
  EDUCATION,
  EXPERIENCE,
  SKILLS,
  PROJECTS,
} from '../constants';

/**
 * Print-optimised resume view, data-driven from `src/constants.js`.
 *
 * Reachable at `/resume` (SPA fallback). Designed to be printed via the
 * browser ("Save as PDF"). No images, no animations, no Tailwind dark mode
 * artefacts — just black text on white paper.
 */
const ResumePage = () => {
  useEffect(() => {
    const prev = document.title;
    document.title = `${PERSONAL_INFO.name} — Resume`;
    return () => {
      document.title = prev;
    };
  }, []);

  const handlePrint = () => window.print();

  return (
    <main className="bg-white text-slate-900 min-h-screen">
      {/* Top toolbar — hidden when printing. */}
      <div className="print:hidden border-b border-slate-200 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between text-sm">
          <a
            href="/"
            className="text-slate-700 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            &larr; Back to portfolio
          </a>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-md bg-primary text-black font-medium hover:bg-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-10 print:py-4 print:px-4">
        <header className="border-b border-slate-300 pb-4 mb-6">
          <h1 className="text-3xl font-bold">{PERSONAL_INFO.name}</h1>
          <p className="text-sm text-slate-700 mt-1">
            MSCS @ USC · AI / ML Engineer · Aerospace background
          </p>
          <p className="text-sm text-slate-700">
            <a className="underline" href={`mailto:${PERSONAL_INFO.email}`}>
              {PERSONAL_INFO.email}
            </a>
            {' · '}
            <a
              className="underline"
              href={PERSONAL_INFO.socials.github}
              rel="noreferrer noopener"
            >
              GitHub
            </a>
            {' · '}
            <a
              className="underline"
              href={PERSONAL_INFO.socials.linkedin}
              rel="noreferrer noopener"
            >
              LinkedIn
            </a>
          </p>
        </header>

        {/* EDUCATION */}
        <section className="mb-6">
          <h2 className="text-base font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
            Education
          </h2>
          {EDUCATION.map((edu) => (
            <div key={edu.id} className="mb-3">
              <div className="flex justify-between items-baseline">
                <strong className="text-sm">{edu.school}</strong>
                <span className="text-xs text-slate-600">{edu.period}</span>
              </div>
              <div className="text-sm italic">{edu.degree}</div>
              {edu.gpa && (
                <div className="text-xs text-slate-700">GPA: {edu.gpa}</div>
              )}
              {edu.coursework && (
                <div className="text-xs text-slate-600 mt-0.5">
                  <span className="font-medium">Coursework:</span> {edu.coursework}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* EXPERIENCE */}
        <section className="mb-6">
          <h2 className="text-base font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
            Experience
          </h2>
          {EXPERIENCE.map((exp) => (
            <div key={exp.id} className="mb-4">
              <div className="flex justify-between items-baseline">
                <strong className="text-sm">
                  {exp.role} · {exp.company}
                </strong>
                <span className="text-xs text-slate-600">{exp.period}</span>
              </div>
              {exp.location && (
                <div className="text-xs italic text-slate-600">
                  {exp.location}
                </div>
              )}
              <ul className="mt-1 list-disc pl-5 space-y-0.5 text-xs leading-snug">
                {(Array.isArray(exp.description) ? exp.description : [exp.description])
                  .filter(Boolean)
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
              </ul>
            </div>
          ))}
        </section>

        {/* PROJECTS */}
        <section className="mb-6">
          <h2 className="text-base font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
            Selected Projects
          </h2>
          {PROJECTS.slice(0, 5).map((p) => (
            <div key={p.id} className="mb-3">
              <div className="flex justify-between items-baseline">
                <strong className="text-sm">{p.title}</strong>
                <span className="text-xs text-slate-600">{p.category}</span>
              </div>
              <div className="text-xs">{p.description}</div>
              {Array.isArray(p.techStack) && p.techStack.length > 0 && (
                <div className="text-[11px] text-slate-600 mt-0.5">
                  <em>Tech:</em> {p.techStack.slice(0, 8).join(', ')}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* SKILLS */}
        <section className="mb-6">
          <h2 className="text-base font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
            Skills
          </h2>
          {SKILLS.map((group) => (
            <div key={group.category} className="text-xs mb-1.5">
              <strong>{group.category}:</strong>{' '}
              {group.items.map((s) => s.name).join(', ')}
            </div>
          ))}
        </section>

        <footer className="text-[10px] text-slate-500 text-center pt-2 border-t border-slate-200">
          Generated from portfolio data · hasnainrazaa.vercel.app
        </footer>
      </article>
    </main>
  );
};

export default ResumePage;
