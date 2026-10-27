import { APP_NAME, INTRO_SEQUENCE } from '@ascend/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Panel, Screen, T, Typewriter } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const [line, setLine] = useState(0);
  const finished = line >= INTRO_SEQUENCE.length;

  return (
    <Screen style={{ paddingTop: insets.top + space(10), paddingBottom: insets.bottom + space(6), paddingHorizontal: space(6) }}>
      <T variant="label" style={{ textAlign: 'center' }}>
        ◆ {APP_NAME} ◆
      </T>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Panel tag="Incoming transmission">
          <View style={{ gap: space(3), minHeight: 220 }}>
            {INTRO_SEQUENCE.slice(0, line + 1).map((text, i) =>
              i < line ? (
                <T key={i} style={{ color: colors.textDim }}>
                  {text}
                </T>
              ) : (
                <Typewriter key={i} text={text} onDone={() => setTimeout(() => setLine((l) => l + 1), 450)} style={{ fontSize: 18 }} />
              ),
            )}
          </View>
        </Panel>
      </View>
      <View style={{ gap: space(3) }}>
        <Button title="Accept the Protocol" disabled={!finished} onPress={() => router.push({ pathname: '/auth', params: { mode: 'register' } })} />
        <Button title="I am already an Initiate" variant="ghost" onPress={() => router.push({ pathname: '/auth', params: { mode: 'login' } })} />
        {!finished ? (
          <Button title="Skip intro" variant="ghost" onPress={() => setLine(INTRO_SEQUENCE.length)} style={{ borderWidth: 0 }} />
        ) : null}
      </View>
    </Screen>
  );
}
