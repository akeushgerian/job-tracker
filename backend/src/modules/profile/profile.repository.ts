import { eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { userProfiles, type UserProfileRow } from '../../db/schema.js';
import type { ProfileLinks } from './profile.schemas.js';

export interface UpsertProfileData {
  headline: string | null;
  targetRole: string | null;
  branch: string | null;
  seniority: string | null;
  location: string | null;
  remotePref: UserProfileRow['remotePref'];
  skills: string[];
  links: ProfileLinks;
  summary: string | null;
}

export class ProfileRepository {
  constructor(private readonly db: Database) {}

  async findByUserId(userId: string): Promise<UserProfileRow | undefined> {
    const rows = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return rows[0];
  }

  async upsert(userId: string, data: UpsertProfileData): Promise<UserProfileRow> {
    const rows = await this.db
      .insert(userProfiles)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return rows[0]!;
  }
}
