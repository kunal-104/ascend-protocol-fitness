import { APP_NAME, DISCLAIMER } from '@ascend/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { DEFAULT_PREFS, ensurePermission, getPrefs, scheduleReminders, setPrefs, type ReminderPrefs } from '@/lib/notifications';
import { signOut, useUser } from '@/lib/store';
import { Button, Chip, Divider, Panel, Row, Screen, T } from '@/ui/components';
import { colors, space } from '@/ui/theme';

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://example.com/privacy';
const MORNING = [6, 7, 8, 9];
const EVENING = [18, 19, 20, 21];
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric' });

export default function Settings() {
  const u = useUser();
  const insets = useSafeAreaInsets();
  const [prefs, setLocal] = useState<ReminderPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    void getPrefs().then(setLocal);
  }, []);

  async function save(p: ReminderPrefs) {
    setLocal(p);
    await setPrefs(p);
    if (p.enabled) await ensurePermission();
    await scheduleReminders(u, (u.todayWorkout?.completion ?? 0) >= 0.5);
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, history and progress. It cannot be undone. Cancel your Google Play subscription separately to stop billing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: () =>
            void api('/me', { method: 'DELETE' })
              .then(() => signOut())
              .then(() => router.replace('/'))
              .catch(() => Alert.alert('Could not delete', 'Check your connection and try again.')),
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(4), paddingBottom: space(12), gap: space(4) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="label">◆ Settings</T>
          <Button title="Done" variant="ghost" onPress={() => router.back()} style={{ paddingVertical: space(1.5), borderWidth: 0 }} />
        </Row>

        <Panel tag="Profile">
          <T>
            {u.profile.callsign} · {u.email}
          </T>
          <T variant="caption" style={{ marginTop: space(1) }}>
            Change your goal, schedule, equipment or measurements. Your plan and targets are rebuilt instantly.
          </T>
          <Button title="Recalibrate profile" onPress={() => router.push('/onboarding')} style={{ marginTop: space(3) }} />
        </Panel>

        <Panel tag="Directive alerts">
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Daily reminders</T>
            <Switch value={prefs.enabled} onValueChange={(enabled) => void save({ ...prefs, enabled })} trackColor={{ true: colors.glow }} />
          </Row>
          {prefs.enabled ? (
            <>
              <T variant="caption" style={{ marginTop: space(3) }}>
                Morning Directive
              </T>
              <Row style={{ flexWrap: 'wrap', marginTop: space(1) }}>
                {MORNING.map((h) => (
                  <Chip key={h} label={hourLabel(h)} selected={prefs.morningHour === h} onPress={() => void save({ ...prefs, morningHour: h })} />
                ))}
              </Row>
              <T variant="caption" style={{ marginTop: space(3) }}>
                Evening reminder (only if not done)
              </T>
              <Row style={{ flexWrap: 'wrap', marginTop: space(1) }}>
                {EVENING.map((h) => (
                  <Chip key={h} label={hourLabel(h)} selected={prefs.eveningHour === h} onPress={() => void save({ ...prefs, eveningHour: h })} />
                ))}
              </Row>
            </>
          ) : null}
        </Panel>

        <Panel tag="Subscription">
          <T>
            {u.access.phase === 'free'
              ? `Free period · ${u.access.freeDaysLeft} days left`
              : u.access.phase === 'trial'
                ? 'Free trial active'
                : u.access.phase === 'subscribed'
                  ? 'Subscribed'
                  : 'Inactive'}
          </T>
          <Button title="View subscription" variant="ghost" onPress={() => router.push('/paywall')} style={{ marginTop: space(3) }} />
        </Panel>

        <Panel tag="About">
          <T variant="caption">{DISCLAIMER}</T>
          <Divider />
          <View style={{ gap: space(3) }}>
            <Button title="Privacy policy" variant="ghost" onPress={() => void Linking.openURL(PRIVACY_URL)} />
            <Button title="Sign out" variant="ghost" onPress={() => void signOut().then(() => router.replace('/'))} />
            <Button title="Delete account" variant="danger" onPress={confirmDelete} />
          </View>
          <T variant="caption" style={{ textAlign: 'center', marginTop: space(4) }}>
            {APP_NAME}
          </T>
        </Panel>
      </ScrollView>
    </Screen>
  );
}
