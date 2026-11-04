# Copyright, trademark and store-policy notes

> This is a practical checklist, **not legal advice**. Before launch, have an IP lawyer review the final name, logo and store listing.

## Can we make a "Solo Leveling-style" fitness app?

**Yes, as long as it is inspired by the genre and doesn't copy the work.**

- **Ideas and genres are not protected by copyright.** These are common to video games and "LitRPG"/"system" stories in general, and anyone may use them:
  - a game-like "System" that gives daily quests,
  - status windows, levels, XP, stats and ranks,
  - an underdog who grows stronger.
- **Expression is protected.** That means the specific characters, names, artwork, panels, animation, music, logos and distinctive text of *Solo Leveling* (owned by its author, publishers and licensees, including D&C Media / Kakao Entertainment and the anime studio and distributors).
- **Names and logos can be trademarks.** "Solo Leveling" and related marks are registered or used commercially. Using them in an app name, icon, screenshots or keywords can get the app removed from Google Play and invite legal action.

## What this app does (and why it's safe)

| Area | What we did |
|---|---|
| Name | **Ascend Protocol**, an original name |
| Lore | Original: a dormant "Protocol" calibrates "Initiates". No hunters, gates, dungeons, shadows or monarchs |
| Ranks | Ember → Iron → Steel → Cobalt → Obsidian → Ascendant (not E–S letter ranks) |
| Terms | Daily Directive, Stillness Day, Recovery Rite, Calibration, Provisions, Essence, Chain, Overdrive |
| Quests | Personalised, evidence-based workouts, never the famous "100 push-ups, 100 sit-ups, 100 squats, 10 km" quest |
| Penalties | No "penalty zone" mechanic. Missing a day only resets the Chain, and the copy is supportive |
| Visuals | Our own HUD style (glowing panels, corner brackets) and our own icon. No screenshots, fan art, characters or fonts from the show |
| Catch-phrases | None from the series (e.g. not "Arise") |

`packages/core/src/lore.ts` holds all the story text in one place, with a header comment saying not to add copyrighted material.

## Never do these

- Use "Solo Leveling", character names (e.g. Sung Jinwoo) or iconic phrases in the app, store title, description, keywords, ads or social posts.
- Use anime screenshots, clips, music or fan art in the store listing or marketing.
- Describe the app as "the Solo Leveling app" or "the official System". You *may* say generic things like "turn your workouts into an RPG".
- Copy the exact UI of the anime's System windows frame-for-frame. Our panels are generic HUD design; keep it that way.
- Use another app's name. There are existing fitness apps with RPG themes (including ones using words like "Arise"). Check the store before choosing names.

## Trademark checks before launch

1. Search for "Ascend Protocol" (and any final name) in:
   - **IP India** (ipindiaservices.gov.in), **USPTO** (tmsearch.uspto.gov), **EUIPO**, and the **WIPO Global Brand Database**;
   - classes **9** (apps), **41** (fitness instruction) and **44** (nutrition advice);
   - the Google Play Store itself.
2. "Ascend" is a common word, so expect similar marks. A lawyer can judge the risk of confusion.
3. Consider registering your own trademark once the name is final.

## Google Play policies that apply

- **Health apps declaration** (Play Console → App content). The app provides fitness and nutrition information and is *not* a medical device. The in-app disclaimer is in `DISCLAIMER` (`lore.ts`).
- **Subscriptions policy.** Before purchase, clearly show the price, billing period, trial length, the first charge date and how to cancel. The paywall screen does this.
- **Account deletion.** Required both in the app (Settings → Delete account) and through a web link listed in the Data safety form. You'll need a simple web page or email address for deletion requests.
- **Data safety form.** The app collects email, health & fitness data (height, weight, health-screening answers, workouts) and purchase history. Declare these, say the data is encrypted in transit, and say users can request deletion.
- **Privacy policy.** Required. A template is in [PRIVACY_POLICY.md](PRIVACY_POLICY.md).
- **Target audience.** The app allows ages 16+ (`MIN_AGE`). Set the Play target audience to 16+ or 18+ (not under 13) to stay out of the Families programme.

## Data protection

- **India: Digital Personal Data Protection Act 2023.** Get clear consent, use data only for the stated purpose, honour deletion requests and protect the data.
- **EU users: GDPR.** Health data is a special category: get explicit consent (the onboarding health-screen consent covers this), keep data to a minimum, and allow export and deletion.
