import { desc, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { activities, type ActivityRow } from '../../db/schema.js';

export class ActivitiesRepository {
  constructor(private readonly db: Database) {}

  async listByApplication(applicationId: string): Promise<ActivityRow[]> {
    return this.db
      .select()
      .from(activities)
      .where(eq(activities.applicationId, applicationId))
      .orderBy(desc(activities.createdAt));
  }

  async create(
    applicationId: string,
    type: ActivityRow['type'],
    description: string,
  ): Promise<ActivityRow> {
    const rows = await this.db
      .insert(activities)
      .values({ applicationId, type, description })
      .returning();
    return rows[0]!;
  }
}
