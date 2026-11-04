import type { DietPreference } from './types';

/**
 * "Provisions" — food suggestions ordered from cheap to premium.
 *
 * Values are per 100 g of the food as described (dry/raw/cooked is stated in the name).
 * Source "USDA" = USDA FoodData Central (SR Legacy). Source "label" = typical packaged-product label:
 * those vary by brand, are marked approximate, and the app tells users to check their pack.
 *
 * costTier is relative cost per gram of protein in typical Indian retail (1 = budget, 2 = moderate,
 * 3 = premium). Exact prices change by city and month, so the app never shows exact prices.
 */
export type FoodDiet = 'vegan' | 'vegetarian' | 'egg' | 'non_vegetarian';
export type FoodRole = 'protein' | 'carb' | 'fat' | 'mixed';

export interface Food {
  id: string;
  name: string;
  localName?: string;
  per100g: { kcal: number; proteinG: number; fatG: number; carbsG: number; fiberG?: number };
  servingG: number;
  servingLabel: string;
  costTier: 1 | 2 | 3;
  diet: FoodDiet;
  role: FoodRole;
  source: 'USDA' | 'label';
  approximate?: boolean;
  notes?: string;
}

export const FOODS: Food[] = [
  {
    id: 'soya_chunks',
    name: 'Soya chunks (dry)',
    localName: 'Soya badi / Nutrela',
    per100g: { kcal: 345, proteinG: 52, fatG: 0.5, carbsG: 33, fiberG: 13 },
    servingG: 50,
    servingLabel: '50 g dry (~1 cup cooked)',
    costTier: 1,
    diet: 'vegan',
    role: 'protein',
    source: 'label',
    approximate: true,
    notes: 'Weigh dry. Boil 5–10 min, squeeze out water, then cook. One of the cheapest protein sources available.',
  },
  {
    id: 'peanuts',
    name: 'Peanuts (raw)',
    localName: 'Moongphali',
    per100g: { kcal: 567, proteinG: 25.8, fatG: 49.2, carbsG: 16.1, fiberG: 8.5 },
    servingG: 30,
    servingLabel: '30 g (a small handful)',
    costTier: 1,
    diet: 'vegan',
    role: 'fat',
    source: 'USDA',
    notes: 'Calorie-dense: great for gaining, measure carefully when losing. Common allergen.',
  },
  {
    id: 'soybeans_dry',
    name: 'Soybeans (dry)',
    per100g: { kcal: 446, proteinG: 36.5, fatG: 19.9, carbsG: 30.2, fiberG: 9.3 },
    servingG: 50,
    servingLabel: '50 g dry',
    costTier: 1,
    diet: 'vegan',
    role: 'protein',
    source: 'USDA',
    notes: 'Soak overnight and pressure-cook.',
  },
  {
    id: 'eggs',
    name: 'Eggs (whole)',
    localName: 'Anda',
    per100g: { kcal: 143, proteinG: 12.6, fatG: 9.5, carbsG: 0.7 },
    servingG: 100,
    servingLabel: '2 large eggs (~100 g)',
    costTier: 1,
    diet: 'egg',
    role: 'protein',
    source: 'USDA',
    notes: 'Cook fully. A large egg (~50 g) has about 6 g protein.',
  },
  {
    id: 'lentils_dry',
    name: 'Lentils (dry)',
    localName: 'Masoor / dal',
    per100g: { kcal: 352, proteinG: 24.6, fatG: 1.1, carbsG: 63.4, fiberG: 10.7 },
    servingG: 50,
    servingLabel: '50 g dry (~1 bowl cooked dal)',
    costTier: 1,
    diet: 'vegan',
    role: 'mixed',
    source: 'USDA',
    notes: 'Pairs well with rice or roti for a more complete amino-acid profile.',
  },
  {
    id: 'moong_dry',
    name: 'Mung beans (dry)',
    localName: 'Moong',
    per100g: { kcal: 347, proteinG: 23.9, fatG: 1.2, carbsG: 62.6, fiberG: 16.3 },
    servingG: 50,
    servingLabel: '50 g dry (or sprouted)',
    costTier: 1,
    diet: 'vegan',
    role: 'mixed',
    source: 'USDA',
  },
  {
    id: 'chickpeas_dry',
    name: 'Chickpeas (dry)',
    localName: 'Chana / kabuli chana',
    per100g: { kcal: 378, proteinG: 20.5, fatG: 6.0, carbsG: 63.0, fiberG: 12.2 },
    servingG: 50,
    servingLabel: '50 g dry',
    costTier: 1,
    diet: 'vegan',
    role: 'mixed',
    source: 'USDA',
    notes: 'Soak overnight and boil until soft.',
  },
  {
    id: 'kidney_beans_dry',
    name: 'Red kidney beans (dry)',
    localName: 'Rajma',
    per100g: { kcal: 337, proteinG: 22.5, fatG: 1.1, carbsG: 61.3, fiberG: 15.2 },
    servingG: 50,
    servingLabel: '50 g dry',
    costTier: 1,
    diet: 'vegan',
    role: 'mixed',
    source: 'USDA',
    notes: 'Never eat raw or undercooked: soak, then boil hard for at least 10 minutes (pressure-cooking is fine).',
  },
  {
    id: 'milk_whole',
    name: 'Milk (whole)',
    localName: 'Doodh',
    per100g: { kcal: 61, proteinG: 3.2, fatG: 3.3, carbsG: 4.8 },
    servingG: 250,
    servingLabel: '1 glass (250 ml)',
    costTier: 1,
    diet: 'vegetarian',
    role: 'mixed',
    source: 'USDA',
  },
  {
    id: 'curd',
    name: 'Curd / plain yogurt (whole milk)',
    localName: 'Dahi',
    per100g: { kcal: 61, proteinG: 3.5, fatG: 3.3, carbsG: 4.7 },
    servingG: 200,
    servingLabel: '1 bowl (200 g)',
    costTier: 1,
    diet: 'vegetarian',
    role: 'mixed',
    source: 'USDA',
  },
  {
    id: 'oats',
    name: 'Rolled oats (dry)',
    per100g: { kcal: 379, proteinG: 13.2, fatG: 6.5, carbsG: 67.7, fiberG: 10.1 },
    servingG: 40,
    servingLabel: '40 g dry',
    costTier: 1,
    diet: 'vegan',
    role: 'carb',
    source: 'USDA',
  },
  {
    id: 'atta',
    name: 'Whole-wheat flour',
    localName: 'Atta (≈ 2 rotis per 60 g)',
    per100g: { kcal: 340, proteinG: 13.2, fatG: 2.5, carbsG: 72.0, fiberG: 10.7 },
    servingG: 60,
    servingLabel: '60 g flour (~2 rotis)',
    costTier: 1,
    diet: 'vegan',
    role: 'carb',
    source: 'USDA',
  },
  {
    id: 'rice_cooked',
    name: 'White rice (cooked)',
    localName: 'Chawal',
    per100g: { kcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28.2, fiberG: 0.4 },
    servingG: 150,
    servingLabel: '1 cup cooked (150 g)',
    costTier: 1,
    diet: 'vegan',
    role: 'carb',
    source: 'USDA',
  },
  {
    id: 'potato_boiled',
    name: 'Potato (boiled)',
    localName: 'Aloo',
    per100g: { kcal: 87, proteinG: 1.9, fatG: 0.1, carbsG: 20.1, fiberG: 1.8 },
    servingG: 150,
    servingLabel: '1 medium (150 g)',
    costTier: 1,
    diet: 'vegan',
    role: 'carb',
    source: 'USDA',
  },
  {
    id: 'banana',
    name: 'Banana',
    localName: 'Kela',
    per100g: { kcal: 89, proteinG: 1.1, fatG: 0.3, carbsG: 22.8, fiberG: 2.6 },
    servingG: 120,
    servingLabel: '1 medium (~120 g peeled)',
    costTier: 1,
    diet: 'vegan',
    role: 'carb',
    source: 'USDA',
    notes: 'Good pre-workout fuel.',
  },
  {
    id: 'paneer',
    name: 'Paneer (full-fat)',
    per100g: { kcal: 265, proteinG: 18, fatG: 20, carbsG: 3 },
    servingG: 100,
    servingLabel: '100 g',
    costTier: 2,
    diet: 'vegetarian',
    role: 'protein',
    source: 'label',
    approximate: true,
    notes: 'Fat content varies a lot by brand; low-fat paneer has more protein per calorie. Check the pack.',
  },
  {
    id: 'tofu_firm',
    name: 'Tofu (firm)',
    per100g: { kcal: 144, proteinG: 17.3, fatG: 8.7, carbsG: 2.8, fiberG: 2.3 },
    servingG: 100,
    servingLabel: '100 g',
    costTier: 2,
    diet: 'vegan',
    role: 'protein',
    source: 'USDA',
  },
  {
    id: 'egg_whites',
    name: 'Egg whites',
    per100g: { kcal: 52, proteinG: 10.9, fatG: 0.2, carbsG: 0.7 },
    servingG: 132,
    servingLabel: '4 egg whites (~132 g)',
    costTier: 2,
    diet: 'egg',
    role: 'protein',
    source: 'USDA',
    notes: 'Very lean. Cook fully.',
  },
  {
    id: 'chicken_breast',
    name: 'Chicken breast (cooked, skinless)',
    per100g: { kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0 },
    servingG: 120,
    servingLabel: '120 g cooked',
    costTier: 2,
    diet: 'non_vegetarian',
    role: 'protein',
    source: 'USDA',
    notes: 'Weigh after cooking. Raw breast loses roughly a quarter of its weight when cooked.',
  },
  {
    id: 'sardines',
    name: 'Sardines (canned in oil, drained)',
    per100g: { kcal: 208, proteinG: 24.6, fatG: 11.5, carbsG: 0 },
    servingG: 90,
    servingLabel: '1 small can (~90 g drained)',
    costTier: 2,
    diet: 'non_vegetarian',
    role: 'protein',
    source: 'USDA',
    notes: 'Also rich in omega-3 fats and calcium (edible bones).',
  },
  {
    id: 'peanut_butter',
    name: 'Peanut butter (unsweetened)',
    per100g: { kcal: 588, proteinG: 25, fatG: 50, carbsG: 20 },
    servingG: 32,
    servingLabel: '2 tbsp (32 g)',
    costTier: 2,
    diet: 'vegan',
    role: 'fat',
    source: 'label',
    approximate: true,
    notes: 'Easy calories for gaining. Pick one with only peanuts (and salt) in the ingredients.',
  },
  {
    id: 'tuna_canned',
    name: 'Tuna (canned in water, drained)',
    per100g: { kcal: 116, proteinG: 25.5, fatG: 0.8, carbsG: 0 },
    servingG: 100,
    servingLabel: '1 can drained (~100 g)',
    costTier: 3,
    diet: 'non_vegetarian',
    role: 'protein',
    source: 'USDA',
    notes: 'Limit to a few cans a week because of mercury; prefer light/skipjack tuna.',
  },
  {
    id: 'greek_yogurt',
    name: 'Greek yogurt (plain, non-fat)',
    per100g: { kcal: 59, proteinG: 10.2, fatG: 0.4, carbsG: 3.6 },
    servingG: 170,
    servingLabel: '1 cup (170 g)',
    costTier: 3,
    diet: 'vegetarian',
    role: 'protein',
    source: 'USDA',
    notes: 'Home-made hung curd is a cheaper alternative with similar protein density.',
  },
  {
    id: 'almonds',
    name: 'Almonds',
    localName: 'Badam',
    per100g: { kcal: 579, proteinG: 21.2, fatG: 49.9, carbsG: 21.6, fiberG: 12.5 },
    servingG: 28,
    servingLabel: '28 g (~23 almonds)',
    costTier: 3,
    diet: 'vegan',
    role: 'fat',
    source: 'USDA',
  },
  {
    id: 'whey',
    name: 'Whey protein (concentrate)',
    per100g: { kcal: 380, proteinG: 75, fatG: 6, carbsG: 8 },
    servingG: 30,
    servingLabel: '1 scoop (~30 g)',
    costTier: 3,
    diet: 'vegetarian',
    role: 'protein',
    source: 'label',
    approximate: true,
    notes:
      'Optional — not required to build muscle. Values vary by brand; choose products with third-party testing (e.g. Informed Choice / NSF), as supplements are loosely regulated and sometimes mislabelled.',
  },
];

export function foodAllowed(food: Food, diet: DietPreference): boolean {
  switch (diet) {
    case 'vegan':
      return food.diet === 'vegan';
    case 'vegetarian':
      return food.diet === 'vegan' || food.diet === 'vegetarian';
    case 'eggetarian':
      return food.diet !== 'non_vegetarian';
    case 'non_vegetarian':
      return true;
  }
}

export function proteinPerServing(food: Food): number {
  return Math.round((food.per100g.proteinG * food.servingG) / 10) / 10;
}

export function kcalPerServing(food: Food): number {
  return Math.round((food.per100g.kcal * food.servingG) / 100);
}

/** Grams of protein per 100 kcal — higher = leaner source. */
export function proteinDensity(food: Food): number {
  return Math.round((food.per100g.proteinG / food.per100g.kcal) * 1000) / 10;
}

/**
 * Foods for a diet, cheapest tier first, then by protein density (best protein per calorie when losing)
 * or by calories per serving (easiest calories when gaining).
 */
export function suggestFoods(
  diet: DietPreference,
  opts: { maxTier?: 1 | 2 | 3; role?: FoodRole; sortFor?: 'lose_weight' | 'gain_muscle' | 'stay_fit' } = {},
): Food[] {
  const { maxTier = 3, role, sortFor = 'stay_fit' } = opts;
  return FOODS.filter((f) => foodAllowed(f, diet) && f.costTier <= maxTier && (!role || f.role === role)).sort(
    (a, b) => {
      if (a.costTier !== b.costTier) return a.costTier - b.costTier;
      if (sortFor === 'gain_muscle') return kcalPerServing(b) - kcalPerServing(a);
      return proteinDensity(b) - proteinDensity(a);
    },
  );
}
