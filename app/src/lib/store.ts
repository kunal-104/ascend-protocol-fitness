import { useSyncExternalStore } from 'react';
import { api, hasSession, setSignedOutHandler, signOut as apiSignOut } from './api';
import type { MeResponse, UserState } from './types';

interface StoreState {
  ready: boolean;
  signedIn: boolean;
  me: MeResponse | null;
}

let state: StoreState = { ready: false, signedIn: false, me: null };
const listeners = new Set<() => void>();

function set(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useStore<T>(select: (s: StoreState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(state),
  );
}

/** Current state outside React (e.g. inside effects that shouldn't re-run on every change). */
export function getMe(): MeResponse | null {
  return state.me;
}

/** The onboarded user's state; screens behind the onboarding gate can rely on it. */
export function useUser(): UserState {
  const me = useStore((s) => s.me);
  if (!me || !me.onboarded) throw new Error('useUser() used before onboarding');
  return me;
}

export function setUser(u: UserState) {
  set({ me: { onboarded: true, ...u } });
}

export async function loadMe() {
  const me = await api<MeResponse>('/me');
  set({ me, signedIn: true });
  return me;
}

export async function bootstrap() {
  setSignedOutHandler(() => set({ signedIn: false, me: null }));
  try {
    if (await hasSession()) await loadMe();
  } catch {
    // Offline or expired: the gate will show the sign-in screen or a retry.
  } finally {
    set({ ready: true });
  }
}

export async function signOut() {
  await apiSignOut();
  set({ signedIn: false, me: null });
}
