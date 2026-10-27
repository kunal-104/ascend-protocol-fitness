import { addDays, diffDays, type DateStr } from './dates';

/**
 * Access timeline:
 *   Day 1–9   free, no payment details needed.
 *   Day 10    paywall: the user must start the monthly subscription to keep using the app.
 *             The Google Play subscription carries a 6-day free trial, so nothing is charged yet.
 *   Day 16    first charge (when subscribing on day 10). Total free usage: 15 days.
 *
 * The 6-day trial is configured on the Play Console base plan as a free-trial offer; Google Play does the billing.
 * Google only grants a free trial once per user per subscription, so a returning user may be charged immediately.
 */
export const FREE_DAYS_BEFORE_PAYWALL = 9;
export const TRIAL_DAYS_AFTER_SUBSCRIBE = 6;
/** Start warning about the paywall this many days before it appears. */
export const PAYWALL_WARNING_DAYS = 3;

export type SubscriptionState =
  | 'none'
  | 'pending'
  | 'trial'
  | 'active'
  | 'grace'
  | 'on_hold'
  | 'paused'
  | 'canceled'
  | 'expired';

export interface SubscriptionSnapshot {
  state: SubscriptionState;
  /** ISO timestamp when the current paid/trial period ends. */
  expiresAt?: string;
}

export type AccessPhase = 'free' | 'trial' | 'subscribed' | 'locked';

export interface AccessStatus {
  phase: AccessPhase;
  hasAccess: boolean;
  /** 1-based day since the user started the Protocol. */
  day: number;
  /** Free days left before the paywall (phase 'free' only). */
  freeDaysLeft: number;
  /** Show an in-app notice that the paywall is coming. */
  warnPaywall: boolean;
  /** Date the first charge would happen if the user subscribed today. */
  billingStartsIfSubscribedToday: DateStr;
  expiresAt?: string;
}

export function isEntitled(sub: SubscriptionSnapshot, now: Date): boolean {
  const notExpired = !sub.expiresAt || new Date(sub.expiresAt).getTime() > now.getTime();
  switch (sub.state) {
    case 'trial':
    case 'active':
    case 'grace': // payment failed but Google keeps access during the grace period
      return notExpired;
    case 'canceled': // auto-renew off: access continues until the end of the paid period
      return !!sub.expiresAt && notExpired;
    default:
      return false;
  }
}

export function accessStatus(startDate: DateStr, today: DateStr, sub: SubscriptionSnapshot, now: Date): AccessStatus {
  const day = Math.max(1, diffDays(startDate, today) + 1);
  const freeDaysLeft = Math.max(0, FREE_DAYS_BEFORE_PAYWALL - day + 1);
  const base = {
    day,
    freeDaysLeft,
    billingStartsIfSubscribedToday: addDays(today, TRIAL_DAYS_AFTER_SUBSCRIBE),
    expiresAt: sub.expiresAt,
  };

  if (isEntitled(sub, now)) {
    return { ...base, phase: sub.state === 'trial' ? 'trial' : 'subscribed', hasAccess: true, warnPaywall: false };
  }
  if (day <= FREE_DAYS_BEFORE_PAYWALL) {
    return { ...base, phase: 'free', hasAccess: true, warnPaywall: freeDaysLeft <= PAYWALL_WARNING_DAYS };
  }
  return { ...base, phase: 'locked', hasAccess: false, warnPaywall: false };
}
