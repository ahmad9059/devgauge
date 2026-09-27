# Phase 2 Execution Evidence — Android Foundation

> Status: **Code foundation and native internal preview APK built; Android device verification pending.** Evidence date: 2026-09-25.

## Implemented

- Expo SDK 57 / React Native 0.86 / TypeScript 6 / npm lockfile and Node 24 CI policy (`package.json`, `.nvmrc`, `package-lock.json`).
- Android-only Expo config with development/preview/production EAS profiles (`app.config.ts`, `eas.json`). Production requires an explicitly provided Android package ID; it cannot silently ship under a development placeholder.
- Typed Expo Router stack and Usage/Connectors/Settings tabs, onboarding, provider detail, connection, legal, support, diagnostics and provider-specific OAuth callback entrypoints (`app/`). No authentication code, usage calls or local database in Phase 2.
- Route error fallback, build environment validation, development/internal-preview WebView diagnostic entry (production gated), ESLint/Prettier/Vitest and GitHub Actions CI (`src/`, `eslint.config.mjs`, `vitest.config.mts`, `.github/workflows/ci.yml`).
- Architecture decision and local run instructions (`docs/decisions/0001-android-expo-foundation.md`, `README.md`).

## Verified locally

- `npm install` completed; a separate clean `/tmp/opencode/devgauge-ci` install using only the checked-in `package.json` and `package-lock.json` passed `npm ci`. `npx expo install --check` reports compatible dependencies.
- `npm run check` passes TypeScript, ESLint, seven unit checks and three build-profile config checks, including failure for a missing production package.
- `npm run format:check` passes on app/foundation code.
- `npm run audit:deps` exits successfully with no **high-or-higher** advisory under the CI threshold.
- `npx expo export --platform android` produces an Android Hermes bundle for both default and explicit production config.
- `npx expo-doctor` passed all 21 project checks.
- A native `assembleRelease` build succeeded after enabling native access for Android Studio JBR 25 and limiting Gradle to two workers to reduce intermittent Maven DNS failures. The signed internal preview file is `artifacts/devgauge-phase1-preview.apk` (95 MB, SHA-256 `1fc4a85c3b85fc74fc2092561820fcf52107c62e06c5b6911aeea3d3bc235056`). Android build-tools verified its v2 APK signature (Android Debug certificate), package `app.devgauge.preview`, version `0.1.0`, min SDK 24, target SDK 36. The bundled Hermes asset contains the diagnostic route strings.
- The `typecheck` script generates typed routes with `expo customize tsconfig.json` at `.expo/types/router.d.ts` before compiling; `src/config/routes.typecheck.ts` ensures an invalid route is rejected during local and CI checks.

## Emulator evidence (2026-09-25)

- The machine had a Pixel 8 API 35 AVD definition but no Android 35 system image. The image was reinstalled, and the AVD booted headless (`qemu-system-x86_64-headless`, KVM active).
- `adb install` of `artifacts/devgauge-phase1-preview.apk` succeeded; `app.devgauge.preview/.MainActivity` launched cold in ~0.85s.
- The Usage tab rendered ("Usage", placeholder text, provider-detail link) and the Settings tab rendered Onboarding/Privacy/Support. Bottom tabs Usage/Connectors/Settings are present.
- A build-config bug was found: manual Gradle rebuilds ran without `APP_VARIANT=preview`, so build-time `extra.appVariant` was `development` and the diagnostics gate correctly hid the test link even though the native package was `app.devgauge.preview`. `scripts/build-test-apk.sh` now also sets `NODE_ENV=production` and removes the stale artifact; the APK is being rebuilt through the script and re-verified.

## Device/native acceptance still to verify

- [x] A native internal preview APK builds, verifies, installs on the Pixel 8 API 35 emulator, and launches to rendered routes.
- [ ] Real-device launch, Back behavior and the diagnostics WebView screen are confirmed on the owner's phone.
- [ ] Android back navigation, deep links, onboarding, tabs and all route shells are manually exercised.
- [ ] The development-only WebView loads official provider pages and rejects an off-allowlist navigation on an Android device/emulator.
- [ ] GitHub Actions runner success is observed (local clean `npm ci` passed, but CI has not been run remotely).
- [ ] Final Android package ID, owned callback domain, and production signing/EAS project are supplied by the project owner (explicitly deferred; development uses provisional IDs).

Phase 1 signed-in feasibility remains separate and is tracked in `PHASE-01-FEASIBILITY.md`.
