import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { api, ApiError, saveSession } from '@/lib/api';
import { loadMe } from '@/lib/store';
import { Button, Input, Panel, Screen, T } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function ResetPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new ApiError(400, 'email', 'Enter a valid email address.');
      await api('/auth/password/forgot', { method: 'POST', body: { email: email.trim() }, auth: false });
      setSent(true);
    });

  const reset = () =>
    run(async () => {
      if (!/^\d{6}$/.test(code)) throw new ApiError(400, 'code', 'Enter the 6-digit code from the email.');
      if (password.length < 8) throw new ApiError(400, 'password', 'Password must be at least 8 characters.');
      const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/password/reset', {
        method: 'POST',
        body: { email: email.trim(), code, password },
        auth: false,
      });
      await saveSession(tokens);
      await loadMe();
      router.replace('/');
    });

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: space(6) }}>
        <Panel tag="Identity recovery">
          <View style={{ gap: space(4) }}>
            {!sent ? (
              <>
                <T>Enter your email. If an account exists, the Protocol will send a 6-digit reset code.</T>
                <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
                <Button title="Send code" onPress={sendCode} loading={busy} />
              </>
            ) : (
              <>
                <T>Check {email.trim()} for your code. It expires in 15 minutes.</T>
                <Input label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" placeholder="123456" />
                <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" />
                <Button title="Reset password" onPress={reset} loading={busy} />
                <Button title="Send a new code" variant="ghost" onPress={sendCode} disabled={busy} />
              </>
            )}
            {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
            <Button title="Back to sign in" variant="ghost" onPress={() => router.back()} style={{ borderWidth: 0 }} />
          </View>
        </Panel>
      </KeyboardAvoidingView>
    </Screen>
  );
}
