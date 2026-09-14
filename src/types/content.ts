import type { IconKey } from '../components/ui/iconMap';
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
  icon: IconKey;
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
  /** Optional distinction, e.g. "Silver Medalist". Absent for most entries. */
  honors?: string;
  /**
   * Set for the degrees that belong on the career arc. Absent means "before
   * the arc" (high school), and the schema requires a month-precise period
   * whenever it is set.
   */
  focus?: FocusArea;
  coursework: string;
  image: string;
  url: string;
}

export type ProjectCategory = 'AI/ML' | 'Aerospace' | 'Full-Stack Web';

/**
 * The primary field a role or degree was spent in, for the career arc chart.
 * Chosen by what the work WAS, not by the title: PeakRoutine's title is
 * Software Engineer, but the work is the LLM layer and risk models, so it is
 * `ai`. Three values on purpose: a fourth colour on a time axis, where any
 * two bars can sit side by side, stops being reliably distinguishable.
 */
export type FocusArea = 'aerospace' | 'ai' | 'software';

export interface ProjectLinks {
  github: string | null;
  demo: string | null;
}

/**
 * One step on a project's runtime path.
 *
 * `passes` labels the arrow to the NEXT stage — what actually moves. An
 * unlabeled arrow only says "related somehow".
 */
export interface ArchitectureStage {
  label: string;
  detail?: string;
  passes?: string;
  /** A way out of the pipeline before the end — the guard, and what happens. */
  exit?: { when: string; outcome: string };
}

/** A run of stages that share an execution context (a thread, a service). */
export interface ArchitectureLane {
  label: string;
  /** Why this work lives here and not elsewhere. One sentence. */
  why: string;
  stages: ArchitectureStage[];
}

/**
 * A case-study diagram of how a project actually runs. Authored only from the
 * master document's architecture section, never from memory: a wrong diagram
 * misrepresents the work to exactly the reader it is meant to convince.
 */
export interface ArchitectureDiagram {
  title: string;
  /** The claim the figure makes, as a caption. */
  summary: string;
  lanes: ArchitectureLane[];
  /** Labels for the hand-off between lane i and lane i + 1. */
  handoffs: string[];
  /** Boundaries a reader cannot see in the boxes. */
  notes: string[];
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
  /**
   * Optional interactive textbook model on the case-study page. Always a
   * labelled idealisation, never the project's own results.
   */
  explorer?: 'thin-airfoil-lift';
}

export interface Achievement {
  category: string;
  year: string;
  title: string;
  issuer: string;
  detail: string;
  url: string | null;
}

/**
 * A skill shows EITHER a real product logo (`image`, self-hosted under
 * /icons/) or, for abstract concepts with no logo, a Lucide `icon` key.
 * Exactly one of the two is expected — the schema enforces it.
 */
export interface SkillItem {
  name: string;
  level: string;
  pct: number;
  image?: string;
  icon?: IconKey;
}

export interface SkillGroup {
  category: string;
  icon: IconKey;
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
  /** Primary field of the work. Required: every role is on the career arc. */
  focus: FocusArea;
}

export interface SiteConfig {
  enableContentProtection: boolean;
}
