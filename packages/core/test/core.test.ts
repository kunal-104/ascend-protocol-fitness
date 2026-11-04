import { describe, expect, it } from 'vitest';
import {
  accessStatus,
  activityMultiplier,
  bmrMifflin,
  computeNutrition,
  computeStreak,
  EMPTY_SCREENING,
  evaluateCheckIn,
  EXERCISES,
  exerciseById,
  FOODS,
  foodAllowed,
  generatePlan,
  isAvailable,
  isCheckInDue,
  levelFromXp,
  profileSchema,
  proteinPerServing,
  rankForLevel,
  rewardForWorkout,
  shiftPace,
  splitFor,
  totalXpForLevel,
  addDays,
  diffDays,
  type Equipment,
  type Experience,
  type Profile,
  type Weekday,
} from '../src';

const base: Profile = {
  callsign: 'Test',
  sex: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  goal: 'lose_weight',
  pace: 'standard',
  lifestyle: 'sedentary',
  experience: 'beginner',
  equipment: ['none'],
  workoutDays: [1, 3, 5, 6],
  sessionMinutes: 45,
  diet: 'vegetarian',
  health: { ...EMPTY_SCREENING },
};

describe('nutrition', () => {
  it('matches Mifflin-St Jeor reference values', () => {
    expect(bmrMifflin('male', 80, 180, 30)).toBe(1780);
    expect(bmrMifflin('female', 60, 165, 25)).toBeCloseTo(1345.25);
  });

  it('uses the standard activity table', () => {
    expect(activityMultiplier(0, 'sedentary')).toBe(1.2);
    expect(activityMultiplier(3, 'sedentary')).toBe(1.375);
    expect(activityMultiplier(4, 'sedentary')).toBe(1.55);
    expect(activityMultiplier(6, 'sedentary')).toBe(1.725);
    expect(activityMultiplier(6, 'very_active')).toBe(1.9);
  });

  it('builds a moderate deficit for weight loss', () => {
    const n = computeNutrition(base);
    // maintenance 1780 × 1.55 = 2759; 0.75%·80 kg = 0.6 kg/wk → 660 kcal/day
    expect(n.maintenance).toBe(2760);
    expect(n.calories).toBe(2100);
    expect(n.proteinG).toBe(160);
    expect(n.expectedWeeklyChangeKg).toBeCloseTo(-0.6, 1);
    expect(n.proteinG * 4 + n.fatG * 9 + n.carbsG * 4).toBeGreaterThan(n.calories - 15);
    expect(n.proteinG * 4 + n.fatG * 9 + n.carbsG * 4).toBeLessThan(n.calories + 15);
  });

  it('never goes below the calorie floor or above maintenance to reach it', () => {
    const n = computeNutrition({ ...base, sex: 'female', weightKg: 45, heightCm: 150, age: 60, pace: 'fast', workoutDays: [1] });
    expect(n.calories).toBeGreaterThanOrEqual(1200);
    expect(n.calories).toBeLessThanOrEqual(n.maintenance);
    expect(n.warnings.some((w) => w.code === 'calorie_floor' || w.code === 'deficit_capped')).toBe(true);
  });

  it('caps deficits at 25% of maintenance', () => {
    const n = computeNutrition({ ...base, weightKg: 150, pace: 'fast' });
    expect(n.calories).toBeGreaterThanOrEqual(Math.round(n.maintenance * 0.75) - 10);
  });

  it('blocks weight loss for underweight users', () => {
    const n = computeNutrition({ ...base, weightKg: 52, heightCm: 180 });
    expect(n.bmiCategory).toBe('underweight');
    expect(n.calories).toBe(n.maintenance);
    expect(n.warnings[0]!.code).toBe('underweight_loss_blocked');
  });

  it('keeps minors at maintenance', () => {
    const n = computeNutrition({ ...base, age: 16 });
    expect(n.calories).toBe(n.maintenance);
    expect(n.warnings.some((w) => w.code === 'minor')).toBe(true);
  });

  it('adds a small surplus for muscle gain', () => {
    const n = computeNutrition({ ...base, goal: 'gain_muscle', pace: 'standard' });
    expect(n.calories - n.maintenance).toBeGreaterThan(150);
    expect(n.calories - n.maintenance).toBeLessThan(400);
  });

  it('uses a reference weight for protein above BMI 30', () => {
    const n = computeNutrition({ ...base, weightKg: 130 });
    expect(n.proteinG).toBeLessThan(130 * 2);
  });

  it('estimates weeks to target weight', () => {
    const n = computeNutrition({ ...base, targetWeightKg: 74 });
    expect(n.weeksToTarget).toBe(10);
  });
});

describe('foods', () => {
  it('respects diet preference', () => {
    expect(FOODS.filter((f) => foodAllowed(f, 'vegan')).every((f) => f.diet === 'vegan')).toBe(true);
    expect(FOODS.filter((f) => foodAllowed(f, 'vegetarian')).some((f) => f.diet === 'egg')).toBe(false);
  });
  it('has internally consistent calories (Atwater 4/4/9, ±15%)', () => {
    for (const f of FOODS) {
      const { kcal, proteinG, fatG, carbsG, fiberG = 0 } = f.per100g;
      const est = proteinG * 4 + fatG * 9 + (carbsG - fiberG) * 4 + fiberG * 2;
      expect(Math.abs(est - kcal) / kcal, f.id).toBeLessThan(0.15);
    }
  });
  it('computes protein per serving', () => {
    expect(proteinPerServing(FOODS.find((f) => f.id === 'soya_chunks')!)).toBe(26);
  });
});

describe('planner', () => {
  const equipmentSets: Equipment[][] = [['none'], ['dumbbells'], ['resistance_bands'], ['pullup_bar'], ['dumbbells', 'bench', 'pullup_bar'], ['barbell', 'bench', 'dumbbells', 'cable_machine', 'machines', 'cardio_machine', 'pullup_bar']];
  const experiences: Experience[] = ['beginner', 'intermediate', 'advanced'];

  it('produces valid sessions for every combination', () => {
    for (const equipment of equipmentSets)
      for (const experience of experiences)
        for (let n = 1; n <= 7; n++)
          for (const sessionMinutes of [20, 30, 45, 60] as const) {
            const days = [0, 1, 2, 3, 4, 5, 6].slice(0, n) as Weekday[];
            const plan = generatePlan({ ...base, equipment, experience, workoutDays: days, sessionMinutes });
            const training = plan.days.filter((s) => s.type !== 'rest' && s.type !== 'recovery');
            expect(plan.days).toHaveLength(7);
            for (const s of training) {
              expect(s.exercises.length).toBeGreaterThanOrEqual(3);
              const ids = s.exercises.map((e) => e.exerciseId);
              expect(new Set(ids).size).toBe(ids.length);
              for (const e of s.exercises) {
                const ex = exerciseById(e.exerciseId)!;
                expect(isAvailable(ex, equipment)).toBe(true);
              }
            }
            // at least one non-training day per week
            expect(plan.days.some((s) => s.type === 'rest' || s.type === 'recovery')).toBe(true);
          }
  });

  it('chooses splits by frequency', () => {
    expect(splitFor(3, 'beginner')).toEqual(['full_a', 'full_b', 'full_c']);
    expect(splitFor(4, 'advanced')).toEqual(['upper', 'lower', 'upper', 'lower']);
    expect(splitFor(6, 'advanced')).toEqual(['push', 'pull', 'legs', 'push', 'pull', 'legs']);
    expect(splitFor(7, 'beginner')).toContain('recovery');
  });

  it('switches to a gentle plan after a positive screening', () => {
    const plan = generatePlan({ ...base, experience: 'advanced', health: { ...EMPTY_SCREENING, heartCondition: true } });
    expect(plan.gentle).toBe(true);
    for (const s of plan.days)
      for (const e of [...s.exercises, ...(s.finisher ? [s.finisher] : [])]) {
        expect(exerciseById(e.exerciseId)!.level).toBe(1);
        expect(e.sets).toBeLessThanOrEqual(2);
        expect(e.exerciseId).not.toBe('burpee');
      }
  });

  it('every exercise has cues', () => {
    for (const e of EXERCISES) expect(e.cues.length).toBeGreaterThanOrEqual(3);
  });
});

describe('progression', () => {
  it('has a consistent level curve', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(150);
    expect(levelFromXp(149).level).toBe(1);
    expect(levelFromXp(150).level).toBe(2);
    expect(rankForLevel(1).id).toBe('ember');
    expect(rankForLevel(10).id).toBe('iron');
    expect(rankForLevel(99).id).toBe('ascendant');
  });

  it('rewards partial workouts proportionally', () => {
    const plan = generatePlan(base);
    const s = plan.days[1]!;
    const full = rewardForWorkout(s, { setsDone: s.exercises.map((e) => e.sets), finisherDone: true });
    const half = rewardForWorkout(s, { setsDone: s.exercises.map((e) => Math.floor(e.sets / 2)) });
    expect(full.xp).toBe(150);
    expect(half.xp).toBeLessThan(full.xp);
    expect(full.stats.STR).toBe(1);
  });

  it('counts streaks over training days only', () => {
    // 2026-01-05 is a Monday. Training Mon/Wed/Fri.
    const done = new Set(['2026-01-05', '2026-01-07', '2026-01-09']);
    expect(computeStreak([1, 3, 5], done, '2026-01-11', '2026-01-01')).toBe(3);
    // Monday 12th not done yet → still 3 during the day
    expect(computeStreak([1, 3, 5], done, '2026-01-12', '2026-01-01')).toBe(3);
    // missed Monday 12th → broken on Tuesday
    expect(computeStreak([1, 3, 5], done, '2026-01-13', '2026-01-01')).toBe(0);
  });
});

describe('access timeline', () => {
  const start = '2026-01-01';
  const none = { state: 'none' as const };
  const now = new Date('2026-01-10T12:00:00Z');

  it('gives 9 free days, then locks on day 10', () => {
    expect(accessStatus(start, '2026-01-01', none, now)).toMatchObject({ phase: 'free', day: 1, freeDaysLeft: 9 });
    expect(accessStatus(start, '2026-01-09', none, now)).toMatchObject({ phase: 'free', day: 9, freeDaysLeft: 1, warnPaywall: true });
    expect(accessStatus(start, '2026-01-10', none, now)).toMatchObject({ phase: 'locked', day: 10, hasAccess: false });
  });

  it('subscribing on day 10 means first charge on day 16 (15 free days total)', () => {
    const s = accessStatus(start, '2026-01-10', none, now);
    expect(diffDays(start, s.billingStartsIfSubscribedToday) + 1).toBe(16);
  });

  it('grants access during trial, grace and canceled-but-paid periods', () => {
    const exp = '2026-01-16T00:00:00Z';
    expect(accessStatus(start, '2026-01-12', { state: 'trial', expiresAt: exp }, now).phase).toBe('trial');
    expect(accessStatus(start, '2026-01-12', { state: 'grace', expiresAt: exp }, now).hasAccess).toBe(true);
    expect(accessStatus(start, '2026-01-12', { state: 'canceled', expiresAt: exp }, now).hasAccess).toBe(true);
    expect(accessStatus(start, '2026-01-20', { state: 'canceled', expiresAt: exp }, new Date('2026-01-20T00:00:00Z')).hasAccess).toBe(false);
    expect(accessStatus(start, '2026-01-12', { state: 'on_hold' }, now).hasAccess).toBe(false);
  });
});

describe('check-ins', () => {
  it('is due every 21 days', () => {
    expect(isCheckInDue('2026-01-01', addDays('2026-01-01', 20))).toBe(false);
    expect(isCheckInDue('2026-01-01', addDays('2026-01-01', 21))).toBe(true);
    expect(isCheckInDue('2026-01-01', '2026-02-01', '2026-01-22')).toBe(false);
  });

  it('flags loss faster than 1%/week', () => {
    const r = evaluateCheckIn({ goal: 'lose_weight', pace: 'fast', previousWeightKg: 80, currentWeightKg: 76, days: 21, plannedCalories: 2000, formulaMaintenance: 2700, adherence: 'mostly' });
    expect(r.status).toBe('too_fast');
    expect(r.canGoFaster).toBe(false);
  });

  it('recalibrates maintenance from real data within ±20%', () => {
    const r = evaluateCheckIn({ goal: 'lose_weight', pace: 'standard', previousWeightKg: 80, currentWeightKg: 78.2, days: 21, plannedCalories: 2100, formulaMaintenance: 2760, adherence: 'mostly' });
    expect(r.status).toBe('on_track');
    expect(r.maintenanceEstimate).toBe(2760);
    const noisy = evaluateCheckIn({ goal: 'lose_weight', pace: 'standard', previousWeightKg: 80, currentWeightKg: 74, days: 14, plannedCalories: 2100, formulaMaintenance: 2760, adherence: 'mostly' });
    expect(noisy.maintenanceEstimate).toBe(Math.round((2760 * 1.2) / 10) * 10);
  });

  it('shifts pace within bounds', () => {
    expect(shiftPace('fast', 'faster')).toBe('fast');
    expect(shiftPace('standard', 'slower')).toBe('steady');
  });
});

describe('validation', () => {
  it('accepts a valid profile and rejects bad input', () => {
    expect(profileSchema.safeParse(base).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, age: 12 }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, workoutDays: [] }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, workoutDays: [1, 1] }).success).toBe(false);
  });
});

describe('player state', () => {
  it('aggregates XP, stats and full weeks', async () => {
    const { computePlayer, XP } = await import('../src');
    // start Monday 2026-01-05, training Mon/Wed/Fri, first week fully done
    const workouts = ['2026-01-05', '2026-01-07', '2026-01-09'].map((date) => ({ date, xp: 150, completion: 1, stats: { STR: 1 } }));
    const p = computePlayer({ startDate: '2026-01-05', today: '2026-01-13', trainingWeekdays: [1, 3, 5], workouts, habits: [{ xp: 50, stats: { VIT: 1 } }], checkIns: 0 });
    expect(p.fullWeeks).toBe(1);
    expect(p.xp).toBe(450 + 50 + XP.streakWeek);
    expect(p.stats.STR).toBe(13);
    expect(p.stats.DIS).toBe(11);
    expect(p.streak).toBe(0); // Monday 12th was missed
  });
});
