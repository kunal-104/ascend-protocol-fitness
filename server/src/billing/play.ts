import type { SubscriptionState } from '@ascend/core';
import { GoogleAuth } from 'google-auth-library';

/**
 * Google Play Developer API (subscriptions v2).
 * https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2
 */
export interface PlaySubscriptionPurchase {
  subscriptionState?: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  lineItems?: {
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
    offerDetails?: { basePlanId?: string; offerId?: string };
    offerPhase?: { freeTrial?: object; introductoryPrice?: object; basePrice?: object };
  }[];
}

export interface PlayApi {
  getSubscription(purchaseToken: string): Promise<PlaySubscriptionPurchase>;
  acknowledge(productId: string, purchaseToken: string): Promise<void>;
}

const BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

export function createPlayApi(packageName: string): PlayApi {
  // Credentials come from GOOGLE_APPLICATION_CREDENTIALS (service-account JSON linked in Play Console → API access).
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
  const pkg = encodeURIComponent(packageName);
  return {
    async getSubscription(token) {
      const res = await auth.request<PlaySubscriptionPurchase>({
        url: `${BASE}/${pkg}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,
      });
      return res.data;
    },
    async acknowledge(productId, token) {
      await auth.request({
        url: `${BASE}/${pkg}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,
        method: 'POST',
        data: {},
      });
    },
  };
}

export interface MappedSubscription {
  state: SubscriptionState;
  productId: string;
  expiresAt: Date | null;
  autoRenewing: boolean;
  needsAcknowledgement: boolean;
  linkedPurchaseToken?: string;
}

const STATE_MAP: Record<string, SubscriptionState> = {
  SUBSCRIPTION_STATE_PENDING: 'pending',
  SUBSCRIPTION_STATE_ACTIVE: 'active',
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'grace',
  SUBSCRIPTION_STATE_ON_HOLD: 'on_hold',
  SUBSCRIPTION_STATE_PAUSED: 'paused',
  SUBSCRIPTION_STATE_CANCELED: 'canceled',
  SUBSCRIPTION_STATE_EXPIRED: 'expired',
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'expired',
};

export function mapPlaySubscription(p: PlaySubscriptionPurchase, trialOfferId: string): MappedSubscription {
  const items = p.lineItems ?? [];
  const latest = [...items].sort((a, b) => (b.expiryTime ?? '').localeCompare(a.expiryTime ?? ''))[0];
  let state = STATE_MAP[p.subscriptionState ?? ''] ?? 'expired';
  const inTrial = !!latest?.offerPhase?.freeTrial || (!latest?.offerPhase && latest?.offerDetails?.offerId === trialOfferId);
  if (state === 'active' && inTrial) state = 'trial';
  return {
    state,
    productId: latest?.productId ?? '',
    expiresAt: latest?.expiryTime ? new Date(latest.expiryTime) : null,
    autoRenewing: !!latest?.autoRenewingPlan?.autoRenewEnabled,
    needsAcknowledgement: p.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING',
    linkedPurchaseToken: p.linkedPurchaseToken,
  };
}
