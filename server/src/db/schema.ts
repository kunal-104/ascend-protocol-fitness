import type { Profile, Session, Stats, CheckInResult, Adherence } from '@ascend/core';
import { boolean, date, integer, jsonb, pgTable, primaryKey, real, serial, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResets = pgTable('password_resets', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
});

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  data: jsonb('data').$type<Profile>().notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  /** Day 1 of the Protocol (user's local date when onboarding finished). */
  startDate: date('start_date', { mode: 'string' }).notNull(),
  startWeightKg: real('start_weight_kg').notNull(),
  /** Maintenance calories calibrated from check-ins; overrides the formula when set. */
  maintenanceOverride: integer('maintenance_override'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workoutLogs = pgTable(
  'workout_logs',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    /** Snapshot of the session as planned that day, so later plan changes don't corrupt history. */
    session: jsonb('session').$type<Session>().notNull(),
    setsDone: jsonb('sets_done').$type<number[]>().notNull(),
    finisherDone: boolean('finisher_done').notNull().default(false),
    completion: real('completion').notNull(),
    xp: integer('xp').notNull(),
    stats: jsonb('stats').$type<Partial<Stats>>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('workout_logs_user_date').on(t.userId, t.date)],
);

export const habitLogs = pgTable(
  'habit_logs',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    proteinHit: boolean('protein_hit').notNull().default(false),
    caloriesOnTarget: boolean('calories_on_target').notNull().default(false),
    waterHit: boolean('water_hit').notNull().default(false),
    stepsHit: boolean('steps_hit').notNull().default(false),
    xp: integer('xp').notNull(),
    stats: jsonb('stats').$type<Partial<Stats>>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);

export const weighIns = pgTable(
  'weigh_ins',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    weightKg: real('weight_kg').notNull(),
    adherence: text('adherence').$type<Adherence>().notNull(),
    result: jsonb('result').$type<CheckInResult>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('weigh_ins_user_date').on(t.userId, t.date)],
);

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull().default('google_play'),
  productId: text('product_id').notNull(),
  purchaseToken: text('purchase_token').notNull().unique(),
  /** core SubscriptionState */
  state: text('state').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  autoRenewing: boolean('auto_renewing').notNull().default(false),
  /** Set when this token was replaced by a newer purchase (resubscribe / plan change). */
  supersededBy: text('superseded_by'),
  raw: jsonb('raw'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
