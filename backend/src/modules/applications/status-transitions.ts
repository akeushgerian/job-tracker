import type { ApplicationStatus } from './applications.schemas.js';

// The linear pipeline. Forward progress may only advance one step at a time —
// stages cannot be skipped.
const PIPELINE: ApplicationStatus[] = [
  'discovered',
  'applied',
  'recruiter_call',
  'technical_interview',
  'final_interview',
  'offer',
  'accepted',
];

// Terminal states have no outgoing transitions.
const TERMINAL: ReadonlySet<ApplicationStatus> = new Set([
  'accepted',
  'rejected',
  'withdrawn',
]);

// From any non-terminal stage an application may be rejected or withdrawn.
const EARLY_EXITS: ApplicationStatus[] = ['rejected', 'withdrawn'];

export function allowedTransitions(from: ApplicationStatus): ApplicationStatus[] {
  if (TERMINAL.has(from)) return [];

  const next: ApplicationStatus[] = [];
  const index = PIPELINE.indexOf(from);
  if (index >= 0 && index < PIPELINE.length - 1) {
    next.push(PIPELINE[index + 1]!);
  }
  return [...next, ...EARLY_EXITS];
}

export function isValidTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (from === to) return false;
  return allowedTransitions(from).includes(to);
}
