# Research basis

Every number the app shows comes from the sources below. The formulas are **population estimates** that are typically within about ±10–20 % for an individual, which is why the app re-calibrates from your real weight every 3 weeks. The app gives general information for healthy adults, not medical advice.

Code locations are given so each claim can be checked against the implementation.

## Energy (calories)

| What | Value used | Source | Code |
|---|---|---|---|
| Resting energy | Mifflin-St Jeor: `10·kg + 6.25·cm − 5·age + 5` (men) / `− 161` (women); the midpoint `− 78` if sex is not given | Mifflin MD, St Jeor ST et al. *Am J Clin Nutr* 1990;51:241–7. Found the most reliable of the common equations by Frankenfield D et al. *J Am Diet Assoc* 2005;105:775–89 | `packages/core/src/nutrition.ts` `bmrMifflin` |
| Activity multiplier | 1.2 / 1.375 / 1.55 / 1.725 / 1.9 by training days; an active or very active job moves one or two levels up | Standard activity-factor table used in exercise physiology and dietetics practice (e.g. McArdle, Katch & Katch, *Exercise Physiology*) | `activityMultiplier` |
| Energy per kg of weight change | 7700 kcal/kg, for planning only | Wishnofsky M. *Am J Clin Nutr* 1958;6:542–6. Hall KD et al. *Lancet* 2011;378:826–37 show it overestimates long-term loss, so the app re-calibrates instead of trusting it | `KCAL_PER_KG`, `estimateMaintenance` |
| Weight-loss pace | 0.5 / 0.75 / 1.0 % of body weight per week | Helms ER, Aragon AA, Fitschen PJ. *J Int Soc Sports Nutr* 2014;11:20 (slower loss preserves lean mass). CDC: gradual loss of ~0.5–1 kg/week is more likely to be kept off | `PACE_RATES` |
| Deficit cap | Never more than 25 % below maintenance | Conservative limit derived from the pace evidence above | `MAX_DEFICIT_FRACTION` |
| Calorie floor | 1500 kcal (men), 1200 kcal (women), 1350 kcal (unspecified); never above the person's own maintenance | Jensen MD et al. 2013 AHA/ACC/TOS obesity guideline, *Circulation* 2014;129:S102–38 (1200–1500 kcal women, 1500–1800 kcal men as the low end of standard diets) | `CALORIE_FLOOR` |
| Muscle-gain pace | 0.15 / 0.25 / 0.5 % of body weight per week | Iraki J, Fitschen P, Espinar S, Helms E. *Sports* 2019;7:154 (≈0.25–0.5 %/week for lean gains) | `PACE_RATES` |

## Macronutrients, fibre, water

| What | Value used | Source |
|---|---|---|
| Protein | 2.0 g/kg (weight loss), 1.8 g/kg (muscle gain), 1.4 g/kg (general fitness) | Jäger R et al. ISSN Position Stand, *J Int Soc Sports Nutr* 2017;14:20 (1.4–2.0 g/kg). Morton RW et al. *Br J Sports Med* 2018;52:376–84 (benefit plateaus ≈1.6 g/kg, upper CI 2.2). Helms 2014 (higher intakes during a deficit) |
| Protein reference weight above BMI 30 | Weight at BMI 27 | Common clinical practice, so targets stay realistic for people with obesity |
| Kidney disease | Protein capped at 0.8 g/kg and the user is told to consult their nephrologist | KDOQI Clinical Practice Guideline for Nutrition in CKD 2020 (lower intakes in CKD) |
| Fat | 25 % of calories | Within the 20–35 % range: IOM *Dietary Reference Intakes for Macronutrients* 2005 (AMDR) / *Dietary Guidelines for Americans 2020–2025* |
| Carbohydrate | The remaining calories | — |
| Fibre | 14 g per 1000 kcal | *Dietary Guidelines for Americans 2020–2025* |
| Water from drinks | 3.0 L (men), 2.2 L (women) | IOM *DRIs for Water* 2005: adequate total water 3.7 L / 2.7 L, of which ~80 % comes from drinks |

## Safety rules

| Rule | Source |
|---|---|
| WHO BMI categories (18.5 / 25 / 30). Weight loss is refused below BMI 18.5 and a target weight below BMI 18.5 is rejected | WHO |
| Under 18: maintenance calories only, no deficits | Golden NH et al. *Pediatrics* 2016;138:e20161649 (AAP: avoid dieting in adolescents) |
| Pregnancy or a history of eating disorders: no deficit targets | General clinical guidance; these users are directed to professionals |
| Health screening questions | Adapted from the PAR-Q+ (Warburton DER et al., PAR-Q+ Collaboration). Any "yes" → gentle plan and a medical-clearance notice |
| Check-in "too fast" warning: losing > 1 %/week or gaining > 0.5 %/week | Helms 2014; Iraki 2019 |
| Check-in recalibration: only with ≥ 14 days of data and "mostly followed calories", clamped to ±20 % of the formula | Prevents water-weight noise from producing bad targets |

## Training

| What | Value used | Source |
|---|---|---|
| Weekly activity | Strength work ≥ 2 days/week; steady cardio and steps toward 150 min/week of moderate activity | Bull FC et al. WHO 2020 guidelines, *Br J Sports Med* 2020;54:1451–62 |
| Frequency per muscle | Each muscle group ≥ 2×/week (full body, upper/lower or PPL splits) | Schoenfeld BJ, Ogborn D, Krieger JW. *Sports Med* 2016;46:1689–97 |
| Sets and reps | Novices 2 sets, intermediates 3, advanced 3–4. Reps 6–10 (heavy compounds for gaining), 8–12, 10–15 or 10–20 (bodyweight) | ACSM Position Stand, *Med Sci Sports Exerc* 2009;41:687–708 |
| Effort | Stop 1–3 reps before failure ("reps in reserve") | Helms ER et al. *Strength Cond J* 2016;38:42–9 |
| Progression | Double progression; deload every 6th week | ACSM 2009; standard coaching practice |
| Daily steps | 6000–8000 by goal, capped at 6000 in gentle mode | Paluch AE et al. *Lancet Public Health* 2022;7:e219–28 (mortality benefit levels off at ~6000–8000 steps for people over 60 and ~8000–10,000 for younger adults) |
| Rest | At least one non-training day; picking 7 days turns one into Recovery | General recovery guidance |
| Exercise cues | Condensed from the NSCA *Exercise Technique Manual* and the ACE exercise library | — |

## Food values

All values are per 100 g, from **USDA FoodData Central (SR Legacy)** unless the food is marked "approx. — check pack label". Label-based items (soya chunks, paneer, peanut butter, whey) vary by brand. A unit test checks every food's calories against its protein, fat and carbohydrate content (Atwater factors, ±15 %), to catch typos.

Food safety notes in the app:
- Kidney beans must be boiled hard (NHS / UK Food Standards Agency) because of phytohaemagglutinin.
- Limit tuna for mercury (FDA/EPA *Advice about Eating Fish*).
- Choose third-party-tested supplements.

Prices are shown only as relative tiers (₹ / ₹₹ / ₹₹₹), because real prices change by city and month.

## Before launch

Have a registered dietitian and a certified strength coach review `packages/core/src/nutrition.ts`, `foods.ts`, `exercises.ts` and `planner.ts`. The tests in `packages/core/test` pin the current behaviour, so any change they suggest will show up clearly in the diff.
