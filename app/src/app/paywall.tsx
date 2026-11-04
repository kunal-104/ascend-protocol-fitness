import { FREE_DAYS_BEFORE_PAYWALL, MESSAGES, TRIAL_DAYS_AFTER_SUBSCRIBE } from '@ascend/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPriceInfo, manageSubscription, restorePurchases, subscribe, type PriceInfo } from '@/lib/billing';
import { setUser, signOut, useUser } from '@/lib/store';
import { Button, Panel, Row, Screen, T } from '@/ui/components';
import { formatDate } from '@/ui/format';
import { colors, fonts, space } from '@/ui/theme';

export default function Paywall() {
  const u = useUser();
  const insets = useSafeAreaInsets();
  const [price, setPrice] = useState<PriceInfo | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = !u.access.hasAccess;

  useEffect(() => {
    void getPriceInfo().then(setPrice);
  }, []);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed.');
    } finally {
      setBusy(false);
    }
  }

  const onSubscribe = () =>
    run(async () => {
      const state = await subscribe();
      if (state) {
        setUser(state);
        if (state.access.hasAccess) router.replace('/(tabs)');
      }
    });

  const onRestore = () =>
    run(async () => {
      const state = await restorePurchases();
      if (state) setUser(state);
      if (state?.access.hasAccess) router.replace('/(tabs)');
      else setError('No active subscription found on this Google account.');
    });

  const trial = price?.hasTrial !== false;
  const billingDate = formatDate(u.access.billingStartsIfSubscribedToday);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: insets.top + space(8), paddingBottom: insets.bottom + space(8), gap: space(5) }}>
        <Panel tag={locked ? 'Free window closed' : 'Subscription'} accent={colors.gold}>
          <T variant="title" style={{ color: colors.gold }}>
            {locked ? `Day ${u.access.day}` : 'The Protocol'}
          </T>
          <T style={{ marginTop: space(2) }}>{locked ? MESSAGES.locked[0] : 'Manage your commitment to the Protocol.'}</T>
          <View style={{ marginTop: space(4), gap: space(2) }}>
            <T variant="caption">
              Level {u.player.level} · {u.player.rank.name} Rank · {u.player.workoutsCompleted} {u.player.workoutsCompleted === 1 ? 'Directive' : 'Directives'} cleared so far.
            </T>
            <T variant="caption">Your progress, plan and history are saved.</T>
          </View>
        </Panel>

        {u.access.phase === 'free' ? (
          // Subscribing early would start the 6 trial days now and shorten the total free period.
          <Panel tag="Free period">
            <T>
              {u.access.freeDaysLeft} free {u.access.freeDaysLeft === 1 ? 'day' : 'days'} left. On day {FREE_DAYS_BEFORE_PAYWALL + 1} you can start the monthly plan with{' '}
              {TRIAL_DAYS_AFTER_SUBSCRIBE} more days free — {FREE_DAYS_BEFORE_PAYWALL + TRIAL_DAYS_AFTER_SUBSCRIBE} free days in total.
            </T>
            {price?.price ? (
              <T variant="caption" style={{ marginTop: space(2) }}>
                Price after the trial: {price.price} / month.
              </T>
            ) : null}
          </Panel>
        ) : u.access.hasAccess ? (
          <Panel tag="Status">
            <T>
              {u.access.phase === 'trial' ? 'Free trial active' : 'Subscribed'}
              {u.access.expiresAt ? ` · renews/ends ${new Date(u.access.expiresAt).toLocaleDateString()}` : ''}
            </T>
            <Button title="Manage in Google Play" variant="ghost" onPress={() => void manageSubscription()} style={{ marginTop: space(3) }} />
          </Panel>
        ) : (
          <Panel tag="Monthly commitment">
            <View style={{ gap: space(3) }}>
              <Row>
                <T style={{ color: colors.success, fontFamily: fonts.bold }}>✓</T>
                <T style={{ flex: 1 }}>Personal Directives for every training day</T>
              </Row>
              <Row>
                <T style={{ color: colors.success, fontFamily: fonts.bold }}>✓</T>
                <T style={{ flex: 1 }}>Calorie and protein targets that adapt every 3 weeks</T>
              </Row>
              <Row>
                <T style={{ color: colors.success, fontFamily: fonts.bold }}>✓</T>
                <T style={{ flex: 1 }}>Levels, ranks, attributes and your full history</T>
              </Row>
            </View>
            <View style={{ marginTop: space(5), alignItems: 'center' }}>
              {price === undefined ? (
                <T variant="caption">Loading price…</T>
              ) : price ? (
                <>
                  <T style={{ fontFamily: fonts.bold, fontSize: 30 }}>
                    {price.price}
                    <T variant="caption"> / month</T>
                  </T>
                  {trial ? (
                    <T style={{ color: colors.success, textAlign: 'center', marginTop: space(1) }}>
                      {TRIAL_DAYS_AFTER_SUBSCRIBE} more days free · first charge on {billingDate}
                    </T>
                  ) : (
                    <T variant="caption" style={{ textAlign: 'center' }}>
                      You've already used your free trial on this Google account, so billing starts today.
                    </T>
                  )}
                </>
              ) : (
                <T variant="caption" style={{ textAlign: 'center' }}>
                  Price unavailable. Make sure you installed the app from Google Play and are signed in to the Play Store.
                </T>
              )}
            </View>
            <Button title={trial ? `Start ${TRIAL_DAYS_AFTER_SUBSCRIBE}-day free trial` : 'Subscribe'} onPress={() => void onSubscribe()} loading={busy} disabled={!price} style={{ marginTop: space(4) }} />
            <T variant="caption" style={{ textAlign: 'center', marginTop: space(3) }}>
              Billed monthly through Google Play until you cancel. Cancel anytime in Google Play → Subscriptions{trial ? ` before ${billingDate} and you won't be charged` : ''}.
            </T>
          </Panel>
        )}

        {error ? <T style={{ color: colors.danger, textAlign: 'center' }}>{error}</T> : null}

        <View style={{ gap: space(3) }}>
          <Button title="Restore purchase" variant="ghost" onPress={() => void onRestore()} disabled={busy} />
          {locked ? (
            <Button title="Sign out" variant="ghost" onPress={() => void signOut().then(() => router.replace('/'))} style={{ borderWidth: 0 }} />
          ) : (
            <Button title="Back" variant="ghost" onPress={() => router.back()} style={{ borderWidth: 0 }} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
