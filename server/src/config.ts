import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  /** 'mock' lets you test the paywall without Google Play. Refused in production. */
  BILLING_MODE: z.enum(['play', 'mock']).default('play'),
  PLAY_PACKAGE_NAME: z.string().default('com.ascendprotocol.app'),
  PLAY_SUBSCRIPTION_ID: z.string().default('ascend_monthly'),
  /** Offer ID of the 6-day free trial on the monthly base plan. */
  PLAY_TRIAL_OFFER_ID: z.string().default('free-trial-6d'),
  /** Path to the Google Cloud service-account JSON with access to the Play Developer API. */
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  /** Pub/Sub push subscription auth: expected OIDC audience and service account email. */
  PUBSUB_AUDIENCE: z.string().optional(),
  PUBSUB_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  /** Alternative to OIDC: a long random secret appended to the push URL as ?token=… */
  RTDN_SHARED_SECRET: z.string().min(24).optional(),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cfg = schema.parse(env);
  if (cfg.NODE_ENV === 'production' && cfg.BILLING_MODE === 'mock') {
    throw new Error('BILLING_MODE=mock is not allowed in production');
  }
  return cfg;
}
