import {
  accessStatus,
  addDays,
  computeNutrition,
  computePlayer,
  generatePlan,
  isCheckInDue,
  isEntitled,
  localDate,
  nextCheckInDate,
  type AccessStatus,
  type DateStr,
  type NutritionTargets,
  type PlayerState,
  type SubscriptionSnapshot,
  type SubscriptionState,
  type WeeklyPlan,
} from '@ascend/core';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { habitLogs, profiles, subscriptions, users, weighIns, workoutLogs } from '../db/schema';
import { HttpError } from '../http';

export type ProfileRow = typeof profiles.$inferSelect;

export interface UserState {
  email: string;
  profileRow: ProfileRow;
  today: DateStr;
  nutrition: NutritionTargets;
  plan: WeeklyPlan;
  player: PlayerState;
  access: AccessStatus;
  subscription: SubscriptionSnapshot;
  checkIn: { due: boolean; nextDate: DateStr; lastDate?: DateStr; count: number };
  todayWorkout: { completion: number; xp: number } | null;
  todayHabits: { proteinHit: boolean; caloriesOnTarget: boolean; waterHit: boolean; stepsHit: boolean } | null;
}

export async function loadProfile(db: Db, userId: string): Promise<ProfileRow | undefined> {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return row;
}

export async function loadSubscription(db: Db, userId: string, now: Date): Promise<SubscriptionSnapshot> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), isNull(subscriptions.supersededBy)))
    .orderBy(desc(subscriptions.expiresAt));
  const snaps = rows.map((r) => ({ state: r.state as SubscriptionState, expiresAt: r.expiresAt?.toISOString() }));
  return snaps.find((s) => isEntitled(s, now)) ?? snaps[0] ?? { state: 'none' };
}

export async function loadUserState(db: Db, userId: string, now = new Date()): Promise<UserState | null> {
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (!user) throw new HttpError(401, 'unauthorized');
  const profileRow = await loadProfile(db, userId);
  if (!profileRow) return null;

  const profile = profileRow.data;
  const today = localDate(now, profileRow.timezone);
  const [workouts, habits, checkIns, subscription] = await Promise.all([
    db.select().from(workoutLogs).where(eq(workoutLogs.userId, userId)),
    db.select().from(habitLogs).where(eq(habitLogs.userId, userId)),
    db.select({ date: weighIns.date }).from(weighIns).where(eq(weighIns.userId, userId)).orderBy(desc(weighIns.date)),
    loadSubscription(db, userId, now),
  ]);

  const player = computePlayer({
    startDate: profileRow.startDate,
    today,
    trainingWeekdays: profile.workoutDays,
    workouts: workouts.map((w) => ({ date: w.date, xp: w.xp, completion: w.completion, stats: w.stats })),
    habits: habits.map((h) => ({ xp: h.xp, stats: h.stats })),
    checkIns: checkIns.length,
  });

  const lastDate = checkIns[0]?.date;
  const tw = workouts.find((w) => w.date === today);
  const th = habits.find((h) => h.date === today);
  return {
    email: user.email,
    profileRow,
    today,
    nutrition: computeNutrition(profile, { maintenanceOverride: profileRow.maintenanceOverride ?? undefined }),
    plan: generatePlan(profile),
    player,
    access: accessStatus(profileRow.startDate, today, subscription, now),
    subscription,
    checkIn: {
      due: isCheckInDue(profileRow.startDate, today, lastDate),
      nextDate: nextCheckInDate(profileRow.startDate, lastDate),
      lastDate,
      count: checkIns.length,
    },
    todayWorkout: tw ? { completion: tw.completion, xp: tw.xp } : null,
    todayHabits: th ? { proteinHit: th.proteinHit, caloriesOnTarget: th.caloriesOnTarget, waterHit: th.waterHit, stepsHit: th.stepsHit } : null,
  };
}

export async function requireState(db: Db, userId: string, now = new Date()): Promise<UserState> {
  const state = await loadUserState(db, userId, now);
  if (!state) throw new HttpError(409, 'onboarding_required', 'Complete onboarding first');
  return state;
}

export function requireAccess(state: UserState): void {
  if (!state.access.hasAccess) throw new HttpError(402, 'subscription_required', 'Start your subscription to continue');
}

/** Logs may be written for today or yesterday (local time), never the future or before day 1. */
export function assertLoggableDate(state: UserState, date: DateStr): void {
  if (date < state.profileRow.startDate) {
    throw new HttpError(400, 'date_not_loggable', 'This day is before your Protocol began');
  }
  if (date > state.today || date < addDays(state.today, -1)) {
    throw new HttpError(400, 'date_not_loggable', 'You can only log today or yesterday');
  }
}

/** Public JSON shape of the user's state. */
export function serializeState(s: UserState) {
  return {
    email: s.email,
    today: s.today,
    profile: s.profileRow.data,
    startDate: s.profileRow.startDate,
    startWeightKg: s.profileRow.startWeightKg,
    timezone: s.profileRow.timezone,
    nutrition: s.nutrition,
    plan: s.plan,
    player: s.player,
    access: s.access,
    subscription: s.subscription,
    checkIn: s.checkIn,
    todayWorkout: s.todayWorkout,
    todayHabits: s.todayHabits,
  };
}
