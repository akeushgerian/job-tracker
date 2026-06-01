import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { applications, followUps, interviews } from '../../db/schema.js';
import type { ApplicationStatus } from '../applications/applications.schemas.js';

export interface StatusCount {
  status: ApplicationStatus;
  count: number;
}

export interface UpcomingInterview {
  id: string;
  applicationId: string;
  companyName: string;
  positionTitle: string;
  type: string;
  scheduledAt: Date;
}

export interface OverdueFollowUp {
  id: string;
  applicationId: string;
  companyName: string;
  positionTitle: string;
  description: string;
  dueDate: Date;
}

export class DashboardRepository {
  constructor(private readonly db: Database) {}

  async countByStatus(userId: string): Promise<StatusCount[]> {
    const rows = await this.db
      .select({
        status: applications.status,
        count: sql<number>`count(*)::int`,
      })
      .from(applications)
      .where(eq(applications.userId, userId))
      .groupBy(applications.status);
    return rows as StatusCount[];
  }

  /**
   * Average days between `applied_at` and the activity that recorded the move
   * out of the "applied" stage (the first response). Returns null when there
   * is not yet any responded application.
   */
  async averageTimeToResponseDays(userId: string): Promise<number | null> {
    const result = await this.db.execute<{ days: number | null }>(sql`
      SELECT AVG(EXTRACT(EPOCH FROM (resp.first_resp - a.applied_at)) / 86400)::float AS days
      FROM ${applications} a
      JOIN LATERAL (
        SELECT MIN(act.created_at) AS first_resp
        FROM activities act
        WHERE act.application_id = a.id
          AND act.type = 'status_change'
          AND act.description LIKE 'Status changed from applied to %'
      ) resp ON TRUE
      WHERE a.user_id = ${userId}
        AND a.applied_at IS NOT NULL
        AND resp.first_resp IS NOT NULL
    `);
    const row = result[0] as { days: number | null } | undefined;
    return row?.days ?? null;
  }

  async upcomingInterviews(userId: string, limit: number): Promise<UpcomingInterview[]> {
    const rows = await this.db
      .select({
        id: interviews.id,
        applicationId: interviews.applicationId,
        companyName: applications.companyName,
        positionTitle: applications.positionTitle,
        type: interviews.type,
        scheduledAt: interviews.scheduledAt,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .where(
        and(
          eq(applications.userId, userId),
          eq(interviews.completed, false),
          gte(interviews.scheduledAt, sql`now()`),
        ),
      )
      .orderBy(asc(interviews.scheduledAt))
      .limit(limit);
    return rows.map((r) => ({ ...r, scheduledAt: r.scheduledAt as Date }));
  }

  async overdueFollowUps(userId: string): Promise<OverdueFollowUp[]> {
    const rows = await this.db
      .select({
        id: followUps.id,
        applicationId: followUps.applicationId,
        companyName: applications.companyName,
        positionTitle: applications.positionTitle,
        description: followUps.description,
        dueDate: followUps.dueDate,
      })
      .from(followUps)
      .innerJoin(applications, eq(followUps.applicationId, applications.id))
      .where(
        and(
          eq(applications.userId, userId),
          eq(followUps.completed, false),
          lt(followUps.dueDate, sql`now()`),
        ),
      )
      .orderBy(asc(followUps.dueDate));
    return rows;
  }
}
