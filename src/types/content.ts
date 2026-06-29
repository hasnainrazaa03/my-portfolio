/**
 * Type definitions for all site content (src/constants.ts).
 *
 * Hand-written interfaces (not z.infer-derived) to avoid a circular dependency
 * — constants imports these as `import type` (erased at runtime). Parity with
 * the Zod schemas in src/data/contentSchema.js is guaranteed by two gates that
 * run on the SAME data: tsc checks constants conforms to these interfaces, and
 * contentSchema.test.js checks it conforms to the schemas. If the two ever
 * disagree, one of those gates fails.
 */
import type { LucideIcon } from 'lucide-react';

export interface Socials {
  github: string;
  linkedin: string;
  instagram: string;
}

export interface PersonalInfo {
  name: string;
  title: string;
  tagline: string;
  bio: string;
  bioHeadline: string;
  bioStory: string;
  email: string;
  socials: Socials;
}

export interface Stat {
  target: number;
  label: string;
  suffix: string;
  icon: LucideIcon;
}

export interface NowItem {
  emoji: string;
  text: string;
}

export interface Now {
  updated: string;
  items: NowItem[];
}

export interface Education {
  id: number;
  degree: string;
  school: string;
  period: string;
  gpa: string;
  coursework: string;
  image: string;
  url: string;
}

export type ProjectCategory = 'AI/ML' | 'Aerospace' | 'Full-Stack Web';

export interface ProjectLinks {
  github: string | null;
  demo: string | null;
}

export interface Project {
  id: number;
  title: string;
  category: ProjectCategory;
  status: string;
  description: string;
  longDescription: string;
  images: string[];
  techStack: string[];
  links: ProjectLinks;
}

export interface Achievement {
  category: string;
  year: string;
  title: string;
  issuer: string;
  detail: string;
  url: string | null;
}

export interface SkillItem {
  name: string;
  level: string;
  pct: number;
  image: string;
}

export interface SkillGroup {
  category: string;
  icon: LucideIcon;
  items: SkillItem[];
}

export interface Experience {
  id: number;
  role: string;
  company: string;
  period: string;
  location: string;
  logo: string;
  description: string[];
}

export interface SiteConfig {
  enableContentProtection: boolean;
}
