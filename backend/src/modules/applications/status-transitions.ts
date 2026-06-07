import { applicationStatusValues, type ApplicationStatus } from './applications.schemas.js';

export function allowedTransitions(from: ApplicationStatus): ApplicationStatus[] {
  return applicationStatusValues.filter((s) => s !== from);
}

export function isValidTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return from !== to;
}
