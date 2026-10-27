import type {
  AccessStatus,
  CheckInResult,
  DateStr,
  NutritionTargets,
  PlayerState,
  Profile,
  Rank,
  Reward,
  Session,
  SubscriptionSnapshot,
  WeeklyPlan,
} from '@ascend/core';

/** Mirrors serializeState() in server/src/services/state.ts. */
export interface UserState {
  email: string;
  today: DateStr;
  profile: Profile;
  startDate: DateStr;
  startWeightKg: number;
  timezone: string;
  nutrition: NutritionTargets;
  plan: WeeklyPlan;
  player: PlayerState;
  access: AccessStatus;
  subscription: SubscriptionSnapshot;
  checkIn: { due: boolean; nextDate: DateStr; lastDate?: DateStr; count: number };
  todayWorkout: { completion: number; xp: number } | null;
  todayHabits: HabitLog | null;
}

export type MeResponse = ({ onboarded: true } & UserState) | { onboarded: false; email?: string };

export interface HabitLog {
  proteinHit: boolean;
  caloriesOnTarget: boolean;
  waterHit: boolean;
  stepsHit: boolean;
}

export interface DayResponse {
  date: DateStr;
  session: Session;
  workout: { setsDone: number[]; finisherDone: boolean; completion: number; xp: number } | null;
  habits: HabitLog | null;
}

export interface RewardResponse {
  reward: Reward;
  levelUp: number | null;
  rankUp: Rank | null;
  state: UserState;
}

export interface WeighInsResponse {
  start: { date: DateStr; weightKg: number };
  weighIns: { date: DateStr; weightKg: number; adherence: string; result: CheckInResult }[];
}

export interface CheckInResponse {
  previous: { date: DateStr; weightKg: number };
  result: CheckInResult;
  state: UserState;
}

export interface HistoryResponse {
  workouts: { date: DateStr; completion: number; xp: number; title: string }[];
  habits: (HabitLog & { date: DateStr; xp: number })[];
  weighIns: { date: DateStr; weightKg: number }[];
}
