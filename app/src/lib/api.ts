import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Set EXPO_PUBLIC_API_URL in app/.env. 10.0.2.2 is the host machine as seen from the Android emulator. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000';
export const BILLING_MODE = process.env.EXPO_PUBLIC_BILLING_MODE === 'mock' ? 'mock' : 'play';

const REFRESH_KEY = 'ascend.refreshToken';

// SecureStore is native-only; the web build (used for previews) falls back to localStorage.
const tokenStore =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
        setItemAsync: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v),
        deleteItemAsync: async (k: string) => globalThis.localStorage?.removeItem(k),
      }
    : SecureStore;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSignedOut: (() => void) | null = null;

export function setSignedOutHandler(fn: () => void) {
  onSignedOut = fn;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

async function saveTokens(t: TokenResponse) {
  accessToken = t.accessToken;
  await tokenStore.setItemAsync(REFRESH_KEY, t.refreshToken);
}

export async function hasSession(): Promise<boolean> {
  return !!(await tokenStore.getItemAsync(REFRESH_KEY));
}

async function refreshAccess(): Promise<boolean> {
  refreshing ??= (async () => {
    const rt = await tokenStore.getItemAsync(REFRESH_KEY);
    if (!rt) return false;
    try {
      const res = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (res.status === 401) {
        await tokenStore.deleteItemAsync(REFRESH_KEY);
        return false;
      }
      if (!res.ok) throw new ApiError(res.status, 'refresh_failed', 'Could not reach the Protocol');
      await saveTokens((await res.json()) as TokenResponse);
      return true;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const send = () =>
    fetch(`${API_URL}/v1${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res: Response;
  try {
    if (auth && !accessToken) await refreshAccess();
    res = await send();
    if (auth && res.status === 401) {
      if (await refreshAccess()) res = await send();
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, 'network', 'No connection to the Protocol. Check your internet and try again.');
  }

  if (auth && res.status === 401) {
    accessToken = null;
    onSignedOut?.();
    throw new ApiError(401, 'unauthorized', 'Session expired. Please sign in again.');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; issues?: { message: string }[] };
  if (!res.ok) {
    const msg = data.message ?? data.issues?.[0]?.message ?? 'Something went wrong';
    throw new ApiError(res.status, data.error ?? 'error', msg);
  }
  return data as T;
}

export async function signIn(mode: 'login' | 'register', email: string, password: string) {
  const t = await api<TokenResponse>(`/auth/${mode}`, { method: 'POST', body: { email: email.trim(), password }, auth: false });
  await saveTokens(t);
}

export async function signOut() {
  const rt = await tokenStore.getItemAsync(REFRESH_KEY);
  accessToken = null;
  await tokenStore.deleteItemAsync(REFRESH_KEY);
  if (rt) await api('/auth/logout', { method: 'POST', body: { refreshToken: rt }, auth: false }).catch(() => undefined);
}
