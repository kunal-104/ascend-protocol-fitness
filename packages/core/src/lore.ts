/**
 * Original lore and copy for "The Ascend Protocol".
 *
 * Inspired by the *genre* of game-system progression stories (status windows, quests, ranks) — an idea that
 * is free to use — but every name, line, rank and mechanic here is original. Do not add character names,
 * catch-phrases, logos, art or quest wording from any existing anime, manhwa or game (see docs/LEGAL.md).
 */

export const APP_NAME = 'Ascend Protocol';
export const SYSTEM_TAG = '[PROTOCOL]';

export const TERMS = {
  user: 'Initiate',
  dailyWorkout: 'Daily Directive',
  restDay: 'Stillness Day',
  recoveryDay: 'Recovery Rite',
  checkIn: 'Calibration',
  foods: 'Provisions',
  status: 'Status',
  streak: 'Chain',
  xp: 'Essence',
  finisher: 'Overdrive',
} as const;

export const INTRO_SEQUENCE = [
  'Signal detected.',
  'A dormant protocol inside you has been waiting.',
  'It does not care where you start.',
  'It only measures whether you rise.',
  'Calibration required. Answer truthfully. The Protocol cannot help what it cannot see.',
];

export const AWAKENING_COMPLETE = [
  'Calibration complete.',
  'Your Directives have been forged.',
  'From this moment, every rep is recorded. Every day counts.',
  'Welcome, Initiate. Ascend.',
];

export const STAT_INFO = {
  STR: { name: 'Strength', desc: 'Rises when you complete resistance training.' },
  END: { name: 'Endurance', desc: 'Rises with conditioning, holds and daily steps.' },
  AGI: { name: 'Agility', desc: 'Rises with mobility work and Recovery Rites.' },
  VIT: { name: 'Vitality', desc: 'Rises when you hit your protein and calorie targets.' },
  DIS: { name: 'Discipline', desc: 'Rises with every full week your Chain survives.' },
} as const;

type Vars = Record<string, string | number>;

export function fill(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Pick a line deterministically (stable for a given seed such as the date) so notifications vary day to day. */
export function pickLine(lines: readonly string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return lines[Math.abs(h) % lines.length]!;
}

export const MESSAGES = {
  directiveIssued: [
    'Daily Directive issued: {session}. Estimated time {minutes} min. The Protocol is watching.',
    'A new Directive has formed: {session}. Complete it before the day closes.',
    '{name}. Your body was built for more than this chair. Directive: {session}.',
    'Directive online: {session}. Yesterday’s version of you is the only opponent.',
    'The Protocol has assigned {session}. Rise, {name}.',
  ],
  directiveReminder: [
    'Your Directive is still open. {minutes} minutes stand between you and the next level.',
    'The day is closing, {name}. The Directive remains incomplete.',
    'Even a partial Directive earns Essence. Start with the first set.',
  ],
  stillnessDay: [
    'Stillness Day. Muscles are rebuilt in rest, not in the gym. Target: {steps} steps.',
    'No Directive today. Recover, eat your protein, and walk {steps} steps.',
    'The Protocol grants rest. Use it well.',
  ],
  directiveComplete: [
    'Directive complete. +{xp} Essence.',
    'Recorded. You are {xp} Essence stronger than this morning.',
    'The Protocol acknowledges your effort. +{xp} Essence.',
  ],
  levelUp: ['LEVEL UP. You have reached Level {level}.', 'Your limits have shifted. Level {level} attained.'],
  rankUp: ['RANK ASCENSION: {rank}. {title}', 'The Protocol recognises a new {rank}-rank Initiate. {title}'],
  chainMilestone: ['Chain intact for {count} Directives. Discipline +1.', '{count} Directives unbroken. The Chain grows heavier — and so do you.'],
  chainBroken: [
    'The Chain broke. It happens to every Initiate. Today’s Directive starts a new one.',
    'Missing a day does not erase your progress. Return to the Directive.',
  ],
  comeback: [
    'Welcome back, {name}. The Protocol kept your place.',
    'You returned. That is the hardest rep there is.',
  ],
  calibrationDue: [
    'Calibration available: three weeks have passed. Step on the scale to measure your ascent (optional).',
    'Three weeks of Directives recorded. Calibrate to see how far you have come.',
  ],
  paywallWarning: [
    '{days} free days remain. On day 10 the Protocol asks for your commitment — with 6 more days free.',
    'Your free calibration window closes in {days} days.',
  ],
  locked: [
    'The free window has closed. Commit to the Protocol to continue: 6 more days free, then monthly.',
  ],
  medicalClearance: [
    'Your answers suggest you should get clearance from a doctor before starting a new exercise program. The Protocol has switched to a gentler plan in the meantime.',
  ],
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function message(key: MessageKey, seed: string, vars: Vars = {}): string {
  return fill(pickLine(MESSAGES[key], seed), vars);
}

export const DISCLAIMER =
  'Ascend Protocol provides general fitness and nutrition information for healthy adults. It is not medical advice and does not diagnose or treat any condition. Talk to a qualified health professional before starting a new exercise or diet program, especially if you have a medical condition, are pregnant, or take medication. Stop exercising and seek help if you feel chest pain, severe breathlessness, dizziness or faintness.';
