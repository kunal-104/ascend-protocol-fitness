import { STAT_INFO, TERMS, weekdayOf, type StatKey } from '@ascend/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '@/lib/api';
import { rewardAlerts, useAlertQueue } from '@/lib/rewards';
import { loadMe, setUser, useUser } from '@/lib/store';
import type { HabitLog, RewardResponse } from '@/lib/types';
import { Bar, Button, Chip, Panel, Row, Screen, SystemAlert, T } from '@/ui/components';
import { colors, fonts, space } from '@/ui/theme';

const STAT_ORDER: StatKey[] = ['STR', 'END', 'AGI', 'VIT', 'DIS'];

export default function Status() {
  const u = useUser();
  const insets = useSafeAreaInsets();
  const alerts = useAlertQueue();
  const [refreshing, setRefreshing] = useState(false);
  const [habitBusy, setHabitBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = u.player;
  const session = u.plan.days[weekdayOf(u.today)]!;
  const statMax = Math.max(...STAT_ORDER.map((k) => p.stats[k])) + 5;
  const habits: HabitLog = u.todayHabits ?? { proteinHit: false, caloriesOnTarget: false, waterHit: false, stepsHit: false };

  async function toggleHabit(key: keyof HabitLog) {
    setHabitBusy(true);
    setError(null);
    try {
      const res = await api<RewardResponse>(`/habits/${u.today}`, { method: 'PUT', body: { ...habits, [key]: !habits[key] } });
      setUser(res.state);
      if (res.levelUp || res.rankUp) alerts.push(rewardAlerts({ ...res, reward: { ...res.reward, xp: 0 } }, u.today, 'habits'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
    } finally {
      setHabitBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4), paddingBottom: space(10), gap: space(5) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.glow}
            onRefresh={() => {
              setRefreshing(true);
              void loadMe()
                .catch(() => undefined)
                .finally(() => setRefreshing(false));
            }}
          />
        }
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="label">◆ {TERMS.status}</T>
          <Pressable accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={12}>
            <T style={{ fontSize: 22, color: colors.textDim }}>⚙</T>
          </Pressable>
        </Row>

        <Panel tag={`${p.rank.name} Rank`} accent={p.rank.color}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <T variant="caption">{TERMS.user}</T>
              <T variant="title" numberOfLines={1}>
                {u.profile.callsign}
              </T>
              <T variant="caption" style={{ color: p.rank.color }}>
                {p.rank.title}
              </T>
            </View>
            <View style={{ alignItems: 'center' }}>
              <T variant="label" style={{ color: colors.textDim }}>
                Level
              </T>
              <T style={{ fontFamily: fonts.bold, fontSize: 52, lineHeight: 56, color: colors.text }}>{p.level}</T>
            </View>
          </Row>
          <View style={{ marginTop: space(3), gap: space(1) }}>
            <Bar value={p.xpIntoLevel} max={p.xpForNextLevel} color={p.rank.color} />
            <T variant="caption">
              {p.xpIntoLevel} / {p.xpForNextLevel} {TERMS.xp} to Level {p.level + 1}
            </T>
          </View>
        </Panel>

        {u.access.phase === 'free' && u.access.warnPaywall ? (
          <Panel tag="Protocol notice" accent={colors.warning}>
            <T>
              {u.access.freeDaysLeft} free {u.access.freeDaysLeft === 1 ? 'day remains' : 'days remain'}. On day 10 you will be asked to commit — and you
              still get 6 more days free.
            </T>
          </Panel>
        ) : null}

        {u.checkIn.due ? (
          <Pressable onPress={() => router.push('/calibration')}>
            <Panel tag="Calibration available" accent={colors.accent}>
              <T>Three weeks have passed. Weigh in to measure your ascent and tune your plan. (Optional)</T>
            </Panel>
          </Pressable>
        ) : null}

        <Panel tag={`Today · ${TERMS.dailyWorkout}`}>
          {session.type === 'rest' ? (
            <>
              <T variant="heading">{TERMS.restDay}</T>
              <T variant="caption" style={{ marginTop: space(1) }}>
                Recover and walk {u.plan.stepsTarget.toLocaleString()} steps. Muscles grow during rest.
              </T>
            </>
          ) : (
            <>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="heading">{session.title}</T>
                <T variant="caption">~{session.estMinutes} min</T>
              </Row>
              <T variant="caption">{session.focus}</T>
              {u.todayWorkout ? (
                <View style={{ marginTop: space(3), gap: space(1) }}>
                  <Bar value={u.todayWorkout.completion} max={1} color={u.todayWorkout.completion >= 1 ? colors.success : colors.glow} />
                  <T variant="caption">
                    {Math.round(u.todayWorkout.completion * 100)}% complete · +{u.todayWorkout.xp} {TERMS.xp}
                  </T>
                </View>
              ) : null}
              <Button
                title={u.todayWorkout ? (u.todayWorkout.completion >= 1 ? 'Review Directive' : 'Continue Directive') : 'Begin Directive'}
                onPress={() => router.push({ pathname: '/session', params: { date: u.today } })}
                style={{ marginTop: space(4) }}
              />
            </>
          )}
        </Panel>

        <Panel tag="Daily disciplines">
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label={`Protein ${u.nutrition.proteinG} g`} selected={habits.proteinHit} onPress={() => !habitBusy && void toggleHabit('proteinHit')} />
            <Chip label={`Calories ~${u.nutrition.calories}`} selected={habits.caloriesOnTarget} onPress={() => !habitBusy && void toggleHabit('caloriesOnTarget')} />
            <Chip label={`Water ${u.nutrition.waterLitres} L`} selected={habits.waterHit} onPress={() => !habitBusy && void toggleHabit('waterHit')} />
            <Chip label={`${u.plan.stepsTarget.toLocaleString()} steps`} selected={habits.stepsHit} onPress={() => !habitBusy && void toggleHabit('stepsHit')} />
          </Row>
          <T variant="caption" style={{ marginTop: space(3) }}>
            Tap what you achieved today. Honest logs keep your calibration accurate.
          </T>
          {error ? <T style={{ color: colors.danger, marginTop: space(2) }}>{error}</T> : null}
        </Panel>

        <Panel tag="Attributes">
          <View style={{ gap: space(3) }}>
            {STAT_ORDER.map((k) => (
              <View key={k}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T style={{ fontFamily: fonts.bold }}>
                    {k} <T variant="caption">· {STAT_INFO[k].name}</T>
                  </T>
                  <T style={{ fontFamily: fonts.bold, color: colors.glow }}>{p.stats[k]}</T>
                </Row>
                <Bar value={p.stats[k]} max={statMax} height={4} />
              </View>
            ))}
          </View>
        </Panel>

        <Row style={{ gap: space(4) }}>
          <Panel tag={TERMS.streak} style={{ flex: 1 }}>
            <T variant="number">{p.streak}</T>
            <T variant="caption">Directives in a row</T>
          </Panel>
          <Panel tag="Cleared" style={{ flex: 1 }}>
            <T variant="number">{p.workoutsCompleted}</T>
            <T variant="caption">Directives total</T>
          </Panel>
        </Row>

        <T variant="caption" style={{ textAlign: 'center' }}>
          Day {u.access.day} of your ascent ·{' '}
          {u.access.phase === 'free' ? `${u.access.freeDaysLeft} free days left` : u.access.phase === 'trial' ? 'Free trial active' : 'Subscribed'}
        </T>
      </ScrollView>
      <SystemAlert alert={alerts.current} onClose={alerts.close} />
    </Screen>
  );
}
