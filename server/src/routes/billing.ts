import { addDays, TRIAL_DAYS_AFTER_SUBSCRIBE } from '@ascend/core';
import { eq } from 'drizzle-orm';
import { Router, type Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../auth';
import { mapPlaySubscription, type PlayApi } from '../billing/play';
import type { Config } from '../config';
import type { Db } from '../db/client';
import { subscriptions } from '../db/schema';
import { handler, HttpError } from '../http';
import { requireState, serializeState } from '../services/state';

export interface BillingDeps {
  db: Db;
  config: Config;
  play: PlayApi;
  /** Verifies a Pub/Sub push OIDC token; injectable for tests. */
  verifyPushToken?: (token: string) => Promise<{ email?: string } | null>;
}

/** Fetch the purchase from Google and store it. Returns the stored row. */
async function syncPurchase(deps: BillingDeps, purchaseToken: string, userId?: string) {
  const { db, config, play } = deps;
  const raw = await play.getSubscription(purchaseToken);
  const m = mapPlaySubscription(raw, config.PLAY_TRIAL_OFFER_ID);
  if (m.productId && m.productId !== config.PLAY_SUBSCRIPTION_ID) throw new HttpError(400, 'unknown_product');

  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.purchaseToken, purchaseToken));
  if (existing && userId && existing.userId !== userId) {
    // One Play purchase cannot unlock several accounts.
    throw new HttpError(409, 'purchase_owned_by_other_account', 'This purchase is linked to a different account');
  }
  const ownerId = existing?.userId ?? userId;
  if (!ownerId) return null; // RTDN for a purchase we have never seen; the app will verify it on next launch

  const values = {
    productId: m.productId || config.PLAY_SUBSCRIPTION_ID,
    state: m.state,
    expiresAt: m.expiresAt,
    autoRenewing: m.autoRenewing,
    raw,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(subscriptions)
    .values({ userId: ownerId, purchaseToken, ...values })
    .onConflictDoUpdate({ target: subscriptions.purchaseToken, set: values })
    .returning();

  // A resubscribe/upgrade creates a new token that points at the old one; the old one no longer counts.
  if (m.linkedPurchaseToken) {
    await db.update(subscriptions).set({ supersededBy: purchaseToken }).where(eq(subscriptions.purchaseToken, m.linkedPurchaseToken));
  }
  // Unacknowledged purchases are refunded by Google after 3 days.
  if (m.needsAcknowledgement && (m.state === 'active' || m.state === 'trial')) {
    await play.acknowledge(values.productId, purchaseToken);
  }
  return row;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function billingRoutes(deps: BillingDeps): Router {
  const { db, config } = deps;
  const r = Router();
  const auth = requireAuth(config.JWT_SECRET);

  /** Called by the app right after a successful Google Play purchase, and on launch to restore purchases. */
  r.post(
    '/billing/google/verify',
    auth,
    handler<AuthedRequest>(async (req, res) => {
      const { purchaseToken } = z.object({ purchaseToken: z.string().min(10).max(4096), productId: z.string().optional() }).parse(req.body);
      await syncPurchase(deps, purchaseToken, req.userId);
      res.json(serializeState(await requireState(db, req.userId)));
    }),
  );

  /** Development-only: simulate subscribing (6-day trial) so the paywall flow can be tested without Play. */
  if (config.BILLING_MODE === 'mock') {
    r.post(
      '/billing/mock/subscribe',
      auth,
      handler<AuthedRequest>(async (req, res) => {
        const state = await requireState(db, req.userId);
        const expiresAt = new Date(`${addDays(state.today, TRIAL_DAYS_AFTER_SUBSCRIBE)}T23:59:59Z`);
        const purchaseToken = `mock_${req.userId}`;
        const values = { productId: config.PLAY_SUBSCRIPTION_ID, state: 'trial', expiresAt, autoRenewing: true, updatedAt: new Date() };
        await db
          .insert(subscriptions)
          .values({ userId: req.userId, purchaseToken, platform: 'mock', ...values })
          .onConflictDoUpdate({ target: subscriptions.purchaseToken, set: values });
        res.json(serializeState(await requireState(db, req.userId)));
      }),
    );
  }

  /**
   * Real-time developer notifications: Google Play → Pub/Sub push → here.
   * Authenticated with the push subscription's OIDC token, or a shared secret in the URL.
   */
  const oidc = new OAuth2Client();
  const verifyPushToken =
    deps.verifyPushToken ??
    (async (token: string) => {
      if (!config.PUBSUB_AUDIENCE) return null;
      const ticket = await oidc.verifyIdToken({ idToken: token, audience: config.PUBSUB_AUDIENCE });
      return ticket.getPayload() ?? null;
    });

  async function isAuthorizedPush(req: Request): Promise<boolean> {
    const secret = typeof req.query.token === 'string' ? req.query.token : undefined;
    if (config.RTDN_SHARED_SECRET && secret && safeEqual(secret, config.RTDN_SHARED_SECRET)) return true;
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return false;
    try {
      const payload = await verifyPushToken(header.slice(7));
      if (!payload) return false;
      return !config.PUBSUB_SERVICE_ACCOUNT_EMAIL || payload.email === config.PUBSUB_SERVICE_ACCOUNT_EMAIL;
    } catch {
      return false;
    }
  }

  r.post(
    '/billing/google/rtdn',
    handler(async (req, res) => {
      if (!(await isAuthorizedPush(req))) throw new HttpError(401, 'unauthorized');
      const body = z.object({ message: z.object({ data: z.string() }) }).parse(req.body);
      const notification = JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf8')) as {
        packageName?: string;
        subscriptionNotification?: { purchaseToken?: string; subscriptionId?: string };
        testNotification?: unknown;
      };
      const token = notification.subscriptionNotification?.purchaseToken;
      if (notification.packageName === config.PLAY_PACKAGE_NAME && token) {
        await syncPurchase(deps, token);
      }
      // Always 204 for well-formed messages so Pub/Sub doesn't retry forever.
      res.status(204).end();
    }),
  );

  return r;
}
