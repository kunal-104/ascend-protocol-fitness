import { exerciseById, TERMS, weekdayOf } from '@ascend/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/lib/store';
import { Button, Divider, Panel, Row, Screen, T } from '@/ui/components';
import { DAY_ORDER, DAY_SHORT, prescription } from '@/ui/format';
import { colors, fonts, space } from '@/ui/theme';

export default function Directive() {
  const u = useUser();
  const insets = useSafeAreaInsets();
  const todayIdx = weekdayOf(u.today);
  const [open, setOpen] = useState<number>(todayIdx);
  const today = u.plan.days[todayIdx]!;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4), paddingBottom: space(10), gap: space(4) }}>
        <T variant="label">◆ This week's Directives</T>

        {today.type !== 'rest' ? (
          <Button title={`Begin today: ${today.title}`} onPress={() => router.push({ pathname: '/session', params: { date: u.today } })} />
        ) : null}

        {DAY_ORDER.map((d) => {
          const s = u.plan.days[d]!;
          const isToday = d === todayIdx;
          const expanded = open === d && s.type !== 'rest';
          return (
            <Pressable key={d} onPress={() => setOpen(expanded ? -1 : d)}>
              <Panel accent={isToday ? colors.glow : colors.panelBorderDim} style={{ paddingVertical: space(3) }}>
                <Row>
                  <T variant="label" style={{ width: 46, color: isToday ? colors.glow : colors.textDim }}>
                    {DAY_SHORT[d]}
                  </T>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontFamily: fonts.bold, fontSize: 17, color: s.type === 'rest' ? colors.textDim : colors.text }}>
                      {s.type === 'rest' ? TERMS.restDay : s.title}
                    </T>
                    <T variant="caption">{s.type === 'rest' ? `${u.plan.stepsTarget.toLocaleString()} steps` : `${s.focus} · ~${s.estMinutes} min`}</T>
                  </View>
                  {s.type !== 'rest' ? <T style={{ color: colors.textDim }}>{expanded ? '▴' : '▾'}</T> : null}
                </Row>
                {expanded ? (
                  <View style={{ marginTop: space(3), gap: space(2) }}>
                    {s.exercises.map((e) => {
                      const ex = exerciseById(e.exerciseId);
                      return (
                        <Row key={e.exerciseId} style={{ justifyContent: 'space-between' }}>
                          <T style={{ flex: 1 }}>{ex?.name}</T>
                          <T variant="caption">{prescription(e, ex?.unilateral)}</T>
                        </Row>
                      );
                    })}
                    {s.finisher ? (
                      <View>
                        <T style={{ color: colors.accent }}>
                          {TERMS.finisher}: {exerciseById(s.finisher.exerciseId)?.name}
                        </T>
                        <T variant="caption">{s.finisher.format}</T>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Panel>
            </Pressable>
          );
        })}

        <Panel tag="Protocol rules">
          <T>{u.plan.intensityNote}</T>
          <Divider />
          <View style={{ gap: space(2) }}>
            {u.plan.progression.map((line, i) => (
              <T key={i} variant="caption">
                ◇ {line}
              </T>
            ))}
          </View>
          {u.plan.gentle ? (
            <T variant="caption" style={{ color: colors.warning, marginTop: space(3) }}>
              Gentle mode is active because of your health answers. Get clearance from a doctor before increasing intensity.
            </T>
          ) : null}
        </Panel>
      </ScrollView>
    </Screen>
  );
}
