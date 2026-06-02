import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import {
  coverLetterReferences,
  coverLetters,
  type CoverLetterReferenceRow,
  type CoverLetterRow,
} from '../../db/schema.js';

export interface CreateCoverLetterData {
  applicationId: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  jobUrl: string | null;
  jobText: string;
  content: string;
  model: string | null;
}

export class CoverLettersRepository {
  constructor(private readonly db: Database) {}

  async create(userId: string, data: CreateCoverLetterData): Promise<CoverLetterRow> {
    const rows = await this.db
      .insert(coverLetters)
      .values({ userId, ...data })
      .returning();
    return rows[0]!;
  }

  async list(userId: string, applicationId?: string): Promise<CoverLetterRow[]> {
    const conditions = [eq(coverLetters.userId, userId)];
    if (applicationId) {
      conditions.push(eq(coverLetters.applicationId, applicationId));
    }
    return this.db
      .select()
      .from(coverLetters)
      .where(and(...conditions))
      .orderBy(desc(coverLetters.createdAt));
  }

  async findById(userId: string, id: string): Promise<CoverLetterRow | undefined> {
    const rows = await this.db
      .select()
      .from(coverLetters)
      .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
      .limit(1);
    return rows[0];
  }

  async updateContent(
    userId: string,
    id: string,
    content: string,
  ): Promise<CoverLetterRow | undefined> {
    const rows = await this.db
      .update(coverLetters)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
      .returning();
    return rows[0];
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(coverLetters)
      .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
      .returning({ id: coverLetters.id });
    return rows.length > 0;
  }

  // --- References ---

  async createReference(
    userId: string,
    data: { label: string; content: string },
  ): Promise<CoverLetterReferenceRow> {
    const rows = await this.db
      .insert(coverLetterReferences)
      .values({ userId, ...data })
      .returning();
    return rows[0]!;
  }

  async listReferences(userId: string): Promise<CoverLetterReferenceRow[]> {
    return this.db
      .select()
      .from(coverLetterReferences)
      .where(eq(coverLetterReferences.userId, userId))
      .orderBy(desc(coverLetterReferences.createdAt));
  }

  async findReferenceById(
    userId: string,
    id: string,
  ): Promise<CoverLetterReferenceRow | undefined> {
    const rows = await this.db
      .select()
      .from(coverLetterReferences)
      .where(
        and(eq(coverLetterReferences.id, id), eq(coverLetterReferences.userId, userId)),
      )
      .limit(1);
    return rows[0];
  }

  async updateReference(
    userId: string,
    id: string,
    data: Partial<{ label: string; content: string }>,
  ): Promise<CoverLetterReferenceRow | undefined> {
    const rows = await this.db
      .update(coverLetterReferences)
      .set(data)
      .where(
        and(eq(coverLetterReferences.id, id), eq(coverLetterReferences.userId, userId)),
      )
      .returning();
    return rows[0];
  }

  async deleteReference(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(coverLetterReferences)
      .where(
        and(eq(coverLetterReferences.id, id), eq(coverLetterReferences.userId, userId)),
      )
      .returning({ id: coverLetterReferences.id });
    return rows.length > 0;
  }
}
