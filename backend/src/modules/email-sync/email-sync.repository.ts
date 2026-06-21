import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import {
  emailMatches,
  emailSyncs,
  gmailConnections,
  type EmailMatchRow,
  type EmailSyncRow,
  type GmailConnectionRow,
} from '../../db/schema.js';

export class EmailSyncRepository {
  constructor(private readonly db: Database) {}

  // --- Gmail connections ---

  async findConnection(userId: string): Promise<GmailConnectionRow | undefined> {
    const rows = await this.db
      .select()
      .from(gmailConnections)
      .where(eq(gmailConnections.userId, userId))
      .limit(1);
    return rows[0];
  }

  async findAllActiveConnections(): Promise<GmailConnectionRow[]> {
    return this.db
      .select()
      .from(gmailConnections)
      .where(eq(gmailConnections.status, 'active'));
  }

  async upsertConnection(
    userId: string,
    data: {
      encryptedAccessToken: string;
      encryptedRefreshToken: string;
      tokenExpiryDate: Date | null;
      connectedEmail: string;
    },
  ): Promise<GmailConnectionRow> {
    const rows = await this.db
      .insert(gmailConnections)
      .values({ userId, ...data, status: 'active' })
      .onConflictDoUpdate({
        target: gmailConnections.userId,
        set: {
          ...data,
          status: 'active',
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0]!;
  }

  async markConnectionNeedsReauth(userId: string): Promise<void> {
    await this.db
      .update(gmailConnections)
      .set({ status: 'needs_reauth', updatedAt: new Date() })
      .where(eq(gmailConnections.userId, userId));
  }

  async deleteConnection(userId: string): Promise<void> {
    await this.db
      .delete(gmailConnections)
      .where(eq(gmailConnections.userId, userId));
  }

  // --- Email syncs ---

  async findSync(userId: string): Promise<EmailSyncRow | undefined> {
    const rows = await this.db
      .select()
      .from(emailSyncs)
      .where(eq(emailSyncs.userId, userId))
      .limit(1);
    return rows[0];
  }

  async upsertSync(
    userId: string,
    historyId: string | null,
  ): Promise<void> {
    await this.db
      .insert(emailSyncs)
      .values({ userId, historyId, lastSyncedAt: new Date() })
      .onConflictDoUpdate({
        target: emailSyncs.userId,
        set: { historyId, lastSyncedAt: new Date() },
      });
  }

  async deleteSync(userId: string): Promise<void> {
    await this.db.delete(emailSyncs).where(eq(emailSyncs.userId, userId));
  }

  // --- Email matches ---

  async getMatchStatus(
    userId: string,
    gmailMessageId: string,
  ): Promise<EmailMatchRow['status'] | null> {
    const rows = await this.db
      .select({ status: emailMatches.status })
      .from(emailMatches)
      .where(
        and(
          eq(emailMatches.userId, userId),
          eq(emailMatches.gmailMessageId, gmailMessageId),
        ),
      )
      .limit(1);
    return rows[0]?.status ?? null;
  }

  async deleteIgnoredMatch(userId: string, gmailMessageId: string): Promise<void> {
    await this.db
      .delete(emailMatches)
      .where(
        and(
          eq(emailMatches.userId, userId),
          eq(emailMatches.gmailMessageId, gmailMessageId),
          eq(emailMatches.status, 'ignored'),
        ),
      );
  }

  async createMatch(data: {
    userId: string;
    gmailMessageId: string;
    applicationId: string | null;
    subject: string;
    sender: string;
    snippet: string;
    receivedAt: Date;
    action: EmailMatchRow['action'];
    confidence: number;
    status: EmailMatchRow['status'];
    classificationError: string | null;
  }): Promise<EmailMatchRow> {
    const rows = await this.db.insert(emailMatches).values(data).returning();
    return rows[0]!;
  }

  async findMatchById(id: string, userId: string): Promise<EmailMatchRow | undefined> {
    const rows = await this.db
      .select()
      .from(emailMatches)
      .where(and(eq(emailMatches.id, id), eq(emailMatches.userId, userId)))
      .limit(1);
    return rows[0];
  }

  async listMatches(
    userId: string,
    applicationId?: string,
  ): Promise<EmailMatchRow[]> {
    const conditions = applicationId
      ? and(eq(emailMatches.userId, userId), eq(emailMatches.applicationId, applicationId))
      : eq(emailMatches.userId, userId);
    return this.db
      .select()
      .from(emailMatches)
      .where(conditions)
      .orderBy(desc(emailMatches.receivedAt))
      .limit(100);
  }

  async updateMatchStatus(
    id: string,
    status: EmailMatchRow['status'],
  ): Promise<EmailMatchRow> {
    const rows = await this.db
      .update(emailMatches)
      .set({ status })
      .where(eq(emailMatches.id, id))
      .returning();
    return rows[0]!;
  }
}
