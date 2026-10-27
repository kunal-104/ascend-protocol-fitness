import { EXERCISES, isAvailable, type Exercise, type Pattern } from './exercises';
import type { Experience, Goal, Profile, Weekday } from './types';

/*
 * Weekly training plan generator. Programming rules (see docs/RESEARCH.md):
 * - Each major muscle group trained ≥2×/week (WHO 2020; Schoenfeld et al. 2016).
 * - Novices: 1–3 sets per exercise, intermediates/advanced 3–4 (ACSM 2009 position stand).
 * - Sets end 1–3 reps short of failure; progress with "double progression".
 * - Fat loss leans on daily steps + short conditioning rather than very long cardio sessions.
 * - At least one full rest day per week.
 */

export type SessionType = 'full_a' | 'full_b' | 'full_c' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'recovery' | 'rest';

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  /** Rep range for rep-based exercises. */
  reps?: [number, number];
  /** Seconds per set for timed exercises. */
  seconds?: number;
  restSec: number;
}

export interface Session {
  type: SessionType;
  title: string;
  focus: string;
  warmup: string[];
  exercises: PlannedExercise[];
  finisher?: PlannedExercise & { format: string };
  estMinutes: number;
}

export interface WeeklyPlan {
  /** Index = weekday (0 = Sunday). */
  days: Session[];
  stepsTarget: number;
  /** Minutes of moderate cardio per week (finishers + recovery walks), compared to the WHO 150-min guideline. */
  cardioMinutesPerWeek: number;
  /** Plan was softened because of the health screening or age. */
  gentle: boolean;
  intensityNote: string;
  progression: string[];
}

const SESSION_INFO: Record<SessionType, { title: string; focus: string; slots: { p: Pattern; alt?: boolean }[] }> = {
  full_a: { title: 'Full Body · Alpha', focus: 'Whole body strength', slots: [{ p: 'squat' }, { p: 'push_horizontal' }, { p: 'pull_horizontal' }, { p: 'hinge' }, { p: 'core' }, { p: 'calves' }] },
  full_b: { title: 'Full Body · Beta', focus: 'Whole body strength', slots: [{ p: 'hinge' }, { p: 'push_vertical' }, { p: 'pull_vertical' }, { p: 'lunge' }, { p: 'core' }, { p: 'triceps' }] },
  full_c: { title: 'Full Body · Gamma', focus: 'Whole body strength', slots: [{ p: 'lunge' }, { p: 'push_horizontal' }, { p: 'pull_vertical' }, { p: 'squat' }, { p: 'core' }, { p: 'biceps' }] },
  upper: { title: 'Upper Body', focus: 'Chest, back, shoulders, arms', slots: [{ p: 'push_horizontal' }, { p: 'pull_horizontal' }, { p: 'push_vertical' }, { p: 'pull_vertical' }, { p: 'biceps' }, { p: 'triceps' }] },
  lower: { title: 'Lower Body', focus: 'Legs, glutes, core', slots: [{ p: 'squat' }, { p: 'hinge' }, { p: 'lunge' }, { p: 'calves' }, { p: 'core' }, { p: 'core', alt: true }] },
  push: { title: 'Push', focus: 'Chest, shoulders, triceps', slots: [{ p: 'push_horizontal' }, { p: 'push_vertical' }, { p: 'push_horizontal', alt: true }, { p: 'triceps' }, { p: 'core' }, { p: 'push_vertical', alt: true }] },
  pull: { title: 'Pull', focus: 'Back, biceps', slots: [{ p: 'pull_vertical' }, { p: 'pull_horizontal' }, { p: 'pull_horizontal', alt: true }, { p: 'biceps' }, { p: 'core' }, { p: 'pull_vertical', alt: true }] },
  legs: { title: 'Legs', focus: 'Quads, hamstrings, glutes, calves', slots: [{ p: 'squat' }, { p: 'hinge' }, { p: 'lunge' }, { p: 'calves' }, { p: 'core' }, { p: 'squat', alt: true }] },
  recovery: { title: 'Recovery', focus: 'Mobility and an easy walk', slots: [] },
  rest: { title: 'Rest', focus: 'Recover. Hit your steps.', slots: [] },
};

/** Patterns to try when nothing is available for the requested one. */
const FALLBACK: Partial<Record<Pattern, Pattern[]>> = {
  pull_vertical: ['pull_horizontal'],
  push_vertical: ['push_horizontal'],
  biceps: ['pull_horizontal'],
  triceps: ['push_horizontal'],
  calves: ['lunge'],
};

const MAX_LEVEL: Record<Experience, number> = { beginner: 1, intermediate: 2, advanced: 3 };
const EXERCISE_COUNT: Record<Profile['sessionMinutes'], number> = { 20: 3, 30: 4, 45: 5, 60: 6 };

export function isGentle(p: Profile): boolean {
  const h = p.health;
  return (
    p.age >= 65 ||
    h.heartCondition ||
    h.chestPain ||
    h.dizzinessOrFainting ||
    h.chronicCondition ||
    h.medicationForChronicCondition ||
    h.boneJointProblem ||
    h.doctorSupervisedOnly ||
    h.pregnant
  );
}

/** Any "yes" on the PAR-Q-style questions → the app asks the user to get medical clearance first. */
export function needsMedicalClearance(p: Profile): boolean {
  const h = p.health;
  return Object.values(h).some(Boolean);
}

export function splitFor(dayCount: number, experience: Experience): SessionType[] {
  if (dayCount <= 0) return [];
  if (dayCount === 1) return ['full_a'];
  if (dayCount === 2) return ['full_a', 'full_b'];
  if (dayCount === 3) return ['full_a', 'full_b', 'full_c'];
  if (experience === 'beginner' || dayCount === 4) {
    const s: SessionType[] = [];
    for (let i = 0; i < Math.min(dayCount, 6); i++) s.push(i % 2 === 0 ? 'upper' : 'lower');
    if (dayCount === 7) s.push('recovery');
    return s;
  }
  if (dayCount === 5) return ['upper', 'lower', 'push', 'pull', 'legs'];
  const ppl: SessionType[] = ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
  // 7 selected days: keep one as active recovery so there is always a lighter day.
  return dayCount === 7 ? [...ppl, 'recovery'] : ppl;
}

interface PickCtx {
  owned: Profile['equipment'];
  maxLevel: number;
  gentle: boolean;
  used: Set<string>;
}

function score(ex: Exercise, ctx: PickCtx): number {
  let s = ex.level * 10;
  if (ex.requires.length > 0) s += 5; // external load is easier to progress
  if (ctx.gentle && ex.jointFriendly) s += 25;
  return s;
}

const HIGH_IMPACT = new Set(['burpee', 'jumping_jacks', 'deadlift', 'decline_pushup', 'pistol_box', 'hollow_hold']);

function pick(pattern: Pattern, ctx: PickCtx): Exercise | undefined {
  const tryPattern = (p: Pattern) =>
    EXERCISES.filter(
      (e) =>
        e.pattern === p &&
        e.level <= ctx.maxLevel &&
        isAvailable(e, ctx.owned) &&
        !ctx.used.has(e.id) &&
        !(ctx.gentle && HIGH_IMPACT.has(e.id)),
    ).sort((a, b) => score(b, ctx) - score(a, ctx))[0];
  let ex = tryPattern(pattern);
  for (const fb of FALLBACK[pattern] ?? []) {
    if (ex) break;
    ex = tryPattern(fb);
  }
  return ex;
}

function prescription(ex: Exercise, slotIndex: number, goal: Goal, exp: Experience, gentle: boolean): PlannedExercise {
  const main = slotIndex < 2;
  let sets = exp === 'beginner' ? 2 : exp === 'intermediate' ? 3 : main ? 4 : 3;
  if (gentle) sets = Math.min(sets, 2);

  if (ex.timed) {
    const seconds = exp === 'beginner' || gentle ? 20 : exp === 'intermediate' ? 30 : 45;
    return { exerciseId: ex.id, sets, seconds, restSec: 45 };
  }

  const bodyweight = ex.requires.length === 0;
  let reps: [number, number];
  if (goal === 'gain_muscle') reps = main && !bodyweight ? [6, 10] : [10, 15];
  else if (goal === 'lose_weight') reps = main && !bodyweight ? [8, 12] : [10, 15];
  else reps = [10, 15];
  if (bodyweight && ex.level === 1) reps = [10, 20];

  let restSec = main ? (goal === 'gain_muscle' ? 120 : 90) : 60;
  if (gentle) restSec += 30;
  return { exerciseId: ex.id, sets, reps, restSec };
}

function finisherFor(p: Profile, gentle: boolean): Session['finisher'] {
  if (p.goal === 'gain_muscle' || p.sessionMinutes < 45) return undefined;
  const owned = p.equipment;
  const steady = owned.includes('cardio_machine') ? 'cardio_machine' : 'march_in_place';
  if (gentle || p.experience === 'beginner' || p.goal === 'stay_fit') {
    return { exerciseId: steady, sets: 1, seconds: 600, restSec: 0, format: '10 min steady pace — you can talk, but not sing' };
  }
  const interval = p.experience === 'advanced' ? 'burpee' : 'jumping_jacks';
  return { exerciseId: interval, sets: 8, seconds: 30, restSec: 30, format: 'Intervals: 30 s hard / 30 s easy × 8' };
}

function estimateMinutes(s: Omit<Session, 'estMinutes'>): number {
  let sec = 5 * 60; // warm-up
  for (const e of s.exercises) {
    sec += e.sets * ((e.seconds ?? 40) + e.restSec);
  }
  if (s.finisher) sec += s.finisher.sets * ((s.finisher.seconds ?? 0) + s.finisher.restSec);
  return Math.round(sec / 60);
}

function buildSession(type: SessionType, p: Profile, gentle: boolean): Session {
  const info = SESSION_INFO[type];
  if (type === 'rest') {
    return { type, title: info.title, focus: info.focus, warmup: [], exercises: [], estMinutes: 0 };
  }
  if (type === 'recovery') {
    const exercises: PlannedExercise[] = ['cat_cow', 'worlds_greatest', 'hip_flexor_stretch', 'thoracic_open_book'].map((id) => ({
      exerciseId: id,
      sets: 1,
      seconds: 60,
      restSec: 15,
    }));
    const finisher = { exerciseId: 'brisk_walk', sets: 1, seconds: 20 * 60, restSec: 0, format: '20 min easy walk' };
    const s = { type, title: info.title, focus: info.focus, warmup: [], exercises, finisher };
    return { ...s, estMinutes: estimateMinutes(s) };
  }

  const ctx: PickCtx = {
    owned: p.equipment,
    maxLevel: gentle ? 1 : MAX_LEVEL[p.experience],
    gentle: gentle || p.health.boneJointProblem,
    used: new Set(),
  };
  const count = EXERCISE_COUNT[p.sessionMinutes];
  const exercises: PlannedExercise[] = [];
  for (const slot of info.slots) {
    if (exercises.length >= count) break;
    const ex = pick(slot.p, ctx);
    if (!ex) continue;
    ctx.used.add(ex.id);
    exercises.push(prescription(ex, exercises.length, p.goal, p.experience, gentle));
  }
  const first = exercises[0];
  const warmup = [
    '3 min easy movement: marching, arm circles, hip circles',
    '10 bodyweight squats and 10 glute bridges',
    first ? 'One light practice set of your first exercise' : 'Ease into the first set',
  ];
  const s = { type, title: info.title, focus: info.focus, warmup, exercises, finisher: finisherFor(p, gentle) };
  return { ...s, estMinutes: estimateMinutes(s) };
}

export function generatePlan(p: Profile): WeeklyPlan {
  const gentle = isGentle(p);
  const days = [...new Set(p.workoutDays)].sort((a, b) => a - b) as Weekday[];
  const split = splitFor(days.length, p.experience);
  const sessions: Session[] = Array.from({ length: 7 }, () => buildSession('rest', p, gentle));
  days.forEach((d, i) => {
    sessions[d] = buildSession(split[i] ?? 'rest', p, gentle);
  });

  const baseSteps = p.goal === 'lose_weight' ? 8000 : p.goal === 'stay_fit' ? 7500 : 6000;
  const stepsTarget = gentle ? Math.min(baseSteps, 6000) : p.experience === 'beginner' ? Math.min(baseSteps, 7000) : baseSteps;

  let cardioSec = 0;
  for (const s of sessions) {
    if (s.finisher) cardioSec += s.finisher.sets * (s.finisher.seconds ?? 0);
  }

  return {
    days: sessions,
    stepsTarget,
    cardioMinutesPerWeek: Math.round(cardioSec / 60),
    gentle,
    intensityNote:
      gentle || p.experience === 'beginner'
        ? 'Finish every set with 2–3 good reps still in the tank. Technique first, always.'
        : 'Finish most sets with 1–2 good reps still in the tank. Never grind through bad form.',
    progression: [
      'Double progression: when you hit the top of the rep range on every set with clean form, add a little weight (≈2.5–5%) or move to the harder variation next time.',
      'Timed holds: add 5–10 seconds once the current time feels controlled.',
      'Every 6th week, do one set fewer per exercise (deload) to let your body catch up.',
      'Sharp or joint pain is a stop signal. Muscle burn and fatigue are normal; pain is not.',
    ],
  };
}

export function sessionForDate(plan: WeeklyPlan, date: Date): Session {
  return plan.days[date.getDay()]!;
}
