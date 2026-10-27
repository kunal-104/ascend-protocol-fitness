import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';
import * as schema from './schema';

export type Schema = typeof schema;
/** Works with both node-postgres (production) and PGlite (tests). */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

export function createDb(url: string): { db: Db; close: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  const db = drizzle(pool, { schema }) as unknown as Db;
  return { db, close: () => pool.end() };
}

export { schema };
