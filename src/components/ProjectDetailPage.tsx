import React, { useEffect } from 'react';
import { ExternalLink, Github, ArrowLeft } from 'lucide-react';
import { PROJECTS, PERSONAL_INFO } from '../constants';
import { toSlug } from '../utils/slug';
import LazyImage from './ui/LazyImage';
import type { Project } from '../types/content';

/**
 * Standalone case-study page for one project, at `/projects/<slug>`.
 *
 * WHY THIS EXISTS ALONGSIDE THE MODAL: the modal is for someone already
 * browsing the grid. A detail page is for someone arriving from a shared link
 * or a search result, and it is the only form that can carry a real <title>,
 * its own description and structured data. A recruiter forwarding "look at this
 * one" previously had no URL to send.
 *
 * Rendered by App's pathname routing rather than a router dependency, matching
 * how /resume and /privacy already work.
 */
interface ProjectDetailPageProps {
  slug: string;
}

/** Set the document title and description for the life of this page. */
function useProjectMeta(project: Project | undefined) {
  useEffect(() => {
    if (!project) {
      document.title = 'Project not found | Hasnain Raza';
      return;
    }
    const previous = document.title;
    document.title = `${project.title} | ${PERSONAL_INFO.name}`;

    // Reuse the existing description tag rather than adding a second one;
    // two would leave crawlers to pick, and they do not always pick the later.
    const meta = document.querySelector('meta[name="description"]');
    const previousDesc = meta?.getAttribute('content') ?? null;
    meta?.setAttribute('content', project.description);

    return () => {
      document.title = previous;
      if (meta && previousDesc !== null) meta.setAttribute('content', previousDesc);
    };
  }, [project]);
}

const ProjectDetailPage = ({ slug }: ProjectDetailPageProps) => {
  const project = PROJECTS.find((p) => toSlug(p.title) === slug);
  useProjectMeta(project);

  if (!project) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#030014] text-slate-800 dark:text-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
            That project doesn&rsquo;t exist
          </h1>
          <p className="mb-8 text-slate-600 dark:text-slate-400">
            The link may be out of date. All projects are listed on the main page.
          </p>
          <a href="/#projects" className="text-primary hover:underline">
            See all projects
          </a>
        </div>
      </main>
    );
  }

  const { github, demo } = project.links ?? { github: null, demo: null };

  return (
    <main className="min-h-screen bg-white dark:bg-[#030014] text-slate-800 dark:text-slate-200">
      <article className="max-w-3xl mx-auto px-6 py-16">
        <a
          href="/#projects"
          className="inline-flex items-center gap-2 mb-8 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to all projects
        </a>

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/30">
              {project.category}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {project.status}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {project.title}
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {project.description}
          </p>
        </header>

        {project.images?.[0] && (
          <LazyImage
            src={project.images[0]}
            alt={`${project.title} screenshot`}
            width={768}
            height={307}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 mb-10"
          />
        )}

        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary mb-3">
            Overview
          </h2>
          <p className="leading-relaxed whitespace-pre-line">
            {project.longDescription || project.description}
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary mb-3">
            Built with
          </h2>
          <ul className="flex flex-wrap gap-2 list-none p-0">
            {project.techStack?.map((tech) => (
              <li
                key={tech}
                className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
              >
                {tech}
              </li>
            ))}
          </ul>
        </section>

        {(github || demo) && (
          <section className="flex flex-wrap gap-3">
            {github && (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-white/15 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Github size={16} aria-hidden="true" />
                Source
                <span className="sr-only"> for {project.title} (opens in a new tab)</span>
              </a>
            )}
            {demo && (
              <a
                href={demo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-black hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ExternalLink size={16} aria-hidden="true" />
                Live demo
                <span className="sr-only"> of {project.title} (opens in a new tab)</span>
              </a>
            )}
          </section>
        )}
      </article>
    </main>
  );
};

export default ProjectDetailPage;
