import React from 'react';
import { motion } from 'framer-motion';
import { Award, ExternalLink } from 'lucide-react';
import { ACHIEVEMENTS } from '../constants';

/**
 * Achievements / Badges Wall
 *
 * Content-only section sourced from `constants.ACHIEVEMENTS`. Each entry
 * renders as a card with a category pill, year, issuer, and short detail.
 * Cards link out only when `url` is provided; otherwise they're inert
 * (no empty `href="#"` traps).
 */
const Achievements = () => {
  if (!ACHIEVEMENTS?.length) return null;

  return (
    <section id="achievements" className="py-20 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center">
          <span className="text-primary">06.</span> Achievements
        </h2>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-12 text-sm">
          A short wall of recognitions, certifications, and milestones — receipts, not flexes.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ACHIEVEMENTS.map((item, idx) => {
            const Wrapper = item.url ? motion.a : motion.div;
            const wrapperProps = item.url
              ? { href: item.url, target: '_blank', rel: 'noopener noreferrer' }
              : {};

            return (
              <Wrapper
                key={`${item.title}-${idx}`}
                {...wrapperProps}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 dark:border-white/10 dark:bg-white/5"
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Award size={12} />
                    {item.category}
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {item.year}
                  </span>
                </div>

                <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                  {item.title}
                  {item.url && (
                    <ExternalLink
                      size={12}
                      className="ml-1.5 inline opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  )}
                </h3>

                {item.issuer && (
                  <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {item.issuer}
                  </p>
                )}

                {item.detail && (
                  <p className="mt-auto text-sm text-slate-600 dark:text-slate-400">
                    {item.detail}
                  </p>
                )}
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Achievements;
