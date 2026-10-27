import { PGlite } from '@electric-sql/pglite';
import { EMPTY_SCREENING, type Profile } from '@ascend/core';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import type { PlayApi, PlaySubscriptionPurchase } from '../src/billing/play';
import { loadConfig } from '../src/config';
import type { Db } from '../src/db/client';
import * as schema from '../src/db/schema';

const config = loadConfig({
  NODE_ENV: 'test',
  DATABASE_URL: 'pglite://memory',
  JWT_SECRET: 'test-secret-test-secret-test-secret-123',
  BILLING_MODE: 'play',
  RTDN_SHARED_SECRET: 'rtdn-secret-rtdn-secret-rtdn-secret',
});

const purchases = new Map<string, PlaySubscriptionPurchase>();
const acknowledged: string[] = [];
const play: PlayApi = {
  async getSubscription(token) {
    const p = purchases.get(token);
    if (!p) throw new Error('not found');
    return p;
  },
  async acknowledge(_productId, token) {
    acknowledged.push(token);
  },
};

const mails: { to: string; text: string }[] = [];
const mailer = { send: async (to: string, _subject: string, text: string) => void mails.push({ to, text }) };

let pg: PGlite;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  pg = new PGlite();
  const db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  app = createApp({ db: db as unknown as Db, config, play, mailer });
});
afterAll(() => pg.close());
afterEach(() => vi.useRealTimers());

// 2026-03-02 is a Monday. Days are pinned to noon UTC so the "UTC" timezone gives a stable local date.
const at = (date: string) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${date}T12:00:00Z`));
};

const profile: Profile = {
  callsign: 'Kai',
  sex: 'male',
  age: 28,
  heightCm: 175,
  weightKg: 78,
  goal: 'lose_weight',
  pace: 'standard',
  targetWeightKg: 72,
  lifestyle: 'sedentary',
  experience: 'beginner',
  equipment: ['none'],
  workoutDays: [1, 3, 5],
  sessionMinutes: 45,
  diet: 'vegetarian',
  health: { ...EMPTY_SCREENING },
};

async function newUser(email: string) {
  const res = await request(app).post('/v1/auth/register').send({ email, password: 'correct-horse' });
  expect(res.status).toBe(201);
  return { token: res.body.accessToken as string, refresh: res.body.refreshToken as string };
}

describe('auth', () => {
  it('registers, logs in, rotates refresh tokens and rejects duplicates', async () => {
    const { refresh } = await newUser('Auth@Example.com');
    expect((await request(app).post('/v1/auth/register').send({ email: 'auth@example.com', password: 'whatever1' })).status).toBe(409);
    expect((await request(app).post('/v1/auth/login').send({ email: 'auth@example.com', password: 'wrong-pass' })).status).toBe(401);
    expect((await request(app).post('/v1/auth/login').send({ email: 'nobody@example.com', password: 'wrong-pass' })).status).toBe(401);
    expect((await request(app).post('/v1/auth/login').send({ email: 'auth@example.com', password: 'correct-horse' })).status).toBe(200);

    const r1 = await request(app).post('/v1/auth/refresh').send({ refreshToken: refresh });
    expect(r1.status).toBe(200);
    // old refresh token is single-use
    expect((await request(app).post('/v1/auth/refresh').send({ refreshToken: refresh })).status).toBe(401);
    expect((await request(app).get('/v1/me')).status).toBe(401);
  });
});

describe('password reset', () => {
  it('emails a code, rejects wrong codes, resets the password and revokes old sessions', async () => {
    const { refresh } = await newUser('reset@example.com');
    expect((await request(app).post('/v1/auth/password/forgot').send({ email: 'nobody@example.com' })).status).toBe(204);
    expect(mails).toHaveLength(0);

    expect((await request(app).post('/v1/auth/password/forgot').send({ email: 'Reset@Example.com' })).status).toBe(204);
    const code = /code is (\d{6})/.exec(mails[0]!.text)![1]!;
    const wrong = code === '000000' ? '111111' : '000000';
    expect((await request(app).post('/v1/auth/password/reset').send({ email: 'reset@example.com', code: wrong, password: 'new-password-1' })).status).toBe(400);
    const ok = await request(app).post('/v1/auth/password/reset').send({ email: 'reset@example.com', code, password: 'new-password-1' });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();
    // single use
    expect((await request(app).post('/v1/auth/password/reset').send({ email: 'reset@example.com', code, password: 'another-pass-2' })).status).toBe(400);
    expect((await request(app).post('/v1/auth/refresh').send({ refreshToken: refresh })).status).toBe(401);
    expect((await request(app).post('/v1/auth/login').send({ email: 'reset@example.com', password: 'correct-horse' })).status).toBe(401);
    expect((await request(app).post('/v1/auth/login').send({ email: 'reset@example.com', password: 'new-password-1' })).status).toBe(200);
  });

  it('locks the code after 5 wrong attempts', async () => {
    await newUser('brute@example.com');
    await request(app).post('/v1/auth/password/forgot').send({ email: 'brute@example.com' });
    const code = /code is (\d{6})/.exec(mails[mails.length - 1]!.text)![1]!;
    for (let i = 0; i < 5; i++) {
      const guess = String((Number(code) + 1 + i) % 1_000_000).padStart(6, '0');
      await request(app).post('/v1/auth/password/reset').send({ email: 'brute@example.com', code: guess, password: 'new-password-1' });
    }
    expect((await request(app).post('/v1/auth/password/reset').send({ email: 'brute@example.com', code, password: 'new-password-1' })).status).toBe(400);
  });
});

describe('protocol flow', () => {
  it('onboards, logs Directives, gates on day 10, unlocks via Play, calibrates and deletes', async () => {
    at('2026-03-02');
    const { token } = await newUser('flow@example.com');
    let auth = { Authorization: `Bearer ${token}` };
    // Access tokens live 15 minutes, so log in again after each jump in time.
    const jump = async (date: string) => {
      at(date);
      const res = await request(app).post('/v1/auth/login').send({ email: 'flow@example.com', password: 'correct-horse' });
      auth = { Authorization: `Bearer ${res.body.accessToken}` };
    };

    const before = await request(app).get('/v1/me').set(auth);
    expect(before.body).toMatchObject({ onboarded: false, email: 'flow@example.com' });

    const bad = await request(app).put('/v1/profile').set(auth).send({ profile: { ...profile, age: 10 }, timezone: 'UTC' });
    expect(bad.status).toBe(400);

    const onboard = await request(app).put('/v1/profile').set(auth).send({ profile, timezone: 'UTC' });
    expect(onboard.status).toBe(200);
    expect(onboard.body.startDate).toBe('2026-03-02');
    expect(onboard.body.access).toMatchObject({ phase: 'free', day: 1, freeDaysLeft: 9 });
    expect(onboard.body.plan.days[1].type).toBe('full_a');
    expect(onboard.body.nutrition.calories).toBeLessThan(onboard.body.nutrition.maintenance);

    // Monday: complete the full Directive
    const day = await request(app).get('/v1/day/2026-03-02').set(auth);
    const session = day.body.session;
    const done = await request(app)
      .put('/v1/workouts/2026-03-02')
      .set(auth)
      .send({ setsDone: session.exercises.map((e: { sets: number }) => e.sets), finisherDone: true });
    expect(done.status).toBe(200);
    expect(done.body.reward.xp).toBe(150);
    expect(done.body.levelUp).toBe(2);
    expect(done.body.state.player.streak).toBe(1);

    // Re-logging the same day replaces, not duplicates, XP
    const again = await request(app).put('/v1/workouts/2026-03-02').set(auth).send({ setsDone: [1], finisherDone: false });
    expect(again.body.state.player.xp).toBe(again.body.reward.xp);

    // Tuesday is a rest day; future dates are rejected
    expect((await request(app).put('/v1/workouts/2026-03-03').set(auth).send({ setsDone: [] })).status).toBe(400);
    expect((await request(app).put('/v1/workouts/2026-03-04').set(auth).send({ setsDone: [] })).status).toBe(400);

    const habits = await request(app)
      .put('/v1/habits/2026-03-02')
      .set(auth)
      .send({ proteinHit: true, caloriesOnTarget: true, waterHit: true, stepsHit: false });
    expect(habits.body.reward.xp).toBe(60);

    // Day 9: still free, warning shown. Day 10: locked.
    await jump('2026-03-10');
    expect((await request(app).get('/v1/me').set(auth)).body.access).toMatchObject({ phase: 'free', day: 9, warnPaywall: true });
    await jump('2026-03-11');
    const locked = await request(app).get('/v1/me').set(auth);
    expect(locked.body.access).toMatchObject({ phase: 'locked', day: 10, hasAccess: false, billingStartsIfSubscribedToday: '2026-03-17' });
    expect((await request(app).put('/v1/workouts/2026-03-11').set(auth).send({ setsDone: [1] })).status).toBe(402);

    // Subscribe through Google Play: 6-day free trial
    purchases.set('tok-flow-1', {
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
      lineItems: [
        {
          productId: config.PLAY_SUBSCRIPTION_ID,
          expiryTime: '2026-03-17T12:00:00Z',
          autoRenewingPlan: { autoRenewEnabled: true },
          offerDetails: { basePlanId: 'monthly', offerId: config.PLAY_TRIAL_OFFER_ID },
          offerPhase: { freeTrial: {} },
        },
      ],
    });
    const verify = await request(app).post('/v1/billing/google/verify').set(auth).send({ purchaseToken: 'tok-flow-1' });
    expect(verify.status).toBe(200);
    expect(verify.body.access).toMatchObject({ phase: 'trial', hasAccess: true });
    expect(acknowledged).toContain('tok-flow-1');
    expect((await request(app).put('/v1/workouts/2026-03-11').set(auth).send({ setsDone: [1] })).status).toBe(200);

    // Another account cannot reuse the same purchase
    const other = await newUser('other@example.com');
    await request(app).put('/v1/profile').set({ Authorization: `Bearer ${other.token}` }).send({ profile, timezone: 'UTC' });
    const steal = await request(app).post('/v1/billing/google/verify').set({ Authorization: `Bearer ${other.token}` }).send({ purchaseToken: 'tok-flow-1' });
    expect(steal.status).toBe(409);

    // RTDN: payment failed and the subscription expired
    purchases.set('tok-flow-1', { subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED', lineItems: [{ productId: config.PLAY_SUBSCRIPTION_ID, expiryTime: '2026-03-17T12:00:00Z' }] });
    const data = Buffer.from(JSON.stringify({ packageName: config.PLAY_PACKAGE_NAME, subscriptionNotification: { purchaseToken: 'tok-flow-1', notificationType: 13 } })).toString('base64');
    expect((await request(app).post('/v1/billing/google/rtdn').send({ message: { data } })).status).toBe(401);
    expect((await request(app).post(`/v1/billing/google/rtdn?token=${config.RTDN_SHARED_SECRET}`).send({ message: { data } })).status).toBe(204);
    await jump('2026-03-18');
    expect((await request(app).get('/v1/me').set(auth)).body.access.phase).toBe('locked');

    // Renewed → active
    purchases.set('tok-flow-1', { subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED', lineItems: [{ productId: config.PLAY_SUBSCRIPTION_ID, expiryTime: '2026-04-17T12:00:00Z', autoRenewingPlan: { autoRenewEnabled: true }, offerPhase: { basePrice: {} } }] });
    await request(app).post(`/v1/billing/google/rtdn?token=${config.RTDN_SHARED_SECRET}`).send({ message: { data } });

    // Day 22: calibration due
    await jump('2026-03-23');
    const me = await request(app).get('/v1/me').set(auth);
    expect(me.body.access.phase).toBe('subscribed');
    expect(me.body.checkIn).toMatchObject({ due: true, nextDate: '2026-03-23' });

    const ci = await request(app).post('/v1/checkins').set(auth).send({ weightKg: 76.4, adherence: 'mostly' });
    expect(ci.status).toBe(201);
    expect(ci.body.previous).toEqual({ date: '2026-03-02', weightKg: 78 });
    expect(ci.body.result.status).toBe('on_track');
    expect(ci.body.state.profile.weightKg).toBe(76.4);
    expect(ci.body.state.checkIn).toMatchObject({ due: false, nextDate: '2026-04-13', count: 1 });

    const adjust = await request(app).post('/v1/checkins/adjust').set(auth).send({ direction: 'faster' });
    expect(adjust.status).toBe(200);
    expect(adjust.body.profile.pace).toBe('fast');

    // Too soon for another calibration
    await jump('2026-03-24');
    expect((await request(app).post('/v1/checkins').set(auth).send({ weightKg: 76, adherence: 'mostly' })).status).toBe(400);

    const hist = await request(app).get('/v1/history?from=2026-03-01&to=2026-03-31').set(auth);
    expect(hist.body.workouts.map((w: { date: string }) => w.date)).toEqual(['2026-03-02', '2026-03-11']);
    expect(hist.body.weighIns).toHaveLength(1);

    // Account deletion
    expect((await request(app).delete('/v1/me').set(auth)).status).toBe(204);
    expect((await request(app).get('/v1/me').set(auth)).status).toBe(401);
  });
});
