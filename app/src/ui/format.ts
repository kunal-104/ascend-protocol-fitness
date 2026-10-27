import type { Weekday } from '@ascend/core';

/** Display order: Monday first. */
export const DAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function prescription(e: { sets: number; reps?: [number, number]; seconds?: number }, unilateral?: boolean): string {
  const side = unilateral ? ' / side' : '';
  if (e.seconds) return e.seconds >= 120 ? `${Math.round(e.seconds / 60)} min` : `${e.sets} × ${e.seconds}s${side}`;
  if (e.reps) return `${e.sets} × ${e.reps[0]}–${e.reps[1]}${side}`;
  return `${e.sets} sets`;
}
