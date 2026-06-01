import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { applications } from '../db/schema.js';
import { ApplicationNotFoundError } from './errors.js';

/**
 * Ensures the application exists and belongs to the user. Sub-resources
 * (interviews, contacts, follow-ups, activities) gate access through this so
 * ownership is enforced consistently in one place.
 */
export async function assertApplicationOwned(
  db: Database,
  userId: string,
  applicationId: string,
): Promise<void> {
  const rows = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    throw new ApplicationNotFoundError(applicationId);
  }
}
