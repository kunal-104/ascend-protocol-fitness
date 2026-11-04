export type Sex = 'male' | 'female' | 'unspecified';

/** Primary goal chosen during onboarding. */
export type Goal = 'lose_weight' | 'gain_muscle' | 'stay_fit';

/** How fast the user wants to move toward the goal. Bounded to evidence-based safe ranges. */
export type Pace = 'steady' | 'standard' | 'fast';

/** Activity outside of planned workouts (job, commute, chores). */
export type Lifestyle = 'sedentary' | 'light' | 'active' | 'very_active';

export type Experience = 'beginner' | 'intermediate' | 'advanced';

export type Equipment =
  | 'none'
  | 'dumbbells'
  | 'resistance_bands'
  | 'pullup_bar'
  | 'bench'
  | 'barbell'
  | 'cable_machine'
  | 'machines'
  | 'cardio_machine';

export type DietPreference = 'vegetarian' | 'eggetarian' | 'non_vegetarian' | 'vegan';

/** 0 = Sunday ... 6 = Saturday (same as JS Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Health screening answers, modelled on the PAR-Q+ general health questions.
 * Any `true` answer means we recommend medical clearance and switch the plan to a gentler mode.
 */
export interface HealthScreening {
  heartCondition: boolean;
  chestPain: boolean;
  dizzinessOrFainting: boolean;
  chronicCondition: boolean; // diagnosed condition other than heart disease / high BP (e.g. diabetes)
  medicationForChronicCondition: boolean;
  boneJointProblem: boolean;
  doctorSupervisedOnly: boolean;
  pregnant: boolean;
  kidneyDisease: boolean;
  eatingDisorderHistory: boolean;
}

export interface Profile {
  callsign: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  pace: Pace;
  targetWeightKg?: number;
  lifestyle: Lifestyle;
  experience: Experience;
  equipment: Equipment[];
  workoutDays: Weekday[];
  sessionMinutes: 20 | 30 | 45 | 60;
  diet: DietPreference;
  health: HealthScreening;
}

export const EMPTY_SCREENING: HealthScreening = {
  heartCondition: false,
  chestPain: false,
  dizzinessOrFainting: false,
  chronicCondition: false,
  medicationForChronicCondition: false,
  boneJointProblem: false,
  doctorSupervisedOnly: false,
  pregnant: false,
  kidneyDisease: false,
  eatingDisorderHistory: false,
};
