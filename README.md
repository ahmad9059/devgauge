# DevGauge

Android-only Expo app foundation for a local-first coding-agent usage dashboard. The ten-phase product plan is in [`docs/plans/devgauge-mobile-provider-dashboard/`](docs/plans/devgauge-mobile-provider-dashboard/00-MASTER-PLAN.md).

## Set up

Use Node 24 LTS, npm, JDK 17 or a compatible Android Studio runtime, and an Android SDK/emulator or a test device.

```sh
npm ci
npm run check
npm run format:check
npx expo install --check
```

To launch the Android development build, start an emulator or connect a device, then run `npm run android` (`expo run:android`). For an EAS build, set up an Expo project and run `eas build --platform android --profile development`. Android development package names and the callback scheme in `app.config.ts` are provisional. Production builds require `ANDROID_PACKAGE` with an owner-approved ID.

For the signed-in Phase 1 phone check, use the locally built self-contained APK at `artifacts/devgauge-phase1-preview.apk` (no Metro server required; generated artifacts are gitignored). SHA-256 of the current local build (SQLCipher enabled): `2d90a6f1129eda52ba9a517e89aba63fda7d959728bb7c7aecdb58d8e010cd26`. To rebuild locally, run `npm run android:preview-apk`; the checksum changes on rebuild. This APK uses the Android template's debug signing key and must not be submitted to Google Play. See the [redacted-results checklist](docs/plans/devgauge-mobile-provider-dashboard/PHASE-01-ANDROID-TEST-INSTRUCTIONS.md).

## Current scope

The app contains a themed three-tab shell (Usage, Connectors, Settings) plus provider detail, connect, onboarding, support, legal, diagnostics, and future per-provider auth callbacks. The dark and light themes, typography, spacing, motion, responsive phone/tablet layout, and reusable UI primitives live in `src/design/` and `src/components/ui/`. Screens render static design fixtures for all six providers and every connector state. An encrypted local layer (SQLCipher via `expo-sqlite`, migrations, typed repositories, and an `expo-secure-store` credential vault) lives in `src/storage/`, a provider platform (closed six-provider registry, HTTP allowlist/timeout/backoff policy, per-connection refresh engine, and signed capability manifest) lives in `src/domain/`, `src/providers/`, `src/services/`, and `src/features/dashboard/`, and release-disabled connectors live in `src/providers/github-copilot/`, `src/providers/command-code/`, `src/providers/opencode-go/`, and `src/services/auth/`. None is wired to the UI yet; there is still no production connector, account login, or quota fetching.

In a development build or the explicit internal-preview profile, Settings → Diagnostics opens the Android WebView feasibility spike (test accounts only), the local storage self-test (SQLCipher/migrations/repositories), and the design-system gallery (every provider/component state in both themes). Follow the [Phase 1 evidence matrix](docs/plans/devgauge-mobile-provider-dashboard/PHASE-01-FEASIBILITY.md); Phase 3 status is in [PHASE-03-EXECUTION.md](docs/plans/devgauge-mobile-provider-dashboard/PHASE-03-EXECUTION.md).

`APP_VARIANT` is a build-time selector (`development`, `preview`, `production`), not a secret. The internal preview profile sets `EXPO_PUBLIC_SPIKE_TEST=1` to make the tester's APK self-contained without Metro; production always hides diagnostics even if that flag is set. Never put provider credentials in app config, `.env`, or `EXPO_PUBLIC_*` values.

When production ownership is decided, configure `ANDROID_PACKAGE` as a **plain-text** value in the EAS production environment or locally for a production build. It is an app ID, not a credential. The production config deliberately fails without it.
