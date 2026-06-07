import type { ApplicationStatus } from '@/lib/types';

const ALL_STATUSES: ApplicationStatus[] = [
  'discovered',
  'applied',
  'recruiter_call',
  'technical_interview',
  'final_interview',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
];

export function allowedTransitions(from: ApplicationStatus): ApplicationStatus[] {
  return ALL_STATUSES.filter((s) => s !== from);
}

export function isValidTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return from !== to;
}
