import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config/index.js';
import * as schema from './schema.js';

// A single shared connection pool for the process. postgres.js manages pooling
// internally; `max` keeps the test/dev footprint small.
// Neon's pooled endpoints (PgBouncer, "-pooler" host) reject prepared statements.
const pooledEndpoint = new URL(config.DATABASE_URL).hostname.includes('-pooler');
const queryClient = postgres(config.DATABASE_URL, { max: 10, prepare: !pooledEndpoint });

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;

export async function closeDb(): Promise<void> {
  await queryClient.end();
}
