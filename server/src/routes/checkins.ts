import { computeNutrition, diffDays, evaluateCheckIn, isDateStr, shiftPace } from '@ascend/core';
import { and, desc, eq, lt } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../auth';
import type { Db } from '../db/client';
import { profiles, weighIns } from '../db/schema';
import { handler, HttpError } from '../http';
import { assertLoggableDate, requireAccess, requireState, serializeState } from '../services/state';

/** Evaluating a trend needs at least a week of data; shorter windows are mostly water-weight noise. */
const MIN_DAYS_BETWEEN = 7;

export function checkInRoutes(db: Db): Router {
  const r = Router();

  r.get(
    '/weigh-ins',
    handler<AuthedRequest>(async (req, res) => {
      const state = await requireState(db, req.userId);
      const rows = await db.select().from(weighIns).where(eq(weighIns.userId, req.userId)).orderBy(desc(weighIns.date));
      res.json({
        start: { date: state.profileRow.startDate, weightKg: state.profileRow.startWeightKg },
        weighIns: rows.map((w) => ({ date: w.date, weightKg: w.weightKg, adherence: w.adherence, result: w.result })),
      });
    }),
  );

  r.post(
    '/checkins',
    handler<AuthedRequest>(async (req, res) => {
      const body = z
        .object({
          weightKg: z.number().min(30).max(300),
          adherence: z.enum(['mostly', 'partly', 'rarely']),
          date: z.string().refine(isDateStr).optional(),
        })
        .parse(req.body);
      const state = await requireState(db, req.userId);
      requireAccess(state);
      const date = body.date ?? state.today;
      assertLoggableDate(state, date);

      const [prev] = await db
        .select()
        .from(weighIns)
        .where(and(eq(weighIns.userId, req.userId), lt(weighIns.date, date)))
        .orderBy(desc(weighIns.date))
        .limit(1);
      const previous = prev
        ? { date: prev.date, weightKg: prev.weightKg }
        : { date: state.profileRow.startDate, weightKg: state.profileRow.startWeightKg };
      const days = diffDays(previous.date, date);
      if (days < MIN_DAYS_BETWEEN) {
        throw new HttpError(400, 'too_soon', `Calibrations need at least ${MIN_DAYS_BETWEEN} days between weigh-ins`);
      }

      const profile = state.profileRow.data;
      const result = evaluateCheckIn({
        goal: profile.goal,
        pace: profile.pace,
        previousWeightKg: previous.weightKg,
        currentWeightKg: body.weightKg,
        days,
        plannedCalories: state.nutrition.calories,
        formulaMaintenance: computeNutrition(profile).maintenance,
        adherence: body.adherence,
      });

      await db
        .insert(weighIns)
        .values({ userId: req.userId, date, weightKg: body.weightKg, adherence: body.adherence, result })
        .onConflictDoUpdate({ target: [weighIns.userId, weighIns.date], set: { weightKg: body.weightKg, adherence: body.adherence, result } });
      // Targets follow the latest weight.
      await db
        .update(profiles)
        .set({ data: { ...profile, weightKg: body.weightKg }, updatedAt: new Date() })
        .where(eq(profiles.userId, req.userId));

      const after = await requireState(db, req.userId);
      res.status(201).json({ previous, result, state: serializeState(after) });
    }),
  );

  /** After a calibration, the user chooses to speed up, slow down or keep their pace. */
  r.post(
    '/checkins/adjust',
    handler<AuthedRequest>(async (req, res) => {
      const body = z
        .object({ direction: z.enum(['faster', 'slower', 'keep']), applyCalibration: z.boolean().default(true) })
        .parse(req.body);
      const state = await requireState(db, req.userId);
      requireAccess(state);
      const [latest] = await db.select().from(weighIns).where(eq(weighIns.userId, req.userId)).orderBy(desc(weighIns.date)).limit(1);
      if (!latest) throw new HttpError(400, 'no_checkin', 'Complete a calibration first');

      const profile = state.profileRow.data;
      if (body.direction === 'faster' && !latest.result.canGoFaster) {
        throw new HttpError(400, 'pace_limit', 'The Protocol will not go faster than the safe limit for your goal');
      }
      const pace = body.direction === 'keep' ? profile.pace : shiftPace(profile.pace, body.direction);
      const override = body.applyCalibration ? (latest.result.maintenanceEstimate ?? state.profileRow.maintenanceOverride) : state.profileRow.maintenanceOverride;
      await db
        .update(profiles)
        .set({ data: { ...profile, pace }, maintenanceOverride: override ?? null, updatedAt: new Date() })
        .where(eq(profiles.userId, req.userId));
      res.json(serializeState(await requireState(db, req.userId)));
    }),
  );

  return r;
}
