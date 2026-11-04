/**
 * Zero-setup development server: runs the API on an embedded Postgres (PGlite) stored in server/.pglite.
 * No Docker or Postgres install needed. Billing runs in mock mode. Not for production.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { loadConfig } from './config';
import type { Db } from './db/client';
import * as schema from './db/schema';

const dataDir = process.env.PGLITE_DIR ?? fileURLToPath(new URL('../.pglite', import.meta.url));
const pg = new PGlite(dataDir === 'memory' ? undefined : dataDir);
const db = drizzle(pg, { schema });
await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });

const config = loadConfig({
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_URL: 'pglite',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-only-secret-dev-only-secret-dev-only',
  BILLING_MODE: 'mock',
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? '*',
});

const play = {
  getSubscription: () => Promise.reject(new Error('Google Play is not available in dev-lite mode')),
  acknowledge: () => Promise.resolve(),
};

createApp({ db: db as unknown as Db, config, play }).listen(config.PORT, () => {
  console.log(`Ascend Protocol dev API (PGlite, mock billing) on http://localhost:${config.PORT}`);
});
