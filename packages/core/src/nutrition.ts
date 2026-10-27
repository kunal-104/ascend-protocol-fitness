import type { Goal, Lifestyle, Pace, Profile, Sex } from './types';

/**
 * Nutrition math. Every constant here is referenced in docs/RESEARCH.md.
 * These are population estimates: the 3-week check-in recalibrates them against real weight change.
 */

/** Approximate energy content of 1 kg of body-weight change (Wishnofsky rule, used for planning only). */
export const KCAL_PER_KG = 7700;

/** Minimum daily intake we will ever recommend without medical supervision. */
export const CALORIE_FLOOR: Record<Sex, number> = { male: 1500, female: 1200, unspecified: 1350 };

/** Largest deficit we allow, as a fraction of maintenance calories. */
export const MAX_DEFICIT_FRACTION = 0.25;

/** Weekly rate of change as a fraction of body weight, per goal and pace. */
export const PACE_RATES: Record<Exclude<Goal, 'stay_fit'>, Record<Pace, number>> = {
  // 0.5–1.0 %/week loss preserves lean mass better than faster rates (Helms et al. 2014).
  lose_weight: { steady: 0.005, standard: 0.0075, fast: 0.01 },
  // Lean-gain guidance: ~0.25–0.5 %/week; faster mostly adds fat (Iraki et al. 2019).
  gain_muscle: { steady: 0.0015, standard: 0.0025, fast: 0.005 },
};

/** Protein in g per kg of reference body weight (ISSN 2017; Morton et al. 2018; Helms et al. 2014). */
export const PROTEIN_G_PER_KG: Record<Goal, number> = {
  lose_weight: 2.0,
  gain_muscle: 1.8,
  stay_fit: 1.4,
};

/** Share of calories from fat. Within the 20–35 % range of the Dietary Guidelines / NASEM AMDR. */
export const FAT_FRACTION = 0.25;

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';

/** WHO adult BMI categories. */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'healthy';
  if (value < 30) return 'overweight';
  return 'obese';
}

export function weightAtBmi(targetBmi: number, heightCm: number): number {
  const m = heightCm / 100;
  return targetBmi * m * m;
}

/** Mifflin-St Jeor resting energy expenditure (kcal/day). */
export function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78; // midpoint of the two sex constants
}

const ACTIVITY_LEVELS = [1.2, 1.375, 1.55, 1.725, 1.9] as const;

/**
 * Activity multiplier from the classic table: sedentary 1.2, light exercise 1–3 d/wk 1.375,
 * moderate 3–5 d/wk 1.55, hard 6–7 d/wk 1.725, very hard / physical job 1.9.
 * A physically active job moves the user up one level, a very active job two.
 */
export function activityMultiplier(workoutDaysPerWeek: number, lifestyle: Lifestyle): number {
  let level = workoutDaysPerWeek <= 0 ? 0 : workoutDaysPerWeek <= 3 ? 1 : workoutDaysPerWeek <= 5 ? 2 : 3;
  if (lifestyle === 'active') level += 1;
  if (lifestyle === 'very_active') level += 2;
  return ACTIVITY_LEVELS[Math.min(level, ACTIVITY_LEVELS.length - 1)]!;
}

export interface NutritionWarning {
  code:
    | 'calorie_floor'
    | 'deficit_capped'
    | 'underweight_loss_blocked'
    | 'minor'
    | 'pregnancy'
    | 'kidney'
    | 'eating_disorder'
    | 'obese_reference_weight';
  message: string;
}

export interface NutritionTargets {
  bmr: number;
  maintenance: number;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  waterLitres: number;
  /** Expected weekly weight change in kg (negative = loss) at the final calorie target. */
  expectedWeeklyChangeKg: number;
  /** Rough number of weeks to reach the target weight, if one was given and is in the goal's direction. */
  weeksToTarget?: number;
  bmi: number;
  bmiCategory: BmiCategory;
  warnings: NutritionWarning[];
}

const round = (n: number, step = 1) => Math.round(n / step) * step;

/**
 * Optional calibration from check-ins: the observed maintenance (kcal/day) replaces the formula estimate
 * once we have real weight data.
 */
export interface Calibration {
  maintenanceOverride?: number;
}

export function computeNutrition(p: Profile, cal: Calibration = {}): NutritionTargets {
  const warnings: NutritionWarning[] = [];
  const bmiValue = bmi(p.weightKg, p.heightCm);
  const category = bmiCategory(bmiValue);
  const bmr = bmrMifflin(p.sex, p.weightKg, p.heightCm, p.age);
  const formulaMaintenance = bmr * activityMultiplier(p.workoutDays.length, p.lifestyle);
  const maintenance = cal.maintenanceOverride ?? formulaMaintenance;

  let goal: Goal = p.goal;
  let pace: Pace = p.pace;

  if (goal === 'lose_weight' && category === 'underweight') {
    goal = 'stay_fit';
    warnings.push({
      code: 'underweight_loss_blocked',
      message:
        'Your BMI is below 18.5, so the Protocol will not set a weight-loss target. Calories are set to maintenance. Please talk to a doctor before trying to lose weight.',
    });
  }
  if (p.health.pregnant && goal !== 'stay_fit') {
    goal = 'stay_fit';
    warnings.push({
      code: 'pregnancy',
      message:
        'During pregnancy the Protocol does not set weight-loss or weight-gain targets. Follow your doctor or midwife on calories and exercise.',
    });
  }
  if (p.health.eatingDisorderHistory && goal === 'lose_weight') {
    goal = 'stay_fit';
    warnings.push({
      code: 'eating_disorder',
      message:
        'Because you reported a history of disordered eating, calorie-deficit targets are turned off. A registered dietitian can build a plan that is safe for you.',
    });
  }
  if (p.age < 18) {
    pace = 'steady';
    if (goal === 'lose_weight') goal = 'stay_fit';
    warnings.push({
      code: 'minor',
      message:
        'Under 18 you are still growing, so the Protocol keeps calories at maintenance and focuses on training habits. Ask a doctor before dieting.',
    });
  }

  let calories = maintenance;
  if (goal !== 'stay_fit') {
    const weeklyKg = PACE_RATES[goal][pace] * p.weightKg;
    const dailyDelta = (weeklyKg * KCAL_PER_KG) / 7;
    if (goal === 'lose_weight') {
      const maxDeficit = maintenance * MAX_DEFICIT_FRACTION;
      if (dailyDelta > maxDeficit) {
        warnings.push({
          code: 'deficit_capped',
          message: `Deficit capped at ${Math.round(MAX_DEFICIT_FRACTION * 100)}% below maintenance to protect muscle and energy levels.`,
        });
      }
      calories = maintenance - Math.min(dailyDelta, maxDeficit);
    } else {
      calories = maintenance + dailyDelta;
    }
  }

  const floor = CALORIE_FLOOR[p.sex];
  if (calories < floor) {
    // Never push someone above their own maintenance just to reach the floor.
    calories = Math.min(floor, maintenance);
    warnings.push({
      code: 'calorie_floor',
      message: `Calories were raised to ${Math.round(calories)} kcal: the Protocol never recommends going below ${floor} kcal without medical supervision.`,
    });
  }

  // Protein is dosed on a reference weight so that people with obesity don't get unrealistic targets.
  let refWeight = p.weightKg;
  if (bmiValue > 30) {
    refWeight = weightAtBmi(27, p.heightCm);
    warnings.push({
      code: 'obese_reference_weight',
      message: 'Protein is calculated from a reference body weight (BMI 27) rather than your current weight.',
    });
  }
  let proteinG = refWeight * PROTEIN_G_PER_KG[goal];
  if (p.health.kidneyDisease) {
    proteinG = refWeight * 0.8;
    warnings.push({
      code: 'kidney',
      message:
        'You reported kidney disease. Protein is set to the general RDA (0.8 g/kg). Your nephrologist or dietitian should confirm this.',
    });
  }

  const fatG = (calories * FAT_FRACTION) / 9;
  const carbsG = Math.max(0, (calories - proteinG * 4 - fatG * 9) / 4);

  const expectedWeeklyChangeKg = ((calories - maintenance) * 7) / KCAL_PER_KG;
  let weeksToTarget: number | undefined;
  if (p.targetWeightKg && Math.abs(expectedWeeklyChangeKg) > 0.01) {
    const diff = p.targetWeightKg - p.weightKg;
    if (Math.sign(diff) === Math.sign(expectedWeeklyChangeKg)) {
      weeksToTarget = Math.ceil(Math.abs(diff / expectedWeeklyChangeKg));
    }
  }

  return {
    bmr: round(bmr),
    maintenance: round(maintenance, 10),
    calories: round(calories, 10),
    proteinG: round(proteinG, 5),
    fatG: round(fatG),
    carbsG: round(carbsG),
    // 14 g fibre per 1000 kcal (Dietary Guidelines for Americans 2020–2025).
    fiberG: round((calories / 1000) * 14),
    // NASEM adequate intake of total water: 3.7 L men / 2.7 L women, about 80% of it from drinks.
    waterLitres: p.sex === 'female' ? 2.2 : p.sex === 'male' ? 3.0 : 2.6,
    expectedWeeklyChangeKg: Math.round(expectedWeeklyChangeKg * 100) / 100,
    weeksToTarget,
    bmi: Math.round(bmiValue * 10) / 10,
    bmiCategory: category,
    warnings,
  };
}

/**
 * Estimate real maintenance calories from what the user ate and how their weight moved.
 * avgIntake: average daily calories eaten over the window; weightChangeKg: end − start; days: window length.
 */
export function estimateMaintenance(avgIntake: number, weightChangeKg: number, days: number): number {
  if (days <= 0) return avgIntake;
  return avgIntake - (weightChangeKg * KCAL_PER_KG) / days;
}
