import { z } from 'zod';
import type { Weekday } from './types';

/** Minimum age to use the app. Under-18 users get maintenance-only nutrition (see nutrition.ts). */
export const MIN_AGE = 16;

export const healthScreeningSchema = z.object({
  heartCondition: z.boolean(),
  chestPain: z.boolean(),
  dizzinessOrFainting: z.boolean(),
  chronicCondition: z.boolean(),
  medicationForChronicCondition: z.boolean(),
  boneJointProblem: z.boolean(),
  doctorSupervisedOnly: z.boolean(),
  pregnant: z.boolean(),
  kidneyDisease: z.boolean(),
  eatingDisorderHistory: z.boolean(),
});

export const profileSchema = z.object({
  callsign: z.string().trim().min(1).max(24),
  sex: z.enum(['male', 'female', 'unspecified']),
  age: z.number().int().min(MIN_AGE).max(100),
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(30).max(300),
  goal: z.enum(['lose_weight', 'gain_muscle', 'stay_fit']),
  pace: z.enum(['steady', 'standard', 'fast']),
  targetWeightKg: z.number().min(30).max(300).optional(),
  lifestyle: z.enum(['sedentary', 'light', 'active', 'very_active']),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  equipment: z
    .array(z.enum(['none', 'dumbbells', 'resistance_bands', 'pullup_bar', 'bench', 'barbell', 'cable_machine', 'machines', 'cardio_machine']))
    .max(9),
  workoutDays: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(6)
        .transform((n) => n as Weekday),
    )
    .min(1)
    .max(7)
    .refine((d) => new Set(d).size === d.length, 'Duplicate days'),
  sessionMinutes: z.union([z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
  diet: z.enum(['vegetarian', 'eggetarian', 'non_vegetarian', 'vegan']),
  health: healthScreeningSchema,
});

export type ProfileInput = z.infer<typeof profileSchema>;
