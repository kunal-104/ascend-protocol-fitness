import { diffDays, addDays, type DateStr } from './dates';
import { estimateMaintenance, PACE_RATES } from './nutrition';
import type { Goal, Pace } from './types';

/** Weigh-in check-ins are offered every 3 weeks. They are optional. */
export const CHECKIN_INTERVAL_DAYS = 21;

export function nextCheckInDate(startDate: DateStr, lastCheckIn?: DateStr): DateStr {
  return addDays(lastCheckIn ?? startDate, CHECKIN_INTERVAL_DAYS);
}

export function isCheckInDue(startDate: DateStr, today: DateStr, lastCheckIn?: DateStr): boolean {
  return diffDays(nextCheckInDate(startDate, lastCheckIn), today) >= 0;
}

export type Adherence = 'mostly' | 'partly' | 'rarely';
export type CheckInStatus = 'on_track' | 'too_fast' | 'too_slow' | 'wrong_direction' | 'stable';

export interface CheckInInput {
  goal: Goal;
  pace: Pace;
  previousWeightKg: number;
  currentWeightKg: number;
  days: number;
  plannedCalories: number;
  formulaMaintenance: number;
  adherence: Adherence;
}

export interface CheckInResult {
  changeKg: number;
  weeklyRateKg: number;
  /** Weekly change as a percentage of body weight. */
  weeklyRatePct: number;
  expectedWeeklyKg: number;
  status: CheckInStatus;
  message: string;
  /** Calibrated maintenance to feed into computeNutrition, when the data is trustworthy. */
  maintenanceEstimate?: number;
  canGoFaster: boolean;
  canGoSlower: boolean;
}

const PACES: Pace[] = ['steady', 'standard', 'fast'];

export function shiftPace(pace: Pace, dir: 'faster' | 'slower'): Pace {
  const i = PACES.indexOf(pace) + (dir === 'faster' ? 1 : -1);
  return PACES[Math.min(PACES.length - 1, Math.max(0, i))]!;
}

export function evaluateCheckIn(i: CheckInInput): CheckInResult {
  const changeKg = Math.round((i.currentWeightKg - i.previousWeightKg) * 10) / 10;
  const weeks = Math.max(i.days, 1) / 7;
  const weeklyRateKg = Math.round((changeKg / weeks) * 100) / 100;
  const weeklyRatePct = Math.round((weeklyRateKg / i.previousWeightKg) * 1000) / 10;

  let expectedWeeklyKg = 0;
  if (i.goal !== 'stay_fit') {
    const sign = i.goal === 'lose_weight' ? -1 : 1;
    expectedWeeklyKg = sign * PACE_RATES[i.goal][i.pace] * i.previousWeightKg;
  }

  let status: CheckInStatus;
  let message: string;
  if (i.goal === 'stay_fit') {
    status = Math.abs(weeklyRatePct) <= 0.25 ? 'stable' : weeklyRateKg < 0 ? 'too_fast' : 'too_slow';
    message =
      status === 'stable'
        ? 'Weight is stable. Exactly what a maintenance phase should look like.'
        : `Weight moved ${Math.abs(changeKg)} kg. If that wasn't intended, the Protocol will adjust your calories.`;
  } else if (i.goal === 'lose_weight') {
    if (weeklyRatePct > 0.1) {
      status = 'wrong_direction';
      message = 'Weight went up. Short-term water changes are common; check portion sizes and log honestly for the next cycle.';
    } else if (-weeklyRatePct > 1.0) {
      status = 'too_fast';
      message = 'You are losing faster than 1% of body weight per week. That risks muscle loss; the Protocol recommends slowing down.';
    } else if (-weeklyRateKg < -expectedWeeklyKg * 0.5) {
      status = 'too_slow';
      message = 'Progress is slower than planned. Small, steady changes still count.';
    } else {
      status = 'on_track';
      message = 'On track. Your body is responding to the Protocol.';
    }
  } else {
    if (weeklyRatePct < -0.1) {
      status = 'wrong_direction';
      message = 'Weight went down while building. You likely need more food. Consider adding a calorie-dense snack.';
    } else if (weeklyRatePct > 0.5) {
      status = 'too_fast';
      message = 'You are gaining faster than ~0.5% per week. Much of the extra is likely fat; consider slowing down.';
    } else if (weeklyRateKg < expectedWeeklyKg * 0.5) {
      status = 'too_slow';
      message = 'Gaining slower than planned. A little more food will help muscle growth.';
    } else {
      status = 'on_track';
      message = 'On track. Strength and size are building.';
    }
  }

  // Only trust the data for recalibration if the user mostly followed the calorie target over ≥2 weeks.
  let maintenanceEstimate: number | undefined;
  if (i.adherence === 'mostly' && i.days >= 14) {
    const est = estimateMaintenance(i.plannedCalories, changeKg, i.days);
    const lo = i.formulaMaintenance * 0.8;
    const hi = i.formulaMaintenance * 1.2;
    maintenanceEstimate = Math.round(Math.min(hi, Math.max(lo, est)) / 10) * 10;
  }

  return {
    changeKg,
    weeklyRateKg,
    weeklyRatePct,
    expectedWeeklyKg: Math.round(expectedWeeklyKg * 100) / 100,
    status,
    message,
    maintenanceEstimate,
    canGoFaster: i.goal !== 'stay_fit' && i.pace !== 'fast' && status !== 'too_fast',
    canGoSlower: i.goal !== 'stay_fit' && i.pace !== 'steady',
  };
}
