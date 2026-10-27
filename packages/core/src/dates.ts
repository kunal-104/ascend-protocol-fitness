/** Calendar-date helpers. All dates are local calendar days as 'YYYY-MM-DD' strings, computed in UTC to avoid DST drift. */

export type DateStr = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateStr(s: unknown): s is DateStr {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function parse(s: DateStr): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (b − a). */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

export function weekdayOf(s: DateStr): number {
  return parse(s).getUTCDay();
}

/** The user's local calendar date for an instant, given an IANA time zone. */
export function localDate(instant: Date, timeZone: string): DateStr {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}
