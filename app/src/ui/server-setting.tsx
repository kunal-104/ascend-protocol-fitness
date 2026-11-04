import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { checkServer, getApiUrl, SERVER_EDITABLE, setApiUrl } from '@/lib/api';
import { Button, Input, Panel, T } from './components';
import { colors, space } from './theme';

/** Test builds only: lets the tester enter the address of the computer running `npm run dev:lite`. */
export function ServerSetting() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(getApiUrl());
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!SERVER_EDITABLE) return null;

  async function save() {
    setBusy(true);
    setStatus(null);
    const saved = await setApiUrl(url);
    setUrl(saved);
    const ok = await checkServer(saved);
    setBusy(false);
    if (ok) setOpen(false);
    else setStatus(`No server answered at ${saved}. Check that dev:lite is running and the phone is on the same Wi-Fi.`);
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        <T variant="caption" style={{ textAlign: 'center', textDecorationLine: 'underline' }}>
          Test server: {getApiUrl()}
        </T>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,4,12,0.85)', justifyContent: 'center', padding: space(6) }}>
          <Panel tag="Test server">
            <View style={{ gap: space(3) }}>
              <T variant="caption">
                Enter your computer's Wi-Fi IP and port, e.g. 192.168.1.20:4000. Your computer must be running npm run dev:lite.
              </T>
              <Input value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="192.168.1.20:4000" />
              {status ? <T style={{ color: colors.danger }}>{status}</T> : null}
              <Button title="Save & test" onPress={() => void save()} loading={busy} />
              <Button title="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            </View>
          </Panel>
        </View>
      </Modal>
    </>
  );
}
