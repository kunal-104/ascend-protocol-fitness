import { AWAKENING_COMPLETE, MESSAGES, needsMedicalClearance } from '@ascend/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ensurePermission, scheduleReminders } from '@/lib/notifications';
import { useUser } from '@/lib/store';
import { Button, Panel, Row, Screen, T, Typewriter } from '@/ui/components';
import { colors, space } from '@/ui/theme';
import { DAY_ORDER, DAY_SHORT } from '@/ui/format';

export default function Awakening() {
  const u = useUser();
  const insets = useSafeAreaInsets();
  const [line, setLine] = useState(0);
  const revealed = line >= AWAKENING_COMPLETE.length;
  const [busy, setBusy] = useState(false);
  const n = u.nutrition;

  async function enter() {
    setBusy(true);
    try {
      if (await ensurePermission()) await scheduleReminders(u, false);
    } finally {
      setBusy(false);
      router.replace('/(tabs)');
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(8), paddingBottom: insets.bottom + space(8), gap: space(5) }}>
        <Panel tag="System">
          <View style={{ gap: space(2), minHeight: 130 }}>
            {AWAKENING_COMPLETE.slice(0, line + 1).map((t, i) =>
              i < line ? (
                <T key={i} style={{ color: colors.textDim }}>
                  {t}
                </T>
              ) : (
                <Typewriter key={i} text={t} style={{ fontSize: 18 }} onDone={() => setTimeout(() => setLine((l) => l + 1), 350)} />
              ),
            )}
          </View>
        </Panel>

        {revealed ? (
          <>
            {needsMedicalClearance(u.profile) ? (
              <Panel tag="Medical notice" accent={colors.warning}>
                <T>{MESSAGES.medicalClearance[0]}</T>
              </Panel>
            ) : null}

            <Panel tag="Daily provisions">
              <Row style={{ justifyContent: 'space-between' }}>
                <Stat label="Calories" value={`${n.calories}`} unit="kcal" />
                <Stat label="Protein" value={`${n.proteinG}`} unit="g" />
                <Stat label="Water" value={`${n.waterLitres}`} unit="L" />
              </Row>
              <T variant="caption" style={{ marginTop: space(3) }}>
                Maintenance ≈ {n.maintenance} kcal. Expected change ≈ {n.expectedWeeklyChangeKg > 0 ? '+' : ''}
                {n.expectedWeeklyChangeKg} kg/week{n.weeksToTarget ? `, target in ~${n.weeksToTarget} weeks` : ''}.
              </T>
              {n.warnings.map((w) => (
                <T key={w.code} variant="caption" style={{ color: colors.warning, marginTop: space(2) }}>
                  ⚠ {w.message}
                </T>
              ))}
            </Panel>

            <Panel tag="Weekly Directives">
              {DAY_ORDER.map((d) => {
                const s = u.plan.days[d]!;
                return (
                  <Row key={d} style={{ paddingVertical: space(1.5) }}>
                    <T variant="label" style={{ width: 44, color: s.type === 'rest' ? colors.textFaint : colors.glow }}>
                      {DAY_SHORT[d]}
                    </T>
                    <T style={{ flex: 1, color: s.type === 'rest' ? colors.textDim : colors.text }}>{s.title}</T>
                    {s.estMinutes ? <T variant="caption">{s.estMinutes} min</T> : null}
                  </Row>
                );
              })}
              <T variant="caption" style={{ marginTop: space(2) }}>
                Daily step target: {u.plan.stepsTarget.toLocaleString()}
              </T>
            </Panel>

            <Button title="Enter the Protocol" onPress={enter} loading={busy} />
            <T variant="caption" style={{ textAlign: 'center' }}>
              You will be asked to allow notifications so the Protocol can deliver your daily Directives.
            </T>
          </>
        ) : (
          <Button title="Skip" variant="ghost" onPress={() => setLine(AWAKENING_COMPLETE.length)} style={{ borderWidth: 0 }} />
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <T variant="number">
        {value}
        <T variant="caption"> {unit}</T>
      </T>
      <T variant="label" style={{ fontSize: 11 }}>
        {label}
      </T>
    </View>
  );
}
