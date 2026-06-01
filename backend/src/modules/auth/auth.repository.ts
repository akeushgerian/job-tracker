import { eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { users, type UserRow } from '../../db/schema.js';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
}

export class AuthRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async create(data: CreateUserData): Promise<UserRow> {
    const rows = await this.db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name,
      })
      .returning();
    // insert().returning() always yields the created row.
    return rows[0]!;
  }
}
