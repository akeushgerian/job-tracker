import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import {
  activities,
  applications,
  type ActivityRow,
  type ApplicationRow,
} from '../../db/schema.js';
import type {
  ApplicationStatus,
  ListApplicationsQuery,
} from './applications.schemas.js';

export interface CreateApplicationData {
  companyName: string;
  positionTitle: string;
  jobUrl?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  location?: string | null;
  remoteType?: ApplicationRow['remoteType'];
  status: ApplicationStatus;
  source?: ApplicationRow['source'];
  recruiterName?: string | null;
  recruiterEmail?: string | null;
  notes?: string | null;
  appliedAt?: Date | null;
}

export type UpdateApplicationData = Partial<Omit<CreateApplicationData, 'status'>>;

export interface ListResult {
  rows: ApplicationRow[];
  total: number;
}

const SORT_COLUMNS = {
  createdAt: applications.createdAt,
  updatedAt: applications.updatedAt,
  companyName: applications.companyName,
  appliedAt: applications.appliedAt,
  status: applications.status,
} as const;

export class ApplicationsRepository {
  constructor(private readonly db: Database) {}

  async create(
    userId: string,
    data: CreateApplicationData,
    initialActivity: { type: ActivityRow['type']; description: string },
  ): Promise<ApplicationRow> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(applications)
        .values({ userId, ...data })
        .returning();
      const created = rows[0]!;
      await tx.insert(activities).values({
        applicationId: created.id,
        type: initialActivity.type,
        description: initialActivity.description,
      });
      return created;
    });
  }

  async findById(userId: string, id: string): Promise<ApplicationRow | undefined> {
    const rows = await this.db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)))
      .limit(1);
    return rows[0];
  }

  async list(userId: string, query: ListApplicationsQuery): Promise<ListResult> {
    const conditions: SQL[] = [eq(applications.userId, userId)];
    if (query.status) {
      conditions.push(eq(applications.status, query.status));
    }
    if (query.q) {
      const term = `%${query.q}%`;
      conditions.push(
        or(
          ilike(applications.companyName, term),
          ilike(applications.positionTitle, term),
        )!,
      );
    }

    const where = and(...conditions);
    const orderColumn = SORT_COLUMNS[query.sortBy];
    const orderBy = query.sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    const rows = await this.db
      .select()
      .from(applications)
      .where(where)
      .orderBy(orderBy)
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totalRows = await this.db
      .select({ value: count() })
      .from(applications)
      .where(where);

    return { rows, total: totalRows[0]?.value ?? 0 };
  }

  async update(
    userId: string,
    id: string,
    data: UpdateApplicationData,
  ): Promise<ApplicationRow | undefined> {
    const rows = await this.db
      .update(applications)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(applications.id, id), eq(applications.userId, userId)))
      .returning();
    return rows[0];
  }

  async updateStatus(
    userId: string,
    id: string,
    status: ApplicationStatus,
    activity: { type: ActivityRow['type']; description: string },
  ): Promise<ApplicationRow | undefined> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(applications)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(applications.id, id), eq(applications.userId, userId)))
        .returning();
      const updated = rows[0];
      if (!updated) return undefined;

      await tx.insert(activities).values({
        applicationId: updated.id,
        type: activity.type,
        description: activity.description,
      });
      return updated;
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)))
      .returning({ id: applications.id });
    return rows.length > 0;
  }
}
