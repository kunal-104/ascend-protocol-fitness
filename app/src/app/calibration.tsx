import { XP, type Adherence } from '@ascend/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '@/lib/api';
import { setUser, useUser } from '@/lib/store';
import type { CheckInResponse, UserState } from '@/lib/types';
import { Button, Chip, Divider, Input, Option, Panel, Row, Screen, SystemAlert, T } from '@/ui/components';
import { formatDate } from '@/ui/format';
import { colors, fonts, space } from '@/ui/theme';

export default function Calibration() {
  const u = useUser();
  const insets = useSafeAreaInsets();
  const [units, setUnits] = useState<'kg' | 'lb'>('kg');
  const [weight, setWeight] = useState('');
  const [adherence, setAdherence] = useState<Adherence | null>(null);
  const [res, setRes] = useState<CheckInResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyCalibration, setApplyCalibration] = useState(true);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const n = Number(weight.replace(',', '.'));
    const kg = units === 'kg' ? n : Math.round(n * 0.45359237 * 10) / 10;
    if (!n || kg < 30 || kg > 300) return setError('Enter a valid weight.');
    if (!adherence) return setError('Tell the Protocol how closely you followed your calories.');
    setBusy(true);
    try {
      const r = await api<CheckInResponse>('/checkins', { method: 'POST', body: { weightKg: kg, adherence } });
      setUser(r.state);
      setRes(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function adjust(direction: 'faster' | 'slower' | 'keep') {
    setBusy(true);
    setError(null);
    try {
      const state = await api<UserState>('/checkins/adjust', { method: 'POST', body: { direction, applyCalibration } });
      setUser(state);
      setDone(`New daily target: ${state.nutrition.calories} kcal · ${state.nutrition.proteinG} g protein.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  const r = res?.result;
  const hasPace = u.profile.goal !== 'stay_fit';
  const towards = u.profile.goal === 'lose_weight' ? 'lose' : 'gain';

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4), paddingBottom: space(12), gap: space(4) }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="label">◆ Calibration</T>
            <Button title="Close" variant="ghost" onPress={() => router.back()} style={{ paddingVertical: space(1.5), borderWidth: 0 }} />
          </Row>

          {!res ? (
            <Panel tag="Weigh-in">
              <T style={{ marginBottom: space(3) }}>
                Weigh yourself in the morning, after the toilet, before eating — the same way each time. Single readings swing by 1–2 kg with water.
              </T>
              <Row style={{ marginBottom: space(3) }}>
                <Chip label="kg" selected={units === 'kg'} onPress={() => setUnits('kg')} />
                <Chip label="lb" selected={units === 'lb'} onPress={() => setUnits('lb')} />
              </Row>
              <Input label={`Current weight (${units})`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder={units === 'kg' ? 'e.g. 72.4' : 'e.g. 160'} />
              <Divider />
              <T style={{ fontFamily: fonts.bold, marginBottom: space(2) }}>How closely did you follow your calorie target?</T>
              <View style={{ gap: space(2) }}>
                <Option title="Mostly" desc="Most days within about 10%" selected={adherence === 'mostly'} onPress={() => setAdherence('mostly')} />
                <Option title="Partly" desc="About half the days" selected={adherence === 'partly'} onPress={() => setAdherence('partly')} />
                <Option title="Rarely" desc="Didn't really track" selected={adherence === 'rarely'} onPress={() => setAdherence('rarely')} />
              </View>
              <Button title="Calibrate" onPress={submit} loading={busy} style={{ marginTop: space(4) }} />
            </Panel>
          ) : null}

          {res && r ? (
            <>
              <Panel tag="Result" accent={r.status === 'on_track' || r.status === 'stable' ? colors.success : colors.warning}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View>
                    <T variant="caption">Since {formatDate(res.previous.date)}</T>
                    <T variant="number">
                      {r.changeKg > 0 ? '+' : ''}
                      {r.changeKg} kg
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T variant="caption">Per week</T>
                    <T variant="number" style={{ fontSize: 22 }}>
                      {r.weeklyRateKg > 0 ? '+' : ''}
                      {r.weeklyRateKg} kg
                    </T>
                    {hasPace ? <T variant="caption">planned {r.expectedWeeklyKg > 0 ? '+' : ''}{r.expectedWeeklyKg} kg</T> : null}
                  </View>
                </Row>
                <T style={{ marginTop: space(3) }}>{r.message}</T>
              </Panel>

              {!done ? (
                <Panel tag="Adjust the Protocol">
                  {r.maintenanceEstimate ? (
                    <Option
                      title={`Use my real data (maintenance ≈ ${r.maintenanceEstimate} kcal)`}
                      desc="Recommended: your actual weight change is more accurate than any formula."
                      selected={applyCalibration}
                      onPress={() => setApplyCalibration(!applyCalibration)}
                    />
                  ) : (
                    <T variant="caption">Log calories more closely for 2+ weeks and the Protocol can recalibrate from your real data next time.</T>
                  )}
                  <View style={{ gap: space(3), marginTop: space(4) }}>
                    {hasPace && r.canGoFaster ? <Button title={`${towards[0]!.toUpperCase()}${towards.slice(1)} faster`} onPress={() => void adjust('faster')} loading={busy} /> : null}
                    {hasPace && r.canGoSlower ? <Button title="Slow down" variant="ghost" onPress={() => void adjust('slower')} disabled={busy} /> : null}
                    <Button title="Keep current pace" variant="ghost" onPress={() => void adjust('keep')} disabled={busy} />
                  </View>
                  {hasPace && !r.canGoFaster && u.profile.pace !== 'fast' ? (
                    <T variant="caption" style={{ marginTop: space(3) }}>
                      Faster is locked because you are already progressing at or beyond the safe rate.
                    </T>
                  ) : null}
                </Panel>
              ) : null}
            </>
          ) : null}

          {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <SystemAlert
        alert={done ? { tag: 'Calibration complete', title: `+${XP.checkIn} Essence`, lines: [done, 'Next calibration in 3 weeks.'] } : null}
        onClose={() => router.back()}
      />
    </Screen>
  );
}
