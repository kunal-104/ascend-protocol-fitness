import { Platform } from 'react-native';
import { api, BILLING_MODE } from './api';
import type { UserState } from './types';

/** Must match the Play Console product and offer (see docs/PLAY_STORE.md) and the server config. */
export const SUBSCRIPTION_ID = process.env.EXPO_PUBLIC_PLAY_SUBSCRIPTION_ID ?? 'ascend_monthly';
export const TRIAL_OFFER_ID = process.env.EXPO_PUBLIC_PLAY_TRIAL_OFFER_ID ?? 'free-trial-6d';

export interface PriceInfo {
  price: string;
  hasTrial: boolean;
}

type Iap = typeof import('expo-iap');
let iapModule: Iap | null | undefined;

/** expo-iap is a native module: it isn't available in Expo Go or on web. */
async function iap(): Promise<Iap | null> {
  if (iapModule !== undefined) return iapModule;
  if (BILLING_MODE === 'mock' || Platform.OS === 'web') return (iapModule = null);
  try {
    iapModule = await import('expo-iap');
    await iapModule.initConnection();
  } catch {
    iapModule = null;
  }
  return iapModule;
}

async function loadOffer() {
  const m = await iap();
  if (!m) return null;
  const products = await m.fetchProducts({ skus: [SUBSCRIPTION_ID], type: 'subs' });
  const product = products?.find((p) => p.id === SUBSCRIPTION_ID);
  if (!product || !('subscriptionOffers' in product)) return null;
  const offers = product.subscriptionOffers ?? [];
  // Google only returns the trial offer to users who are still eligible for it.
  const trial = offers.find((o) => o.id === TRIAL_OFFER_ID && o.offerTokenAndroid);
  const base = offers.find((o) => !o.id || o.id === o.basePlanIdAndroid) ?? offers.find((o) => o.offerTokenAndroid);
  return { product, offer: trial ?? base, hasTrial: !!trial };
}

export async function getPriceInfo(): Promise<PriceInfo | null> {
  if (BILLING_MODE === 'mock') return { price: '₹99.00 (test)', hasTrial: true };
  const o = await loadOffer().catch(() => null);
  if (!o) return null;
  return { price: o.product.displayPrice, hasTrial: o.hasTrial };
}

/**
 * Start the Google Play subscription flow, then verify the purchase on our server (which acknowledges it).
 * Resolves with the updated user state, or null if the user cancelled.
 */
export async function subscribe(): Promise<UserState | null> {
  if (BILLING_MODE === 'mock') return api<UserState>('/billing/mock/subscribe', { method: 'POST' });
  const m = await iap();
  if (!m) throw new Error('Purchases are only available in the Play Store build of the app.');
  const o = await loadOffer();
  if (!o?.offer?.offerTokenAndroid) throw new Error('Subscription is not available right now. Please try again later.');

  return new Promise<UserState | null>((resolve, reject) => {
    const cleanup = () => {
      ok.remove();
      err.remove();
    };
    const ok = m.purchaseUpdatedListener(async (purchase) => {
      if (purchase.productId !== SUBSCRIPTION_ID || !purchase.purchaseToken) return;
      cleanup();
      try {
        const state = await api<UserState>('/billing/google/verify', {
          method: 'POST',
          body: { purchaseToken: purchase.purchaseToken, productId: purchase.productId },
        });
        await m.finishTransaction({ purchase, isConsumable: false });
        resolve(state);
      } catch (e) {
        reject(e);
      }
    });
    const err = m.purchaseErrorListener((e) => {
      cleanup();
      if (String(e.code).toLowerCase().includes('cancel')) resolve(null);
      else reject(new Error(e.message));
    });
    m.requestPurchase({
      type: 'subs',
      request: { google: { skus: [SUBSCRIPTION_ID], subscriptionOffers: [{ sku: SUBSCRIPTION_ID, offerToken: o.offer!.offerTokenAndroid! }] } },
    }).catch((e: unknown) => {
      cleanup();
      reject(e instanceof Error ? e : new Error(String(e)));
    });
  });
}

/** Re-sync purchases made on this Google account (new phone, reinstall). */
export async function restorePurchases(): Promise<UserState | null> {
  const m = await iap();
  if (!m) return null;
  const purchases = await m.getAvailablePurchases();
  let latest: UserState | null = null;
  for (const p of purchases) {
    if (p.productId !== SUBSCRIPTION_ID || !p.purchaseToken) continue;
    latest = await api<UserState>('/billing/google/verify', { method: 'POST', body: { purchaseToken: p.purchaseToken } });
  }
  return latest;
}

export async function manageSubscription() {
  const m = await iap();
  await m?.deepLinkToSubscriptions({ skuAndroid: SUBSCRIPTION_ID });
}
