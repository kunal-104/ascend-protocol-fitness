# Google Play release and subscription setup

## How the free days and subscription work

```
Day 1 ─────────── Day 9 │ Day 10 ────────── Day 15 │ Day 16 →
   free (no payment)    │ must subscribe to continue │ first monthly charge
                        │ 6-day Google Play trial    │
```

- **Days 1–9:** free, no card needed. From day 7 the app warns that the free days are ending.
- **Day 10:** the app locks behind the paywall. The user starts the subscription. Google Play's **6-day free trial** means nothing is charged yet.
- **Day 16:** Google charges the first month, then charges monthly until the user cancels.
- **Before day 10:** the paywall doesn't show a subscribe button, because subscribing early would start the 6 trial days sooner and shorten the 15 free days.
- **No second trial:** Google gives the trial only once per Google account. A returning user pays from the day they subscribe, and the paywall says so.
- **Configurable values:** `FREE_DAYS_BEFORE_PAYWALL` and `TRIAL_DAYS_AFTER_SUBSCRIBE` in `packages/core/src/access.ts`. If you change the trial length, change it in Play Console too.

## 1. One-time setup

1. Create a **Google Play Developer account**: one-time US$25 fee, plus identity verification.
2. Create an **Expo account** and install the EAS CLI: `npm i -g eas-cli && eas login`.
3. In `app/`, run `eas init` to link the project, then confirm `android.package` in `app.json` (`com.ascendprotocol.app`). The package name cannot be changed after the first upload.

## 2. Build and upload a first version

```bash
cd app
cp .env.example .env    # set EXPO_PUBLIC_API_URL to your deployed API (https), EXPO_PUBLIC_BILLING_MODE=play
eas build -p android --profile production   # produces an .aab
```

In Play Console: **Create app**, then **Testing → Internal testing → Create release**, upload the `.aab` and roll it out to yourself. Play only lets you create subscriptions after a build with the billing library has been uploaded.

## 3. Create the subscription

Play Console → **Monetize with Play → Products → Subscriptions → Create subscription**

| Field | Value |
|---|---|
| Product ID | `ascend_monthly` (must match `PLAY_SUBSCRIPTION_ID` / `EXPO_PUBLIC_PLAY_SUBSCRIPTION_ID`) |
| Base plan | ID `monthly`, auto-renewing, billing period **1 month**, set your price (e.g. ₹99) and let Play convert it for other countries |
| Offer | ID `free-trial-6d` (must match `PLAY_TRIAL_OFFER_ID`), eligibility **New customer acquisition → Never had this subscription**, phase **Free trial, 6 days** |

Activate the base plan and the offer.

## 4. Let the server check purchases

1. Play Console → **Setup → API access**: link a Google Cloud project.
2. In Google Cloud, create a **service account** and download its JSON key.
3. Back in Play Console, invite the service account under **Users and permissions** with the *View financial data* and *Manage orders and subscriptions* permissions.
4. On the server, set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`, plus `BILLING_MODE=play`, `PLAY_PACKAGE_NAME` and `PLAY_SUBSCRIPTION_ID`.

The server verifies every purchase with Google, stores it, and **acknowledges** it. Google refunds purchases that aren't acknowledged within 3 days.

## 5. Real-time notifications (renewals, cancellations, failed payments)

1. In Google Cloud Pub/Sub, create a topic, e.g. `play-rtdn`.
2. Grant `google-play-developer-notifications@system.gserviceaccount.com` the **Pub/Sub Publisher** role on that topic.
3. Create a **push subscription** to `https://YOUR_API/v1/billing/google/rtdn`:
   - Enable authentication with a service account (OIDC) and set the audience to that same URL.
   - On the server, set `PUBSUB_AUDIENCE` (the URL) and `PUBSUB_SERVICE_ACCOUNT_EMAIL`.
   - Simpler alternative: add `?token=<RTDN_SHARED_SECRET>` to the push URL and set `RTDN_SHARED_SECRET`.
4. Play Console → **Monetization setup**: paste the topic name and click **Send test notification**.

## 6. Test purchases

- Add your Gmail under **Setup → License testing**. Testers are never charged, and Google shortens trials and renewals so you can see the full cycle in minutes.
- Install from the internal testing link, go through 9 days (or temporarily lower `FREE_DAYS_BEFORE_PAYWALL`), subscribe, then cancel in Play → Subscriptions and watch access end at expiry.

## 7. Store listing and compliance

- **Store listing:** an original icon (`app/assets/images/icon.png`), screenshots of *your* app, and a description with no anime names (see [LEGAL.md](LEGAL.md)).
- **App content:**
  - privacy policy URL
  - Data safety form
  - Health apps declaration
  - target audience 16+/18+
  - content rating questionnaire
  - account deletion URL
- **Production release:** new personal developer accounts must run a closed test with at least 12 testers for 14 days before production access. Check the current requirement in Play Console.

## 8. Updates

- **Native changes** (new packages, `app.json`): run `eas build` again and upload.
- **JavaScript-only fixes:** `eas update` can push them without a store review.
