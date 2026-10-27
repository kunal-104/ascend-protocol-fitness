import { kcalPerServing, proteinPerServing, suggestFoods, TERMS, type FoodRole } from '@ascend/core';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/lib/store';
import { Chip, Divider, Panel, Row, Screen, T } from '@/ui/components';
import { colors, fonts, space } from '@/ui/theme';

const TIER_LABEL = { 1: '₹ Budget', 2: '₹₹ Moderate', 3: '₹₹₹ Premium' } as const;

export default function Provisions() {
  const u = useUser();
  const insets = useSafeAreaInsets();
  const n = u.nutrition;
  const [maxTier, setMaxTier] = useState<1 | 2 | 3>(3);
  const [role, setRole] = useState<FoodRole | undefined>('protein');
  const foods = suggestFoods(u.profile.diet, { maxTier, role, sortFor: u.profile.goal });

  const macro = (label: string, grams: number, kcalPerG: number) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T variant="number" style={{ fontSize: 24 }}>
        {grams}
        <T variant="caption"> g</T>
      </T>
      <T variant="label" style={{ fontSize: 11 }}>
        {label}
      </T>
      <T variant="caption">{Math.round(((grams * kcalPerG) / n.calories) * 100)}%</T>
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4), paddingBottom: space(10), gap: space(4) }}>
        <T variant="label">◆ {TERMS.foods}</T>

        <Panel tag="Daily targets">
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <T variant="caption">Calories</T>
              <T style={{ fontFamily: fonts.bold, fontSize: 44, lineHeight: 48 }}>{n.calories}</T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T variant="caption">Maintenance ≈ {n.maintenance}</T>
              <T variant="caption">
                {n.calories < n.maintenance ? `Deficit ${n.maintenance - n.calories}` : n.calories > n.maintenance ? `Surplus ${n.calories - n.maintenance}` : 'At maintenance'} kcal
              </T>
            </View>
          </Row>
          <Divider />
          <Row>
            {macro('Protein', n.proteinG, 4)}
            {macro('Carbs', n.carbsG, 4)}
            {macro('Fat', n.fatG, 9)}
          </Row>
          <Divider />
          <T variant="caption">
            Fibre ≥ {n.fiberG} g · Water ≈ {n.waterLitres} L from drinks (more on training days and in hot weather)
          </T>
          {n.warnings.map((w) => (
            <T key={w.code} variant="caption" style={{ color: colors.warning, marginTop: space(2) }}>
              ⚠ {w.message}
            </T>
          ))}
        </Panel>

        <Panel tag="Field rules">
          <View style={{ gap: space(2) }}>
            <T variant="caption">◇ Spread protein over 3–4 meals (about {Math.round(n.proteinG / 4)}–{Math.round(n.proteinG / 3)} g each).</T>
            <T variant="caption">◇ Fill half your plate with vegetables for fibre and micronutrients.</T>
            <T variant="caption">◇ Weigh food for the first two weeks — portions are easy to misjudge.</T>
            <T variant="caption">◇ Whole foods first. Supplements like whey are optional, never required.</T>
          </View>
        </Panel>

        <View style={{ gap: space(2) }}>
          <T variant="label">Budget</T>
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label="₹ only" selected={maxTier === 1} onPress={() => setMaxTier(1)} />
            <Chip label="Up to ₹₹" selected={maxTier === 2} onPress={() => setMaxTier(2)} />
            <Chip label="All" selected={maxTier === 3} onPress={() => setMaxTier(3)} />
          </Row>
          <T variant="label" style={{ marginTop: space(2) }}>
            Type
          </T>
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label="Protein" selected={role === 'protein'} onPress={() => setRole('protein')} />
            <Chip label="Protein + carbs" selected={role === 'mixed'} onPress={() => setRole('mixed')} />
            <Chip label="Carbs" selected={role === 'carb'} onPress={() => setRole('carb')} />
            <Chip label="Fats" selected={role === 'fat'} onPress={() => setRole('fat')} />
            <Chip label="All" selected={!role} onPress={() => setRole(undefined)} />
          </Row>
        </View>

        {foods.map((f) => (
          <Panel key={f.id} accent={colors.panelBorderDim} style={{ paddingVertical: space(3) }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: fonts.bold, fontSize: 17 }}>{f.name}</T>
                {f.localName ? <T variant="caption">{f.localName}</T> : null}
              </View>
              <T variant="caption" style={{ color: f.costTier === 1 ? colors.success : f.costTier === 2 ? colors.glow : colors.accent }}>
                {TIER_LABEL[f.costTier]}
              </T>
            </Row>
            <Row style={{ marginTop: space(2), gap: space(4) }}>
              <T style={{ color: colors.glow, fontFamily: fonts.bold }}>{proteinPerServing(f)} g protein</T>
              <T variant="caption">{kcalPerServing(f)} kcal</T>
              <T variant="caption" style={{ flex: 1, textAlign: 'right' }}>
                per {f.servingLabel}
              </T>
            </Row>
            <T variant="caption" style={{ marginTop: space(1) }}>
              Per 100 g: {f.per100g.kcal} kcal · P {f.per100g.proteinG} · C {f.per100g.carbsG} · F {f.per100g.fatG}
              {f.approximate ? ' · approx., check pack label' : ''}
            </T>
            {f.notes ? (
              <T variant="caption" style={{ marginTop: space(1), color: colors.textDim }}>
                {f.notes}
              </T>
            ) : null}
          </Panel>
        ))}

        <T variant="caption" style={{ textAlign: 'center' }}>
          Nutrient values: USDA FoodData Central, or typical product labels where marked. Prices are relative and vary by region.
        </T>
      </ScrollView>
    </Screen>
  );
}
