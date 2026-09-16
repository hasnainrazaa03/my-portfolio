import type { LucideIcon } from 'lucide-react';
import { Plane, HeartPulse, Brain, ChefHat, Wallet, Wind } from 'lucide-react';
import { PROJECTS } from '../../constants';
import { projectPath } from '../../utils/slug';
import type { Project, ProjectCategory } from '../../types/content';

/**
 * The constellation's data: six projects and the five relationships between
 * them that are real engineering relationships, not tag overlap.
 *
 * Every star is keyed by the project's exact title, so a renamed project
 * fails a test instead of drawing a star that links to nothing. Every edge's
 * "shared" line names a pattern both projects demonstrably use, taken from
 * the same verified copy the case studies carry.
 *
 * Coordinates are hand-placed in a 1000 × 560 space and never move: a star
 * that drifts is a star that cannot be clicked.
 */

export interface Star {
  title: string;
  label: string;
  icon: LucideIcon;
  /** 1 = supporting work, 3 = the strongest. Drawn as radius and glow. */
  weight: 1 | 2 | 3;
  x: number;
  y: number;
  blurb: string;
  skills: string[];
}

export interface Edge {
  a: string;
  b: string;
  shared: string;
}

export const STARS: readonly Star[] = [
  {
    title: 'PeakRoutine - AI Health & Wellness Platform',
    label: 'PeakRoutine',
    icon: HeartPulse,
    weight: 3,
    x: 640,
    y: 130,
    blurb: 'Health platform that scores wearable biometrics against each user’s own baseline and coaches with grounded LLM personas.',
    skills: ['Claude', 'FastAPI', 'Spring Boot', 'Webhook ingestion'],
  },
  {
    title: 'Project Vimaan',
    label: 'Vimaan',
    icon: Plane,
    weight: 3,
    x: 330,
    y: 180,
    blurb: 'Voice copilot for X-Plane: a joint intent-and-slot model behind a confidence floor, validators and safety interlocks.',
    skills: ['PyTorch', 'DistilBERT', 'ONNX Runtime', 'Safety interlocks'],
  },
  {
    title: 'Brain Tumor Segmentation (BraTS 2021 - Vision Transformer)',
    label: 'BraTS segmentation',
    icon: Brain,
    weight: 2,
    x: 840,
    y: 300,
    blurb: 'Vision Transformers for 3D brain-tumour segmentation; the team placed 4th of 200+ in the BraTS 2021 challenge.',
    skills: ['Vision Transformers', '3D medical imaging', 'PyTorch'],
  },
  {
    title: 'Orbit Expense Tracker',
    label: 'Orbit',
    icon: Wallet,
    weight: 2,
    x: 540,
    y: 380,
    blurb: 'Expense tracker for international students: integer-cent money, an offline queue with idempotent replay, Gemini-assisted import.',
    skills: ['React', 'Prisma', 'Idempotent writes', 'IndexedDB'],
  },
  {
    title: 'Manzil Recipe Vault',
    label: 'Manzil',
    icon: ChefHat,
    weight: 1,
    x: 300,
    y: 470,
    blurb: 'Recipe-sharing app with a hardened API: strict schemas on every route, server-side sanitisation, SSRF-safe import.',
    skills: ['Express', 'Zod', 'MongoDB', 'SSRF-safe fetching'],
  },
  {
    title: 'Numerical Investigation of Vortex Influence on NACA 4412 Airfoil',
    label: 'NACA 4412 study',
    icon: Wind,
    weight: 1,
    x: 130,
    y: 350,
    blurb: 'CFD study of how a leading airfoil’s wake changes the lift and drag of a NACA 4412 behind it.',
    skills: ['ANSYS Fluent', 'PyFluent', 'Transient CFD'],
  },
];

export const EDGES: readonly Edge[] = [
  {
    a: 'Project Vimaan',
    b: 'Numerical Investigation of Vortex Influence on NACA 4412 Airfoil',
    shared: 'Flight, from two sides: a voice copilot for a flight simulator, and the airflow over a wing.',
  },
  {
    a: 'Project Vimaan',
    b: 'PeakRoutine - AI Health & Wellness Platform',
    shared: 'Language models behind guardrails: a confidence floor and validators in one, grounded personas and verified ingestion in the other.',
  },
  {
    a: 'PeakRoutine - AI Health & Wellness Platform',
    b: 'Brain Tumor Segmentation (BraTS 2021 - Vision Transformer)',
    shared: 'Health data at two scales: MRI volumes, and wearable biometrics scored against a personal baseline.',
  },
  {
    a: 'PeakRoutine - AI Health & Wellness Platform',
    b: 'Orbit Expense Tracker',
    shared: 'Idempotent ingestion: webhooks deduplicated and upserted once; offline writes replayed with a request id.',
  },
  {
    a: 'Orbit Expense Tracker',
    b: 'Manzil Recipe Vault',
    shared: 'Hardened web APIs: strict schemas on every route, rate limits, and single atomic writes for counters.',
  },
];

/** Order for the phone's vertical path: neighbours along the path share an edge where one exists. */
export const PATH_ORDER: readonly string[] = [
  'Numerical Investigation of Vortex Influence on NACA 4412 Airfoil',
  'Project Vimaan',
  'PeakRoutine - AI Health & Wellness Platform',
  'Brain Tumor Segmentation (BraTS 2021 - Vision Transformer)',
  'Orbit Expense Tracker',
  'Manzil Recipe Vault',
];

export const CATEGORY_COLOUR: Record<ProjectCategory, string> = {
  'AI/ML': 'var(--arc-ai)',
  Aerospace: 'var(--arc-aerospace)',
  'Full-Stack Web': 'var(--arc-software)',
};

export function projectOf(star: Star): Project | undefined {
  return PROJECTS.find((p) => p.title === star.title);
}

export function edgeBetween(a: string, b: string): Edge | undefined {
  return EDGES.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
}

export function neighboursOf(title: string): string[] {
  return EDGES.filter((e) => e.a === title || e.b === title).map((e) => (e.a === title ? e.b : e.a));
}

export const hrefOf = (star: Star) => projectPath(star.title);
