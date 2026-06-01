import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import {
  activities,
  applications,
  interviews,
  type ActivityRow,
  type InterviewRow,
} from '../../db/schema.js';
import type { InterviewOutcome } from './interviews.schemas.js';

export interface CreateInterviewData {
  type: InterviewRow['type'];
  scheduledAt?: Date | null;
  durationMinutes?: number | null;
  notes?: string | null;
  interviewerName?: string | null;
  interviewerRole?: string | null;
  completed: boolean;
  outcome: InterviewOutcome;
}

export type UpdateInterviewData = Partial<CreateInterviewData>;

export class InterviewsRepository {
  constructor(private readonly db: Database) {}

  async listByApplication(applicationId: string): Promise<InterviewRow[]> {
    return this.db
      .select()
      .from(interviews)
      .where(eq(interviews.applicationId, applicationId))
      .orderBy(asc(interviews.scheduledAt));
  }

  /** Scoped by ownership via a join on the parent application. */
  async findById(userId: string, id: string): Promise<InterviewRow | undefined> {
    const rows = await this.db
      .select({ interview: interviews })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .where(and(eq(interviews.id, id), eq(applications.userId, userId)))
      .limit(1);
    return rows[0]?.interview;
  }

  async create(
    applicationId: string,
    data: CreateInterviewData,
    activity: { type: ActivityRow['type']; description: string },
  ): Promise<InterviewRow> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(interviews)
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

  async update(
    id: string,
    data: UpdateInterviewData,
  ): Promise<InterviewRow | undefined> {
    const rows = await this.db
      .update(interviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(interviews.id, id))
      .returning();
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(interviews).where(eq(interviews.id, id));
  }
}
