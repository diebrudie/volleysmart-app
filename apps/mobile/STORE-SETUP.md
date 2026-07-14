# Store submission guide (iOS App Store + Google Play)

What's already done in code (this branch) vs. what you need to do (accounts,
builds, listings). Work top to bottom.

## Already configured in the repo
- `app.json`: `ios.bundleIdentifier` and `android.package` = **`app.volleysmart`**
  (⚠️ permanent once you submit — change it now if you want something else),
  app version `1.0.0`, app icon + Android adaptive icon, splash screen.
- `app.json`: `expo-image-picker` plugin with an iOS photo-library usage string
  (no camera — the app only picks from the library).
- `eas.json`: `development`, `preview`, `production` build profiles + a
  `production` submit profile (`appVersionSource: remote`, so EAS manages build
  numbers / version codes automatically).
- In-app **Terms/Privacy** links (menu drawer + signup screen).
- **Account deletion**: in-app (Profile → Delete Account) *and* a public web
  page at `https://volleysmart.app/delete-account` (required by Google Play).

## Store-listing URLs
| Item | URL |
| --- | --- |
| Privacy policy | https://volleysmart.app/privacy |
| Terms | https://volleysmart.app/terms |
| Account/data deletion | https://volleysmart.app/delete-account |

## Prerequisites (need your login — I can't do these)
1. **Apple Developer Program** — $99/yr (developer.apple.com).
2. **Google Play Console** — $25 one-time (play.google.com/console).
3. EAS CLI: `npm i -g eas-cli` and `eas login`.

## Step 1 — Initialize EAS
From `apps/mobile`:
```bash
eas init          # creates the EAS project + writes extra.eas.projectId into app.json
eas build:configure   # confirms iOS + Android build config
```

## Step 2 — Build-time env vars
The app reads `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and
`EXPO_PUBLIC_MAPBOX_TOKEN` from the environment at build time (they're currently
only in local `apps/mobile/.env`). Create them as EAS environment variables so
cloud builds pick them up (they're public client keys → plaintext is fine):
```bash
eas env:create --environment preview     --name EXPO_PUBLIC_SUPABASE_URL      --value "<url>"  --visibility plaintext
eas env:create --environment preview     --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<key>"  --visibility plaintext
eas env:create --environment preview     --name EXPO_PUBLIC_MAPBOX_TOKEN      --value "<tok>"  --visibility plaintext
# repeat with --environment production
```

## Step 3 — Build
```bash
eas build --platform ios     --profile preview   # or: production
eas build --platform android  --profile preview
```

## Step 4 — Test the real binary (do NOT skip)
The app has only run in Expo Go / Expo web so far. A native build can surface
issues Expo Go hides. Test on real devices via **TestFlight** (iOS) and the Play
**internal testing** track. Specifically verify:
- Google sign-in redirect (`volleysmart://` scheme) in the standalone build.
- Photo picker (profile + club images) prompts and works.
- New Architecture is on (`newArchEnabled: true`) — exercise animations,
  live-score landscape, sheets.

## Step 5 — Store listings (in App Store Connect / Play Console)
- Screenshots for required device sizes; app description, keywords, category
  (Sports), support URL.
- **Apple App Privacy** questionnaire + **Google Data Safety** form: declare
  email, name, and user-generated content; no third-party ad tracking.
- Content/age rating questionnaire.
- Privacy policy URL (table above). Account-deletion URL goes in Play Console's
  "Data deletion" field.

## Step 6 — Submit
```bash
eas submit --platform ios      --profile production
eas submit --platform android   --profile production
```

## Open decisions / risks
- **Bundle id `app.volleysmart`** — confirm before the first build (permanent
  after submission).
- **`support@volleysmart.app`** — the deletion page tells users to email this
  for out-of-app deletion requests. Make sure that inbox exists and is
  monitored, or change it in `apps/web/src/pages/DeleteAccountPage.tsx`.
- **Apple Guideline 4.8** — you offer Google sign-in, so Apple may require an
  equivalent privacy option. Your email/password signup (collects only name +
  email) likely satisfies this, so Sign in with Apple is probably NOT required.
  If a reviewer pushes back, the fix is to add Sign in with Apple
  (`expo-apple-authentication` + enable the Apple provider in Supabase). Not
  built yet — decide based on review feedback.
