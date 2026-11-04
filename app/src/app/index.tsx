import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { loadMe, signOut, useStore } from '@/lib/store';
import { Button, Panel, Screen, T } from '@/ui/components';
import { space } from '@/ui/theme';

/** Routing gate: sends the user to the right place for their state. */
export default function Gate() {
  const signedIn = useStore((s) => s.signedIn);
  const me = useStore((s) => s.me);
  const [retrying, setRetrying] = useState(false);

  if (!signedIn && !me) return <Redirect href="/welcome" />;
  if (!me) {
    return (
      <Screen style={{ justifyContent: 'center', padding: space(6) }}>
        <Panel tag="Connection lost">
          <T style={{ marginBottom: space(4) }}>The Protocol cannot be reached. Check your connection.</T>
          <View style={{ gap: space(3) }}>
            <Button
              title="Retry"
              loading={retrying}
              onPress={() => {
                setRetrying(true);
                loadMe()
                  .catch(() => undefined)
                  .finally(() => setRetrying(false));
              }}
            />
            <Button title="Sign out" variant="ghost" onPress={() => void signOut()} />
          </View>
        </Panel>
      </Screen>
    );
  }
  if (!me.onboarded) return <Redirect href="/onboarding" />;
  if (!me.access.hasAccess) return <Redirect href="/paywall" />;
  return <Redirect href="/(tabs)" />;
}
