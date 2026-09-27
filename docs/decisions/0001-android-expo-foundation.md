# ADR 0001: Android-only Expo foundation

Status: accepted for Phase 2 foundation (production identifiers pending)

Date: 2026-09-25

## Decision

- Expo SDK 57 (`expo@~57.0.25`) with React Native 0.86.3, React 19.2.3, Expo Router (`~57.0.23`), strict TypeScript 6, npm 12.0.2 with a lockfile, and Node 24 LTS in CI. Versions came from `create-expo-app@5.0.0 --template blank-typescript` and compatible `expo install` packages.
- `platforms: ['android']`; Android development/preview package IDs are placeholders, and production configuration requires an explicitly supplied `ANDROID_PACKAGE` after the owner selects the production identity. No iOS build profiles.
- Three EAS Android build profiles; only development includes `expo-dev-client`. Private provider secrets must not appear in build config or any `EXPO_PUBLIC_*` value.
- Route skeleton is navigable but cannot initiate provider authentication or fetch usage. A development-only route will host Phase 1 WebView feasibility checks.

## Consequences

- The native WebView and any future SQLCipher support require Android development builds, not Expo Go as the verification target.
- The `devgauge` scheme is provisional; production callback registrations and App Links require an owned domain and final Android package.
- Installing and bundling can be verified without an Android emulator. Actual login, cookie persistence, system back behavior, and release builds must be tested on a device or emulator with a configured SDK/JDK.

## Sources

- [Expo Router installation](https://docs.expo.dev/router/installation/)
- [Expo typed routes](https://docs.expo.dev/router/reference/typed-routes/)
- [Expo Android development builds](https://docs.expo.dev/get-started/set-up-your-environment/)
