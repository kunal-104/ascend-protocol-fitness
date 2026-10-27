import { addDays, message, weekdayOf, CHECKIN_INTERVAL_DAYS, type DateStr } from '@ascend/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { UserState } from './types';

const PREFS_KEY = 'ascend.reminders';
const CHANNEL = 'directives';
const DAYS_AHEAD = 14;

export interface ReminderPrefs {
  enabled: boolean;
  morningHour: number;
  eveningHour: number;
}

export const DEFAULT_PREFS: ReminderPrefs = { enabled: true, morningHour: 7, eveningHour: 19 };

export async function getPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function setPrefs(p: ReminderPrefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Daily Directives',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#2BC4FF',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function at(date: DateStr, hour: number): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, hour, 0, 0);
}

/**
 * Local notifications for the next two weeks: a morning Directive (or Stillness Day) message, an evening
 * reminder on training days that are not yet complete, check-in and paywall notices.
 * Rescheduled every time the app opens or a Directive is logged.
 */
export async function scheduleReminders(u: UserState, todayCompleted: boolean) {
  const prefs = await getPrefs();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.enabled || !(await Notifications.getPermissionsAsync()).granted) return;

  const now = Date.now();
  const name = u.profile.callsign;
  const jobs: { date: Date; title: string; body: string }[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(u.today, i);
    const session = u.plan.days[weekdayOf(day)]!;
    if (session.type === 'rest') {
      jobs.push({ date: at(day, prefs.morningHour), title: 'Stillness Day', body: message('stillnessDay', day, { steps: u.plan.stepsTarget.toLocaleString() }) });
      continue;
    }
    const vars = { name, session: session.title, minutes: session.estMinutes };
    jobs.push({ date: at(day, prefs.morningHour), title: 'Daily Directive', body: message('directiveIssued', day, vars) });
    if (!(i === 0 && todayCompleted)) {
      jobs.push({ date: at(day, prefs.eveningHour), title: 'Directive incomplete', body: message('directiveReminder', day, vars) });
    }
  }

  if (u.access.phase === 'free' && u.access.freeDaysLeft > 1) {
    const warnDay = addDays(u.today, u.access.freeDaysLeft - 3);
    if (warnDay >= u.today) {
      jobs.push({ date: at(warnDay, 12), title: 'Protocol notice', body: message('paywallWarning', warnDay, { days: 3 }) });
    }
  }
  const checkDay = u.checkIn.nextDate;
  if (checkDay >= u.today && checkDay <= addDays(u.today, CHECKIN_INTERVAL_DAYS)) {
    jobs.push({ date: at(checkDay, prefs.morningHour), title: 'Calibration available', body: message('calibrationDue', checkDay) });
  }

  for (const j of jobs) {
    if (j.date.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: `[PROTOCOL] ${j.title}`, body: j.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: j.date, channelId: CHANNEL },
    });
  }
}
