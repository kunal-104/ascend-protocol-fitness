import { addDays, diffDays, TERMS, weekdayOf } from '@ascend/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { api } from '@/lib/api';
import { useUser } from '@/lib/store';
import type { HistoryResponse, WeighInsResponse } from '@/lib/types';
import { Button, Panel, Row, Screen, T } from '@/ui/components';
import { formatDate } from '@/ui/format';
import { colors, fonts, space } from '@/ui/theme';

const GRID_DAYS = 28;

export default function Progress() {
  const u = useUser();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [weights, setWeights] = useState<WeighInsResponse | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);

  useFocusEffect(
    useCallback(() => {
      void api<WeighInsResponse>('/weigh-ins').then(setWeights).catch(() => undefined);
      void api<HistoryResponse>(`/history?from=${addDays(u.today, -(GRID_DAYS - 1))}&to=${u.today}`).then(setHistory).catch(() => undefined);
    }, [u.today, u.checkIn.count]),
  );

  const points = weights ? [weights.start, ...[...weights.weighIns].reverse()] : [];
  const latest = points[points.length - 1];
  const prev = points[points.length - 2];
  const daysToNext = diffDays(u.today, u.checkIn.nextDate);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4), paddingBottom: space(10), gap: space(4) }}>
        <T variant="label">◆ Ascent record</T>

        <Panel tag={TERMS.checkIn} accent={u.checkIn.due ? colors.accent : colors.panelBorder}>
          {u.checkIn.due ? (
            <>
              <T>Calibration is available. Weigh in to see your change and tune your plan.</T>
              <Button title="Calibrate now" onPress={() => router.push('/calibration')} style={{ marginTop: space(3) }} />
            </>
          ) : (
            <T>
              Next calibration in {daysToNext} {daysToNext === 1 ? 'day' : 'days'} ({formatDate(u.checkIn.nextDate)}). Weigh-ins are optional — every 3 weeks
              keeps your targets accurate.
            </T>
          )}
        </Panel>

        <Panel tag="Body weight">
          {latest ? (
            <Row style={{ justifyContent: 'space-between', marginBottom: space(3) }}>
              <View>
                <T variant="caption">Now</T>
                <T variant="number">{latest.weightKg} kg</T>
              </View>
              <View style={{ alignItems: 'center' }}>
                <T variant="caption">Since start</T>
                <Delta value={latest.weightKg - points[0]!.weightKg} goal={u.profile.goal} />
              </View>
              {prev ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <T variant="caption">Since last</T>
                  <Delta value={latest.weightKg - prev.weightKg} goal={u.profile.goal} />
                </View>
              ) : null}
            </Row>
          ) : null}
          {points.length >= 2 ? (
            <WeightChart points={points} width={width - space(18)} target={u.profile.targetWeightKg} />
          ) : (
            <T variant="caption">Your chart appears after your first calibration.</T>
          )}
        </Panel>

        <Panel tag={`Last ${GRID_DAYS} days`}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: GRID_DAYS }, (_, i) => {
              const date = addDays(u.today, i - (GRID_DAYS - 1));
              const w = history?.workouts.find((x) => x.date === date);
              const rest = u.plan.days[weekdayOf(date)]!.type === 'rest';
              const before = date < u.startDate;
              const bg = before
                ? 'transparent'
                : w
                  ? `rgba(61,255,176,${0.25 + 0.75 * w.completion})`
                  : rest
                    ? 'rgba(43,196,255,0.08)'
                    : date < u.today
                      ? 'rgba(255,77,109,0.25)'
                      : 'rgba(43,196,255,0.15)';
              return <View key={date} style={{ width: 32, height: 32, backgroundColor: bg, borderWidth: date === u.today ? 1 : 0, borderColor: colors.glow }} />;
            })}
          </View>
          <T variant="caption" style={{ marginTop: space(3) }}>
            Green = Directive done · Red = missed · Faint = Stillness Day
          </T>
        </Panel>

        {weights?.weighIns.length ? (
          <Panel tag="Calibration log">
            {weights.weighIns.map((w) => (
              <View key={w.date} style={{ paddingVertical: space(2) }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T style={{ fontFamily: fonts.bold }}>{formatDate(w.date)}</T>
                  <T>{w.weightKg} kg</T>
                </Row>
                <T variant="caption">{w.result.message}</T>
              </View>
            ))}
          </Panel>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Delta({ value, goal }: { value: number; goal: string }) {
  const v = Math.round(value * 10) / 10;
  const good = goal === 'lose_weight' ? v < 0 : goal === 'gain_muscle' ? v > 0 : Math.abs(v) < 1;
  return (
    <T variant="number" style={{ fontSize: 22, color: v === 0 ? colors.text : good ? colors.success : colors.warning }}>
      {v > 0 ? '+' : ''}
      {v} kg
    </T>
  );
}

function WeightChart({ points, width, target }: { points: { date: string; weightKg: number }[]; width: number; target?: number }) {
  const height = 160;
  const pad = 28;
  const values = points.map((p) => p.weightKg).concat(target ? [target] : []);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const t0 = points[0]!.date;
  const span = Math.max(1, diffDays(t0, points[points.length - 1]!.date));
  const x = (d: string) => pad + (diffDays(t0, d) / span) * (width - pad * 2);
  const y = (w: number) => pad / 2 + (1 - (w - min) / (max - min)) * (height - pad);
  return (
    <Svg width={width} height={height}>
      {target ? (
        <>
          <Line x1={pad} x2={width - pad} y1={y(target)} y2={y(target)} stroke={colors.gold} strokeDasharray="4 4" strokeWidth={1} />
          <SvgText x={width - pad} y={y(target) - 4} fill={colors.gold} fontSize={10} textAnchor="end">
            target {target}
          </SvgText>
        </>
      ) : null}
      <Polyline points={points.map((p) => `${x(p.date)},${y(p.weightKg)}`).join(' ')} fill="none" stroke={colors.glow} strokeWidth={2.5} />
      {points.map((p) => (
        <Circle key={p.date} cx={x(p.date)} cy={y(p.weightKg)} r={4} fill={colors.bg} stroke={colors.glow} strokeWidth={2} />
      ))}
    </Svg>
  );
}
