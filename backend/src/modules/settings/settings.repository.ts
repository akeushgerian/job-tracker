import { eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { aiSettings, type AiSettingsRow } from '../../db/schema.js';

export class SettingsRepository {
  constructor(private readonly db: Database) {}

  async getAiSettings(userId: string): Promise<AiSettingsRow | null> {
    const rows = await this.db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertAiSettings(
    userId: string,
    data: { provider: string; claudeApiKey: string | null; claudeModel: string },
  ): Promise<AiSettingsRow> {
    const rows = await this.db
      .insert(aiSettings)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: aiSettings.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return rows[0]!;
  }
}
