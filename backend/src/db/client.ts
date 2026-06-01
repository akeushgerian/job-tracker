import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config/index.js';
import * as schema from './schema.js';

// A single shared connection pool for the process. postgres.js manages pooling
// internally; `max` keeps the test/dev footprint small.
const queryClient = postgres(config.DATABASE_URL, { max: 10 });

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;

export async function closeDb(): Promise<void> {
  await queryClient.end();
}
