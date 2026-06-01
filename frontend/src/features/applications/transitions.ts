import type { ApplicationStatus } from '@/lib/types';

// Mirrors the backend pipeline so the board can pre-validate a drop target.
const PIPELINE: ApplicationStatus[] = [
  'discovered',
  'applied',
  'recruiter_call',
  'technical_interview',
  'final_interview',
  'offer',
  'accepted',
];

const TERMINAL = new Set<ApplicationStatus>(['accepted', 'rejected', 'withdrawn']);
const EARLY_EXITS: ApplicationStatus[] = ['rejected', 'withdrawn'];

export function allowedTransitions(from: ApplicationStatus): ApplicationStatus[] {
  if (TERMINAL.has(from)) return [];
  const index = PIPELINE.indexOf(from);
  const next = index >= 0 && index < PIPELINE.length - 1 ? [PIPELINE[index + 1]!] : [];
  return [...next, ...EARLY_EXITS];
}

export function isValidTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (from === to) return false;
  return allowedTransitions(from).includes(to);
}
