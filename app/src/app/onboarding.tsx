import {
  bmi,
  EMPTY_SCREENING,
  MIN_AGE,
  PACE_RATES,
  profileSchema,
  type DietPreference,
  type Equipment,
  type Experience,
  type Goal,
  type HealthScreening,
  type Lifestyle,
  type Pace,
  type Profile,
  type Sex,
  type Weekday,
} from '@ascend/core';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '@/lib/api';
import { setUser, useStore } from '@/lib/store';
import type { UserState } from '@/lib/types';
import { Bar, Button, Chip, Input, Option, Panel, Row, Screen, T } from '@/ui/components';
import { colors, fonts, space } from '@/ui/theme';

type Draft = Partial<Omit<Profile, 'health'>> & { health: HealthScreening };
type Units = 'metric' | 'imperial';

const WEEK: { day: Weekday; label: string }[] = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

const EQUIPMENT: { id: Equipment; label: string }[] = [
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'resistance_bands', label: 'Resistance bands' },
  { id: 'pullup_bar', label: 'Pull-up bar' },
  { id: 'bench', label: 'Bench' },
  { id: 'barbell', label: 'Barbell + rack' },
  { id: 'cable_machine', label: 'Cable machine' },
  { id: 'machines', label: 'Gym machines' },
  { id: 'cardio_machine', label: 'Treadmill / bike' },
];

const SCREENING: { key: keyof HealthScreening; q: string }[] = [
  { key: 'heartCondition', q: 'Has a doctor ever said you have a heart condition or high blood pressure?' },
  { key: 'chestPain', q: 'Do you feel pain in your chest at rest, during daily activities, or when exercising?' },
  { key: 'dizzinessOrFainting', q: 'Have you lost balance from dizziness or lost consciousness in the last 12 months?' },
  { key: 'chronicCondition', q: 'Have you been diagnosed with another chronic condition (e.g. diabetes, asthma)?' },
  { key: 'medicationForChronicCondition', q: 'Do you currently take prescribed medication for a chronic condition?' },
  { key: 'boneJointProblem', q: 'Do you have a bone, joint or soft-tissue problem that could get worse with exercise?' },
  { key: 'doctorSupervisedOnly', q: 'Has a doctor said you should only do medically supervised exercise?' },
  { key: 'pregnant', q: 'Are you pregnant or have you given birth in the last 6 months?' },
  { key: 'kidneyDisease', q: 'Do you have kidney disease?' },
  { key: 'eatingDisorderHistory', q: 'Do you have a current or past eating disorder?' },
];

const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return s.trim() === '' || Number.isNaN(n) ? undefined : n;
};

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const me = useStore((s) => s.me);
  const existing = me?.onboarded ? me.profile : undefined;
  const editing = !!existing;

  const [d, setD] = useState<Draft>(existing ?? { health: { ...EMPTY_SCREENING }, equipment: [], workoutDays: [] });
  const [units, setUnits] = useState<Units>('metric');
  const [heightText, setHeightText] = useState(existing ? String(existing.heightCm) : '');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [weightText, setWeightText] = useState(existing ? String(existing.weightKg) : '');
  const [targetText, setTargetText] = useState(existing?.targetWeightKg ? String(existing.targetWeightKg) : '');
  const [ageText, setAgeText] = useState(existing ? String(existing.age) : '');
  const [consent, setConsent] = useState(editing);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }));
  const lbToKg = (lb: number) => Math.round(lb * 0.45359237 * 10) / 10;
  const toKg = (s: string) => {
    const n = num(s);
    return n === undefined ? undefined : units === 'metric' ? n : lbToKg(n);
  };
  const heightCm = units === 'metric' ? num(heightText) : (() => {
    const f = num(feet);
    const i = num(inches) ?? 0;
    return f === undefined ? undefined : Math.round((f * 12 + i) * 2.54);
  })();
  const weightKg = toKg(weightText);

  // Validators also commit parsed text fields (age, height, weight) into the draft.
  const steps: { title: string; prompt: string; body: ReactNode; validate?: () => string | null }[] = [];

  steps.push({
    title: 'Designation',
    prompt: 'What should the Protocol call you?',
    body: <Input value={d.callsign ?? ''} onChangeText={(callsign) => update({ callsign })} placeholder="Your name or callsign" maxLength={24} autoFocus />,
    validate: () => (d.callsign?.trim() ? null : 'Enter a name.'),
  });

  steps.push({
    title: 'Biology',
    prompt: 'Calorie formulas differ by sex. Choose what best matches your body.',
    body: (
      <View style={{ gap: space(3) }}>
        {(['male', 'female', 'unspecified'] as Sex[]).map((s) => (
          <Option key={s} title={s === 'unspecified' ? 'Prefer not to say' : s[0]!.toUpperCase() + s.slice(1)} desc={s === 'unspecified' ? 'We use an average of both formulas.' : undefined} selected={d.sex === s} onPress={() => update({ sex: s })} />
        ))}
        <Input label="Age" value={ageText} onChangeText={setAgeText} keyboardType="number-pad" placeholder="e.g. 24" maxLength={3} />
      </View>
    ),
    validate: () => {
      if (!d.sex) return 'Choose an option.';
      const age = num(ageText);
      if (age === undefined || !Number.isInteger(age)) return 'Enter your age in whole years.';
      if (age < MIN_AGE) return `The Protocol is for people aged ${MIN_AGE} and over.`;
      if (age > 100) return 'Enter a valid age.';
      update({ age });
      return null;
    },
  });

  steps.push({
    title: 'Measurements',
    prompt: 'Your current height and weight.',
    body: (
      <View style={{ gap: space(4) }}>
        <Row>
          <Chip label="cm / kg" selected={units === 'metric'} onPress={() => setUnits('metric')} />
          <Chip label="ft / lb" selected={units === 'imperial'} onPress={() => setUnits('imperial')} />
        </Row>
        {units === 'metric' ? (
          <Input label="Height (cm)" value={heightText} onChangeText={setHeightText} keyboardType="decimal-pad" placeholder="e.g. 172" />
        ) : (
          <Row>
            <View style={{ flex: 1 }}>
              <Input label="Feet" value={feet} onChangeText={setFeet} keyboardType="number-pad" placeholder="5" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Inches" value={inches} onChangeText={setInches} keyboardType="number-pad" placeholder="8" />
            </View>
          </Row>
        )}
        <Input label={`Weight (${units === 'metric' ? 'kg' : 'lb'})`} value={weightText} onChangeText={setWeightText} keyboardType="decimal-pad" placeholder={units === 'metric' ? 'e.g. 70' : 'e.g. 155'} />
        {heightCm && weightKg ? <T variant="caption">BMI {bmi(weightKg, heightCm).toFixed(1)} — a rough screening number, not a diagnosis.</T> : null}
      </View>
    ),
    validate: () => {
      if (!heightCm || heightCm < 120 || heightCm > 230) return 'Enter a height between 120 and 230 cm.';
      if (!weightKg || weightKg < 30 || weightKg > 300) return 'Enter a weight between 30 and 300 kg.';
      update({ heightCm, weightKg });
      return null;
    },
  });

  steps.push({
    title: 'Daily life',
    prompt: 'Outside of workouts, how active is your typical day?',
    body: (
      <View style={{ gap: space(3) }}>
        {(
          [
            ['sedentary', 'Mostly sitting', 'Desk job, study, little walking'],
            ['light', 'Lightly active', 'On your feet some of the day'],
            ['active', 'Active', 'Walking or standing most of the day'],
            ['very_active', 'Very active', 'Physical labour'],
          ] as [Lifestyle, string, string][]
        ).map(([id, title, desc]) => (
          <Option key={id} title={title} desc={desc} selected={d.lifestyle === id} onPress={() => update({ lifestyle: id })} />
        ))}
      </View>
    ),
    validate: () => (d.lifestyle ? null : 'Choose an option.'),
  });

  steps.push({
    title: 'Objective',
    prompt: 'What do you want the Protocol to achieve?',
    body: (
      <View style={{ gap: space(3) }}>
        {(
          [
            ['lose_weight', 'Lose weight', 'Burn fat while keeping your muscle'],
            ['gain_muscle', 'Gain weight & muscle', 'Build size and strength'],
            ['stay_fit', 'Get fit & stay healthy', 'Regular exercise, keep your weight steady'],
          ] as [Goal, string, string][]
        ).map(([id, title, desc]) => (
          <Option key={id} title={title} desc={desc} selected={d.goal === id} onPress={() => update({ goal: id, pace: d.pace ?? 'standard' })} />
        ))}
      </View>
    ),
    validate: () => (d.goal ? null : 'Choose an objective.'),
  });

  if (d.goal && d.goal !== 'stay_fit') {
    const goal = d.goal;
    const w = weightKg ?? 70;
    steps.push({
      title: 'Pace',
      prompt: goal === 'lose_weight' ? 'How fast do you want to lose weight?' : 'How fast do you want to gain?',
      body: (
        <View style={{ gap: space(3) }}>
          {(['steady', 'standard', 'fast'] as Pace[]).map((p) => {
            const kg = PACE_RATES[goal][p] * w;
            const label = { steady: 'Steady', standard: 'Standard', fast: 'Fast' }[p];
            const desc =
              goal === 'lose_weight'
                ? { steady: 'Easiest to sustain, best for keeping muscle', standard: 'Recommended balance', fast: 'Harder; capped at safe limits' }[p]
                : { steady: 'Leanest gains, slowest', standard: 'Recommended for most people', fast: 'Faster, but more fat gain' }[p];
            return <Option key={p} title={`${label} · ~${kg.toFixed(2)} kg/week`} desc={desc} selected={d.pace === p} onPress={() => update({ pace: p })} />;
          })}
          <Input
            label={`Target weight (${units === 'metric' ? 'kg' : 'lb'}, optional)`}
            value={targetText}
            onChangeText={setTargetText}
            keyboardType="decimal-pad"
            placeholder="Leave empty if unsure"
          />
        </View>
      ),
      validate: () => {
        if (!d.pace) return 'Choose a pace.';
        if (targetText.trim()) {
          const t = toKg(targetText);
          if (!t || t < 30 || t > 300) return 'Enter a valid target weight.';
          if (heightCm && goal === 'lose_weight' && bmi(t, heightCm) < 18.5) return 'That target is below a healthy BMI (18.5). Choose a higher target.';
          if (weightKg && goal === 'lose_weight' && t >= weightKg) return 'For weight loss the target must be below your current weight.';
          if (weightKg && goal === 'gain_muscle' && t <= weightKg) return 'For gaining the target must be above your current weight.';
          update({ targetWeightKg: t });
        } else update({ targetWeightKg: undefined });
        return null;
      },
    });
  }

  steps.push({
    title: 'Experience',
    prompt: 'How much strength training have you done?',
    body: (
      <View style={{ gap: space(3) }}>
        {(
          [
            ['beginner', 'Beginner', 'New, or less than 6 months of regular training'],
            ['intermediate', 'Intermediate', '6 months to 2 years, comfortable with the basic lifts'],
            ['advanced', 'Advanced', '2+ years of consistent training'],
          ] as [Experience, string, string][]
        ).map(([id, title, desc]) => (
          <Option key={id} title={title} desc={desc} selected={d.experience === id} onPress={() => update({ experience: id })} />
        ))}
      </View>
    ),
    validate: () => (d.experience ? null : 'Choose an option.'),
  });

  const owned = d.equipment ?? [];
  steps.push({
    title: 'Arsenal',
    prompt: 'What equipment can you use? Select all that apply.',
    body: (
      <View style={{ gap: space(3) }}>
        <Option title="Nothing — bodyweight only" desc="Train anywhere with no equipment" selected={owned.length === 0 || owned.includes('none')} onPress={() => update({ equipment: ['none'] })} />
        <Row style={{ flexWrap: 'wrap' }}>
          {EQUIPMENT.map((e) => (
            <Chip
              key={e.id}
              label={e.label}
              selected={owned.includes(e.id)}
              onPress={() => {
                const set = new Set<Equipment>(owned.filter((x) => x !== 'none'));
                if (set.has(e.id)) set.delete(e.id);
                else set.add(e.id);
                update({ equipment: set.size ? [...set] : ['none'] });
              }}
            />
          ))}
        </Row>
        <T variant="caption">Full gym? Select everything except what your gym lacks.</T>
      </View>
    ),
    validate: () => {
      if (!owned.length) update({ equipment: ['none'] });
      return null;
    },
  });

  const days = d.workoutDays ?? [];
  steps.push({
    title: 'Schedule',
    prompt: 'On which days of the week will you train?',
    body: (
      <View style={{ gap: space(4) }}>
        <Row style={{ flexWrap: 'wrap' }}>
          {WEEK.map((w) => (
            <Chip
              key={w.day}
              label={w.label}
              selected={days.includes(w.day)}
              onPress={() => update({ workoutDays: days.includes(w.day) ? days.filter((x) => x !== w.day) : [...days, w.day] })}
            />
          ))}
        </Row>
        <T variant="caption">
          3–5 days suits most people. If you pick all 7, one day becomes a lighter Recovery Rite so your body can rebuild.
        </T>
      </View>
    ),
    validate: () => (days.length ? null : 'Pick at least one day.'),
  });

  steps.push({
    title: 'Session length',
    prompt: 'How long can you train on those days?',
    body: (
      <View style={{ gap: space(3) }}>
        {([20, 30, 45, 60] as const).map((m) => (
          <Option key={m} title={`${m} minutes`} desc={m === 45 ? 'Recommended' : undefined} selected={d.sessionMinutes === m} onPress={() => update({ sessionMinutes: m })} />
        ))}
      </View>
    ),
    validate: () => (d.sessionMinutes ? null : 'Choose a length.'),
  });

  steps.push({
    title: 'Provisions',
    prompt: 'What do you eat? Food suggestions will match.',
    body: (
      <View style={{ gap: space(3) }}>
        {(
          [
            ['vegetarian', 'Vegetarian', 'Dairy, no eggs or meat'],
            ['eggetarian', 'Eggetarian', 'Vegetarian plus eggs'],
            ['non_vegetarian', 'Non-vegetarian', 'Everything'],
            ['vegan', 'Vegan', 'No animal products'],
          ] as [DietPreference, string, string][]
        ).map(([id, title, desc]) => (
          <Option key={id} title={title} desc={desc} selected={d.diet === id} onPress={() => update({ diet: id })} />
        ))}
      </View>
    ),
    validate: () => (d.diet ? null : 'Choose an option.'),
  });

  steps.push({
    title: 'Health screening',
    prompt: 'Answer honestly. A "yes" switches you to a gentler plan and asks you to check with a doctor first.',
    body: (
      <View style={{ gap: space(3) }}>
        {SCREENING.map(({ key, q }) => (
          <View key={key} style={{ gap: space(2) }}>
            <T>{q}</T>
            <Row>
              <Chip label="No" selected={!d.health[key]} onPress={() => update({ health: { ...d.health, [key]: false } })} />
              <Chip label="Yes" selected={d.health[key]} onPress={() => update({ health: { ...d.health, [key]: true } })} />
            </Row>
          </View>
        ))}
        <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: 'row', gap: space(3), marginTop: space(3) }}>
          <View style={{ width: 22, height: 22, borderWidth: 1.5, borderColor: colors.glow, backgroundColor: consent ? colors.glow : 'transparent' }} />
          <T variant="caption" style={{ flex: 1 }}>
            I understand this app gives general fitness information, not medical advice, and I will consult a health professional if I have any doubts.
          </T>
        </Pressable>
      </View>
    ),
    validate: () => (consent ? null : 'Please confirm to continue.'),
  });

  const current = steps[Math.min(step, steps.length - 1)]!;
  const last = step >= steps.length - 1;

  async function next() {
    setError(null);
    const msg = current.validate?.() ?? null;
    if (msg) return setError(msg);
    if (!last) return setStep(step + 1);

    const profile = profileSchema.safeParse({ ...d, callsign: d.callsign?.trim(), equipment: d.equipment?.length ? d.equipment : ['none'] });
    if (!profile.success) return setError('Some answers are missing. Go back and check each step.');
    setBusy(true);
    try {
      const timezone = Localization.getCalendars()[0]?.timeZone ?? 'UTC';
      const state = await api<UserState>('/profile', { method: 'PUT', body: { profile: profile.data, timezone } });
      setUser(state);
      router.replace(editing ? '/(tabs)' : '/awakening');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ paddingTop: insets.top + space(4), paddingHorizontal: space(5), gap: space(2) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="label">{editing ? 'Recalibration' : 'Calibration'}</T>
            <T variant="caption">
              {step + 1} / {steps.length}
            </T>
          </Row>
          <Bar value={step + 1} max={steps.length} height={4} />
        </View>
        <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: space(8) }} keyboardShouldPersistTaps="handled">
          <Panel tag={current.title}>
            <T style={{ fontFamily: fonts.bold, fontSize: 21, marginBottom: space(4) }}>{current.prompt}</T>
            {current.body}
          </Panel>
          {error ? <T style={{ color: colors.danger, marginTop: space(3) }}>{error}</T> : null}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: space(3), padding: space(5), paddingBottom: insets.bottom + space(4) }}>
          {step > 0 ? <Button title="Back" variant="ghost" onPress={() => setStep(step - 1)} style={{ flex: 1 }} /> : editing ? <Button title="Cancel" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} /> : null}
          <Button title={last ? (editing ? 'Save' : 'Awaken') : 'Next'} onPress={next} loading={busy} style={{ flex: 2 }} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
