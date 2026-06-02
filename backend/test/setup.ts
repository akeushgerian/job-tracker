import { afterAll, beforeAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db, closeDb } from '../src/db/client.js';

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'db',
  'migrations',
);

// All app tables; truncated before each test to give every test a clean slate.
const TABLES = [
  'cover_letters',
  'cover_letter_references',
  'user_profiles',
  'activities',
  'interviews',
  'follow_ups',
  'contacts',
  'applications',
  'users',
];

beforeAll(async () => {
  const migrationClient = postgres(process.env.DATABASE_URL as string, {
    max: 1,
    onnotice: () => {},
  });
  const migrationDb = drizzle(migrationClient);
  await migrate(migrationDb, { migrationsFolder });
  await migrationClient.end();
});

beforeEach(async () => {
  await db.execute(
    sql.raw(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`),
  );
});

afterAll(async () => {
  await closeDb();
});
