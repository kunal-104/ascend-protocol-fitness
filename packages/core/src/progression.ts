import { addDays, weekdayOf, type DateStr } from './dates';
import { exerciseById, type Stat } from './exercises';
import type { Session } from './planner';

export type StatKey = Stat | 'DIS';

export const XP = {
  workoutBase: 100,
  workoutFullBonus: 50,
  recoverySession: 40,
  stepsHit: 20,
  proteinHit: 25,
  caloriesOnTarget: 25,
  waterHit: 10,
  checkIn: 150,
  streakWeek: 75,
} as const;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 150 + 30 * (level - 1);
}

/** Total XP needed to reach `level` from level 1. */
export function totalXpForLevel(level: number): number {
  const n = level - 1;
  return 150 * n + 15 * n * (n - 1);
}

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  while (xp >= totalXpForLevel(level + 1)) level++;
  return { level, into: xp - totalXpForLevel(level), needed: xpToNext(level) };
}

export interface Rank {
  id: 'ember' | 'iron' | 'steel' | 'cobalt' | 'obsidian' | 'ascendant';
  name: string;
  minLevel: number;
  color: string;
  title: string;
}

export const RANKS: Rank[] = [
  { id: 'ember', name: 'Ember', minLevel: 1, color: '#B0B8C4', title: 'The spark has been lit.' },
  { id: 'iron', name: 'Iron', minLevel: 10, color: '#8FA3B8', title: 'Your will has hardened.' },
  { id: 'steel', name: 'Steel', minLevel: 20, color: '#5EC8FF', title: 'Forged under pressure.' },
  { id: 'cobalt', name: 'Cobalt', minLevel: 35, color: '#3D7BFF', title: 'Few walk this far.' },
  { id: 'obsidian', name: 'Obsidian', minLevel: 50, color: '#A36BFF', title: 'Unbreakable. Unyielding.' },
  { id: 'ascendant', name: 'Ascendant', minLevel: 70, color: '#FFD15C', title: 'You have outgrown the Protocol.' },
];

export function rankForLevel(level: number): Rank {
  let r = RANKS[0]!;
  for (const rank of RANKS) if (level >= rank.minLevel) r = rank;
  return r;
}

export type Stats = Record<StatKey, number>;
export const BASE_STATS: Stats = { STR: 10, END: 10, AGI: 10, VIT: 10, DIS: 10 };

export interface WorkoutResult {
  /** Sets completed per planned exercise index. */
  setsDone: number[];
  finisherDone?: boolean;
}

export interface Reward {
  xp: number;
  stats: Partial<Stats>;
  completion: number;
}

/** XP and stat gains for a logged session. Partial sessions earn proportional XP; nothing is lost for stopping early. */
export function rewardForWorkout(session: Session, result: WorkoutResult): Reward {
  if (session.type === 'rest') return { xp: 0, stats: {}, completion: 0 };
  const planned = session.exercises.reduce((a, e) => a + e.sets, 0) + (session.finisher ? 1 : 0);
  let done = session.exercises.reduce((a, e, i) => a + Math.min(result.setsDone[i] ?? 0, e.sets), 0);
  if (session.finisher && result.finisherDone) done += 1;
  const completion = planned === 0 ? 0 : done / planned;

  const stats: Partial<Stats> = {};
  session.exercises.forEach((e, i) => {
    if ((result.setsDone[i] ?? 0) > 0) {
      const stat = exerciseById(e.exerciseId)?.stat;
      if (stat) stats[stat] = 1; // one point per stat trained, not per exercise
    }
  });
  if (session.finisher && result.finisherDone) stats.END = 1;

  if (session.type === 'recovery') {
    return { xp: Math.round(XP.recoverySession * completion), stats: completion > 0 ? { AGI: 1 } : {}, completion };
  }
  const xp = Math.round(XP.workoutBase * completion + (completion >= 0.999 ? XP.workoutFullBonus : 0));
  return { xp, stats, completion };
}

export interface DailyHabits {
  proteinHit: boolean;
  caloriesOnTarget: boolean;
  waterHit: boolean;
  stepsHit: boolean;
}

export function rewardForHabits(h: DailyHabits): Reward {
  const xp =
    (h.proteinHit ? XP.proteinHit : 0) +
    (h.caloriesOnTarget ? XP.caloriesOnTarget : 0) +
    (h.waterHit ? XP.waterHit : 0) +
    (h.stepsHit ? XP.stepsHit : 0);
  const stats: Partial<Stats> = {};
  if (h.proteinHit && h.caloriesOnTarget) stats.VIT = 1;
  if (h.stepsHit) stats.END = 1;
  return { xp, stats, completion: 1 };
}

/**
 * Current streak = consecutive scheduled training days completed, walking back from today.
 * Rest days neither break nor extend the streak. If today is a training day that hasn't been
 * completed yet, counting starts from the previous training day (the day isn't over).
 */
export function computeStreak(trainingWeekdays: number[], completed: Set<DateStr>, today: DateStr, startDate: DateStr): number {
  if (trainingWeekdays.length === 0) return 0;
  const training = new Set(trainingWeekdays);
  let streak = 0;
  let d = today;
  if (training.has(weekdayOf(d)) && !completed.has(d)) d = addDays(d, -1);
  for (let guard = 0; guard < 3660 && d >= startDate; guard++, d = addDays(d, -1)) {
    if (!training.has(weekdayOf(d))) continue;
    if (!completed.has(d)) break;
    streak++;
  }
  return streak;
}

export function addStats(a: Stats, b: Partial<Stats>): Stats {
  const out = { ...a };
  for (const k of Object.keys(b) as StatKey[]) out[k] += b[k] ?? 0;
  return out;
}

/** A logged Directive counts toward the Chain when at least half of it was done. */
export const STREAK_COMPLETION_THRESHOLD = 0.5;

/**
 * Full weeks (7-day blocks counted from the start date, entirely before today) in which every
 * scheduled training day was completed. Each one grants Discipline and bonus Essence.
 */
export function fullWeeks(trainingWeekdays: number[], completed: Set<DateStr>, startDate: DateStr, today: DateStr): number {
  const training = new Set(trainingWeekdays);
  if (training.size === 0) return 0;
  let count = 0;
  for (let weekStart = startDate; addDays(weekStart, 6) < today; weekStart = addDays(weekStart, 7)) {
    let ok = true;
    for (let i = 0; i < 7 && ok; i++) {
      const d = addDays(weekStart, i);
      if (training.has(weekdayOf(d)) && !completed.has(d)) ok = false;
    }
    if (ok) count++;
  }
  return count;
}

export interface PlayerInput {
  startDate: DateStr;
  today: DateStr;
  trainingWeekdays: number[];
  workouts: { date: DateStr; xp: number; completion: number; stats: Partial<Stats> }[];
  habits: { xp: number; stats: Partial<Stats> }[];
  checkIns: number;
}

export interface PlayerState {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  rank: Rank;
  stats: Stats;
  streak: number;
  fullWeeks: number;
  workoutsCompleted: number;
}

export function computePlayer(i: PlayerInput): PlayerState {
  const completed = new Set(i.workouts.filter((w) => w.completion >= STREAK_COMPLETION_THRESHOLD).map((w) => w.date));
  const weeks = fullWeeks(i.trainingWeekdays, completed, i.startDate, i.today);
  let stats = { ...BASE_STATS };
  let xp = i.checkIns * XP.checkIn + weeks * XP.streakWeek;
  for (const w of i.workouts) {
    xp += w.xp;
    stats = addStats(stats, w.stats);
  }
  for (const h of i.habits) {
    xp += h.xp;
    stats = addStats(stats, h.stats);
  }
  stats.DIS += weeks;
  const lvl = levelFromXp(xp);
  return {
    xp,
    level: lvl.level,
    xpIntoLevel: lvl.into,
    xpForNextLevel: lvl.needed,
    rank: rankForLevel(lvl.level),
    stats,
    streak: computeStreak(i.trainingWeekdays, completed, i.today, i.startDate),
    fullWeeks: weeks,
    workoutsCompleted: completed.size,
  };
}
