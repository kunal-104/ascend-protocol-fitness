import { localDate, profileSchema } from '@ascend/core';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../auth';
import type { Db } from '../db/client';
import { profiles, users } from '../db/schema';
import { handler } from '../http';
import { loadProfile, loadUserState, serializeState } from '../services/state';

const timezone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, 'Unknown time zone');

export function meRoutes(db: Db): Router {
  const r = Router();

  r.get(
    '/me',
    handler<AuthedRequest>(async (req, res) => {
      const state = await loadUserState(db, req.userId);
      if (!state) {
        const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, req.userId));
        res.json({ onboarded: false, email: u?.email });
        return;
      }
      res.json({ onboarded: true, ...serializeState(state) });
    }),
  );

  /** Create (onboarding) or update the profile. The plan and nutrition targets are derived from it. */
  r.put(
    '/profile',
    handler<AuthedRequest>(async (req, res) => {
      const body = z.object({ profile: profileSchema, timezone }).parse(req.body);
      const existing = await loadProfile(db, req.userId);
      if (!existing) {
        await db.insert(profiles).values({
          userId: req.userId,
          data: body.profile,
          timezone: body.timezone,
          startDate: localDate(new Date(), body.timezone),
          startWeightKg: body.profile.weightKg,
        });
      } else {
        const prev = existing.data;
        // A calibrated maintenance value is only valid for the activity level it was measured at.
        const activityChanged = prev.lifestyle !== body.profile.lifestyle || prev.workoutDays.length !== body.profile.workoutDays.length;
        await db
          .update(profiles)
          .set({
            data: body.profile,
            timezone: body.timezone,
            maintenanceOverride: activityChanged ? null : existing.maintenanceOverride,
            updatedAt: new Date(),
          })
          .where(eq(profiles.userId, req.userId));
      }
      const state = await loadUserState(db, req.userId);
      res.json({ onboarded: true, ...serializeState(state!) });
    }),
  );

  /** Permanent account deletion (required by Google Play). All user data cascades. */
  r.delete(
    '/me',
    handler<AuthedRequest>(async (req, res) => {
      await db.delete(users).where(eq(users.id, req.userId));
      res.status(204).end();
    }),
  );

  return r;
}
