import express from 'express';
import helmet from 'helmet';
import { requireAuth } from './auth';
import type { PlayApi } from './billing/play';
import type { Config } from './config';
import type { Db } from './db/client';
import { errorHandler, HttpError } from './http';
import { authRoutes } from './routes/auth';
import { billingRoutes, type BillingDeps } from './routes/billing';
import { checkInRoutes } from './routes/checkins';
import { logRoutes } from './routes/logs';
import { meRoutes } from './routes/me';
import { createMailer, type Mailer } from './mailer';

export interface AppDeps {
  db: Db;
  config: Config;
  play: PlayApi;
  verifyPushToken?: BillingDeps['verifyPushToken'];
  mailer?: Mailer;
}

export function createApp(deps: AppDeps) {
  const { db, config } = deps;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  // The mobile app doesn't need CORS; this is only for the optional web preview.
  const origins = config.CORS_ORIGINS?.split(',').map((o) => o.trim());
  if (origins?.length) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && (origins.includes('*') || origins.includes(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader('Vary', 'Origin');
      }
      if (req.method === 'OPTIONS') return void res.status(204).end();
      next();
    });
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  const v1 = express.Router();
  v1.use('/auth', authRoutes(db, config.JWT_SECRET, { rateLimit: config.NODE_ENV !== 'test', mailer: deps.mailer ?? createMailer(config) }));
  v1.use(billingRoutes(deps));
  v1.use(requireAuth(config.JWT_SECRET));
  v1.use(meRoutes(db));
  v1.use(logRoutes(db));
  v1.use(checkInRoutes(db));
  app.use('/v1', v1);

  app.use((_req, _res, next) => next(new HttpError(404, 'not_found')));
  app.use(errorHandler);
  return app;
}
