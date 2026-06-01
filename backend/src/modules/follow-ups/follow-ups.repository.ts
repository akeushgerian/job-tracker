import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import {
  activities,
  applications,
  followUps,
  type ActivityRow,
  type FollowUpRow,
} from '../../db/schema.js';

export interface CreateFollowUpData {
  dueDate: Date;
  description: string;
  completed: boolean;
}

export interface UpdateFollowUpData {
  dueDate?: Date;
  description?: string;
  completed?: boolean;
}

export class FollowUpsRepository {
  constructor(private readonly db: Database) {}

  async listByApplication(applicationId: string): Promise<FollowUpRow[]> {
    return this.db
      .select()
      .from(followUps)
      .where(eq(followUps.applicationId, applicationId))
      .orderBy(asc(followUps.dueDate));
  }

  async findById(userId: string, id: string): Promise<FollowUpRow | undefined> {
    const rows = await this.db
      .select({ followUp: followUps })
      .from(followUps)
      .innerJoin(applications, eq(followUps.applicationId, applications.id))
      .where(and(eq(followUps.id, id), eq(applications.userId, userId)))
      .limit(1);
    return rows[0]?.followUp;
  }

  async create(
    applicationId: string,
    data: CreateFollowUpData,
    activity: { type: ActivityRow['type']; description: string },
  ): Promise<FollowUpRow> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(followUps)
        .values({ applicationId, ...data })
        .returning();
      const created = rows[0]!;
      await tx.insert(activities).values({
        applicationId,
        type: activity.type,
        description: activity.description,
      });
      return created;
    });
  }

  async update(id: string, data: UpdateFollowUpData): Promise<FollowUpRow | undefined> {
    const rows = await this.db
      .update(followUps)
      .set(data)
      .where(eq(followUps.id, id))
      .returning();
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(followUps).where(eq(followUps.id, id));
  }
}
