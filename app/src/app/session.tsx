import { exerciseById, TERMS, type PlannedExercise } from '@ascend/core';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '@/lib/api';
import { scheduleReminders } from '@/lib/notifications';
import { rewardAlerts, useAlertQueue } from '@/lib/rewards';
import { setUser, useUser } from '@/lib/store';
import type { DayResponse, RewardResponse } from '@/lib/types';
import { Bar, Button, Panel, Row, Screen, SystemAlert, T } from '@/ui/components';
import { prescription } from '@/ui/format';
import { colors, fonts, space } from '@/ui/theme';

export default function SessionScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const u = useUser();
  const insets = useSafeAreaInsets();
  const alerts = useAlertQueue();
  const [day, setDay] = useState<DayResponse | null>(null);
  const [setsDone, setSetsDone] = useState<number[]>([]);
  const [finisherDone, setFinisherDone] = useState(false);
  const [timer, setTimer] = useState<{ label: string; seconds: number; kind: 'rest' | 'work' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [barHeight, setBarHeight] = useState(140);

  useEffect(() => {
    api<DayResponse>(`/day/${date}`)
      .then((d) => {
        setDay(d);
        setSetsDone(d.workout?.setsDone ?? d.session.exercises.map(() => 0));
        setFinisherDone(d.workout?.finisherDone ?? false);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the Directive.'));
  }, [date]);

  // Countdown for rest periods and timed sets.
  useEffect(() => {
    if (!timer) return;
    if (timer.seconds <= 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimer(null);
      return;
    }
    const id = setTimeout(() => setTimer((t) => (t ? { ...t, seconds: t.seconds - 1 } : t)), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  if (!day) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center', padding: space(6) }}>
        {error ? <T style={{ color: colors.danger }}>{error}</T> : <ActivityIndicator color={colors.glow} />}
        {error ? <Button title="Back" variant="ghost" onPress={() => router.back()} style={{ marginTop: space(4) }} /> : null}
      </Screen>
    );
  }

  const s = day.session;
  const planned = s.exercises.reduce((a, e) => a + e.sets, 0) + (s.finisher ? 1 : 0);
  const done = s.exercises.reduce((a, e, i) => a + Math.min(setsDone[i] ?? 0, e.sets), 0) + (s.finisher && finisherDone ? 1 : 0);

  function tapSet(i: number, e: PlannedExercise) {
    const current = setsDone[i] ?? 0;
    const next = current >= e.sets ? 0 : current + 1;
    setSetsDone((arr) => arr.map((v, j) => (j === i ? next : v)));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (next > current && next < e.sets) setTimer({ label: 'Rest', seconds: e.restSec, kind: 'rest' });
  }

  async function save(final: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await api<RewardResponse>(`/workouts/${date}`, { method: 'PUT', body: { setsDone, finisherDone } });
      setUser(res.state);
      if (date === res.state.today) void scheduleReminders(res.state, res.reward.completion >= 0.5).catch(() => undefined);
      if (final) {
        setFinished(true);
        alerts.push(rewardAlerts(res, `${date}-${res.reward.xp}`, 'workout'));
      } else router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + space(3), paddingHorizontal: space(5), gap: space(2) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <T style={{ color: colors.textDim }}>✕ Close</T>
          </Pressable>
          <T variant="label">{TERMS.dailyWorkout}</T>
          <T variant="caption">
            {done}/{planned}
          </T>
        </Row>
        <Bar value={done} max={planned} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: barHeight + (timer ? 140 : space(6)), gap: space(4) }}>
        <T variant="title">{s.title}</T>
        <T variant="caption">
          {s.focus} · ~{s.estMinutes} min
        </T>

        {s.warmup.length ? (
          <Panel tag="Warm-up">
            {s.warmup.map((w, i) => (
              <T key={i} variant="caption">
                ◇ {w}
              </T>
            ))}
          </Panel>
        ) : null}

        {s.exercises.map((e, i) => {
          const ex = exerciseById(e.exerciseId);
          if (!ex) return null;
          const complete = (setsDone[i] ?? 0) >= e.sets;
          return (
            <Panel key={e.exerciseId} tag={`${i + 1} · ${ex.pattern.replace('_', ' ')}`} accent={complete ? colors.success : colors.panelBorder}>
              <T variant="heading">{ex.name}</T>
              <T style={{ color: colors.glow, fontFamily: fonts.bold, marginTop: space(1) }}>
                {prescription(e, ex.unilateral)} · rest {e.restSec}s
              </T>
              <View style={{ marginTop: space(2), gap: space(1) }}>
                {ex.cues.map((c, k) => (
                  <T key={k} variant="caption">
                    › {c}
                  </T>
                ))}
              </View>
              <Row style={{ marginTop: space(3), flexWrap: 'wrap' }}>
                {Array.from({ length: e.sets }, (_, k) => {
                  const filled = k < (setsDone[i] ?? 0);
                  return (
                    <Pressable
                      key={k}
                      accessibilityLabel={`Set ${k + 1}`}
                      onPress={() => tapSet(i, e)}
                      style={{
                        width: 52,
                        height: 44,
                        borderWidth: 1,
                        borderColor: filled ? colors.success : colors.panelBorderDim,
                        backgroundColor: filled ? 'rgba(61,255,176,0.18)' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <T style={{ fontFamily: fonts.bold, color: filled ? colors.success : colors.textDim }}>{filled ? '✓' : k + 1}</T>
                    </Pressable>
                  );
                })}
              </Row>
              <Row style={{ marginTop: space(3), justifyContent: 'space-between' }}>
                {e.seconds ? (
                  <Pressable onPress={() => setTimer({ label: ex.name, seconds: e.seconds!, kind: 'work' })}>
                    <T style={{ color: colors.glow }}>▶ Start {e.seconds}s timer</T>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable onPress={() => void Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} proper form`)}`)}>
                  <T variant="caption" style={{ textDecorationLine: 'underline' }}>
                    Technique video
                  </T>
                </Pressable>
              </Row>
            </Panel>
          );
        })}

        {s.finisher ? (
          <Panel tag={TERMS.finisher} accent={finisherDone ? colors.success : colors.accent}>
            <T variant="heading">{exerciseById(s.finisher.exerciseId)?.name}</T>
            <T style={{ color: colors.accent, fontFamily: fonts.bold }}>{s.finisher.format}</T>
            <Row style={{ marginTop: space(3) }}>
              <Button
                title={finisherDone ? 'Done ✓' : 'Mark done'}
                variant={finisherDone ? 'ghost' : 'primary'}
                onPress={() => setFinisherDone(!finisherDone)}
                style={{ flex: 1 }}
              />
            </Row>
          </Panel>
        ) : null}

        <T variant="caption">
          Stop immediately if you feel chest pain, severe breathlessness, dizziness or sharp joint pain. Partial Directives still earn {TERMS.xp}.
        </T>
        {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
      </ScrollView>

      {timer ? (
        <View style={{ position: 'absolute', left: space(5), right: space(5), bottom: barHeight + space(2) }}>
          <Panel tag={timer.kind === 'rest' ? 'Recovery' : 'Hold'} accent={timer.kind === 'rest' ? colors.accent : colors.glow}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <T variant="caption">{timer.label}</T>
                <T style={{ fontFamily: fonts.bold, fontSize: 40 }}>{timer.seconds}s</T>
              </View>
              <Row>
                <Button title="+15" variant="ghost" onPress={() => setTimer({ ...timer, seconds: timer.seconds + 15 })} />
                <Button title="Skip" variant="ghost" onPress={() => setTimer(null)} />
              </Row>
            </Row>
          </Panel>
        </View>
      ) : null}

      <View
        onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space(5), paddingBottom: insets.bottom + space(4), backgroundColor: 'rgba(4,6,12,0.95)', gap: space(2) }}
      >
        <Button title={done >= planned ? 'Complete Directive' : `Submit (${Math.round((done / Math.max(planned, 1)) * 100)}%)`} onPress={() => void save(true)} loading={saving} disabled={done === 0 || finished} />
        <Button title="Save & exit" variant="ghost" onPress={() => void save(false)} disabled={saving || finished} />
      </View>

      <SystemAlert
        alert={alerts.current}
        onClose={() => {
          alerts.close();
          if (alerts.pending <= 1) router.back();
        }}
      />
    </Screen>
  );
}
