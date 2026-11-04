import { isDateStr, rewardForHabits, rewardForWorkout, weekdayOf, type DateStr } from '@ascend/core';
import { and, asc, between, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../auth';
import type { Db } from '../db/client';
import { habitLogs, weighIns, workoutLogs } from '../db/schema';
import { handler, HttpError } from '../http';
import { assertLoggableDate, requireAccess, requireState, serializeState } from '../services/state';

const dateParam = z.string().refine(isDateStr, 'Expected YYYY-MM-DD');

const workoutBody = z.object({
  setsDone: z.array(z.number().int().min(0).max(20)).max(12),
  finisherDone: z.boolean().default(false),
});

const habitsBody = z.object({
  proteinHit: z.boolean(),
  caloriesOnTarget: z.boolean(),
  waterHit: z.boolean(),
  stepsHit: z.boolean(),
});

export function logRoutes(db: Db): Router {
  const r = Router();

  const findWorkout = async (userId: string, date: DateStr) =>
    (await db.select().from(workoutLogs).where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.date, date))))[0];

  r.get(
    '/day/:date',
    handler<AuthedRequest>(async (req, res) => {
      const date = dateParam.parse(req.params.date);
      const state = await requireState(db, req.userId);
      const log = await findWorkout(req.userId, date);
      const [habits] = await db.select().from(habitLogs).where(and(eq(habitLogs.userId, req.userId), eq(habitLogs.date, date)));
      res.json({
        date,
        session: log?.session ?? state.plan.days[weekdayOf(date)],
        workout: log ? { setsDone: log.setsDone, finisherDone: log.finisherDone, completion: log.completion, xp: log.xp } : null,
        habits: habits ?? null,
      });
    }),
  );

  r.put(
    '/workouts/:date',
    handler<AuthedRequest>(async (req, res) => {
      const date = dateParam.parse(req.params.date);
      const body = workoutBody.parse(req.body);
      const before = await requireState(db, req.userId);
      requireAccess(before);
      assertLoggableDate(before, date);

      const existing = await findWorkout(req.userId, date);
      const session = existing?.session ?? before.plan.days[weekdayOf(date)]!;
      if (session.type === 'rest') throw new HttpError(400, 'rest_day', 'No Directive is scheduled for this day');
      const reward = rewardForWorkout(session, body);
      const values = {
        session,
        setsDone: body.setsDone,
        finisherDone: body.finisherDone,
        completion: reward.completion,
        xp: reward.xp,
        stats: reward.stats,
        updatedAt: new Date(),
      };
      await db
        .insert(workoutLogs)
        .values({ userId: req.userId, date, ...values })
        .onConflictDoUpdate({ target: [workoutLogs.userId, workoutLogs.date], set: values });

      const after = await requireState(db, req.userId);
      res.json({
        reward,
        levelUp: after.player.level > before.player.level ? after.player.level : null,
        rankUp: after.player.rank.id !== before.player.rank.id ? after.player.rank : null,
        state: serializeState(after),
      });
    }),
  );

  r.put(
    '/habits/:date',
    handler<AuthedRequest>(async (req, res) => {
      const date = dateParam.parse(req.params.date);
      const body = habitsBody.parse(req.body);
      const before = await requireState(db, req.userId);
      requireAccess(before);
      assertLoggableDate(before, date);
      const reward = rewardForHabits(body);
      const values = { ...body, xp: reward.xp, stats: reward.stats };
      await db
        .insert(habitLogs)
        .values({ userId: req.userId, date, ...values })
        .onConflictDoUpdate({ target: [habitLogs.userId, habitLogs.date], set: values });
      const after = await requireState(db, req.userId);
      res.json({
        reward,
        levelUp: after.player.level > before.player.level ? after.player.level : null,
        rankUp: after.player.rank.id !== before.player.rank.id ? after.player.rank : null,
        state: serializeState(after),
      });
    }),
  );

  r.get(
    '/history',
    handler<AuthedRequest>(async (req, res) => {
      const q = z.object({ from: dateParam, to: dateParam }).parse(req.query);
      const [workouts, habits, weights] = await Promise.all([
        db
          .select({ date: workoutLogs.date, completion: workoutLogs.completion, xp: workoutLogs.xp, session: workoutLogs.session })
          .from(workoutLogs)
          .where(and(eq(workoutLogs.userId, req.userId), between(workoutLogs.date, q.from, q.to)))
          .orderBy(asc(workoutLogs.date)),
        db
          .select()
          .from(habitLogs)
          .where(and(eq(habitLogs.userId, req.userId), between(habitLogs.date, q.from, q.to)))
          .orderBy(asc(habitLogs.date)),
        db
          .select({ date: weighIns.date, weightKg: weighIns.weightKg })
          .from(weighIns)
          .where(and(eq(weighIns.userId, req.userId), between(weighIns.date, q.from, q.to)))
          .orderBy(asc(weighIns.date)),
      ]);
      res.json({
        workouts: workouts.map((w) => ({ date: w.date, completion: w.completion, xp: w.xp, title: w.session.title })),
        habits,
        weighIns: weights,
      });
    }),
  );

  return r;
}
