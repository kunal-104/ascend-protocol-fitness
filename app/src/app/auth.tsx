import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, signIn } from '@/lib/api';
import { loadMe } from '@/lib/store';
import { Button, Input, Panel, Screen, T } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function Auth() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'login' | 'register'>(params.mode === 'login' ? 'login' : 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  async function submit() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      await signIn(mode, email, password);
      await loadMe();
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: space(6), paddingTop: insets.top }}>
        <Panel tag={mode === 'register' ? 'Registration' : 'Identity check'}>
          <T variant="heading" style={{ marginBottom: space(4) }}>
            {mode === 'register' ? 'Bind your identity to the Protocol.' : 'Welcome back, Initiate.'}
          </T>
          <View style={{ gap: space(4) }}>
            <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="At least 8 characters"
              onSubmitEditing={submit}
            />
            {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
            <Button title={mode === 'register' ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} />
            {mode === 'login' ? (
              <Button
                variant="ghost"
                title="Forgot password?"
                onPress={() => router.push({ pathname: '/reset-password', params: { email } })}
                style={{ borderWidth: 0, paddingVertical: space(2) }}
              />
            ) : null}
            <Button
              variant="ghost"
              title={mode === 'register' ? 'I already have an account' : 'Create a new account'}
              onPress={() => {
                setError(null);
                setMode(mode === 'register' ? 'login' : 'register');
              }}
            />
          </View>
        </Panel>
      </KeyboardAvoidingView>
    </Screen>
  );
}
