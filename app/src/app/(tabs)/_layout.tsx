import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { AppState, Text, type ColorValue } from 'react-native';
import { scheduleReminders } from '@/lib/notifications';
import { getMe, loadMe, useStore } from '@/lib/store';
import { colors, fonts } from '@/ui/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const me = useStore((s) => s.me);

  // Refresh state (day rollover, subscription changes) whenever the app comes to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void loadMe().catch(() => undefined);
    });
    return () => sub.remove();
  }, []);

  // Reschedule local notifications when the day, plan, access or today's completion changes.
  const scheduleKey = me?.onboarded
    ? [me.today, me.profile.workoutDays.join(','), me.profile.sessionMinutes, me.access.phase, me.checkIn.nextDate, (me.todayWorkout?.completion ?? 0) >= 0.5].join('|')
    : '';
  useEffect(() => {
    const u = getMe();
    if (u?.onboarded) void scheduleReminders(u, (u.todayWorkout?.completion ?? 0) >= 0.5).catch(() => undefined);
  }, [scheduleKey]);

  if (!me) return <Redirect href="/" />;
  if (!me.onboarded) return <Redirect href="/onboarding" />;
  if (!me.access.hasAccess) return <Redirect href="/paywall" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#050A16', borderTopColor: colors.panelBorderDim, height: 64, paddingTop: 6 },
        tabBarActiveTintColor: colors.glow,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Status', tabBarIcon: icon('◆') }} />
      <Tabs.Screen name="directive" options={{ title: 'Directive', tabBarIcon: icon('⚔') }} />
      <Tabs.Screen name="provisions" options={{ title: 'Provisions', tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('▲') }} />
    </Tabs>
  );
}
