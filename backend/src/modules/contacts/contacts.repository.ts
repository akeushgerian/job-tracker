import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import {
  activities,
  applications,
  contacts,
  type ActivityRow,
  type ContactRow,
} from '../../db/schema.js';

export interface CreateContactData {
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export type UpdateContactData = Partial<CreateContactData>;

export class ContactsRepository {
  constructor(private readonly db: Database) {}

  async listByApplication(applicationId: string): Promise<ContactRow[]> {
    return this.db
      .select()
      .from(contacts)
      .where(eq(contacts.applicationId, applicationId))
      .orderBy(asc(contacts.createdAt));
  }

  async findById(userId: string, id: string): Promise<ContactRow | undefined> {
    const rows = await this.db
      .select({ contact: contacts })
      .from(contacts)
      .innerJoin(applications, eq(contacts.applicationId, applications.id))
      .where(and(eq(contacts.id, id), eq(applications.userId, userId)))
      .limit(1);
    return rows[0]?.contact;
  }

  async create(
    applicationId: string,
    data: CreateContactData,
    activity: { type: ActivityRow['type']; description: string },
  ): Promise<ContactRow> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(contacts)
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

  async update(id: string, data: UpdateContactData): Promise<ContactRow | undefined> {
    const rows = await this.db
      .update(contacts)
      .set(data)
      .where(eq(contacts.id, id))
      .returning();
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(contacts).where(eq(contacts.id, id));
  }
}
