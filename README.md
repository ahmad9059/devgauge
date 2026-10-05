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

For a self-contained arm64 phone APK, run `npm run android:preview-apk`. For an x86_64 emulator APK use `ANDROID_ARTIFACT=emulator npm run android:preview-apk`; `ANDROID_ARTIFACT=universal` retains all supported ABIs. These preview APKs use a debug signing key and must not be submitted to Google Play. Successful outputs are `artifacts/devgauge-preview-{phone,emulator,universal}.apk`, with per-profile build logs. The build script reports task-based progress and preserves the last successful artifact if a later build fails.

Shrinking and resource removal are configured through Expo prebuild. Production AAB builds retain all ABIs and require the owner-approved `ANDROID_PACKAGE`. Measure APK/AAB file bytes with `node scripts/report-android-size.mjs <artifact> --max-mib 60`; file bytes are separate from installed size, Play download size and RAM. Historical baseline artifacts and comparisons are recorded in [BASELINE.md](docs/plans/devgauge-performance-alerts-resets/BASELINE.md).

## Current scope

The three-tab dashboard reads encrypted connections and usage snapshots, with provider detail, sign-in, support, legal and diagnostics screens. The mounted runtime refreshes website sessions for Claude, Codex, Copilot, Command Code and OpenCode Go, plus Antigravity OAuth sessions. Startup, foreground and manual refresh share concurrency, deduplication, deadline and cooldown handling. Legacy provider adapters retain their independent release/capability gates; their disabled flags do not mean the mounted application makes no requests.

Android also registers `devgauge-six-hour-refresh` with Expo BackgroundTask / WorkManager at a 360-minute minimum interval. The task is defined at module scope so Android can load it without mounting the dashboard. Website providers use the local `DevGaugeSession` native module to load their first-party usage page headlessly using the same persistent WebView cookies; Antigravity uses its securely stored OAuth credentials. Both transports preserve previous snapshots on failure. Android can defer work for battery/network conditions; force-stopping the app prevents scheduled work until the app is opened again. Background attempts use the existing `retry` audit trigger.

All app refresh transports allow an initial attempt plus three silent retries for temporary network/server/timeout failures. Each fetch gets its full deadline after acquiring a concurrency slot. Authentication/schema errors and rate limits stop the immediate retry batch. Foreground refresh drains cancelled background work before starting. Percentage quotas display a complete `43% / 100%` value; unknown quotas remain unknown. Text extraction supports Codex’s updated `% left` labels, split DOM text, compact reset durations, and explicit used/remaining qualifiers.

Usage alerts and reset reminders are configured in Settings → Usage alerts & resets. Rules persist provider/account/window scope, thresholds, lead time, quiet hours and generic lock-screen copy by default. The scheduler journals pending/denied/failed operations and reconciles native reminders on startup and return. Thresholds can only react to consumption observed by a sync; known local reset alarms can run while the app is closed. Manual reset reminders can be added, edited and deleted. Earned reset controls are omitted because DevGauge cannot redeem them. Provider detail actions are shown inline below Connection; reset times follow the device’s local timezone.

Disconnect cancels the selected connection’s refresh and reminders, removes vault credentials and deletes local history. Browser/WebView sign-in can remain: global cookie deletion would affect unrelated providers. Delete-all cancels owned reminders before deleting data and the encryption key. Remote revocation remains provider-dependent.

Development and internal preview builds expose diagnostics for storage self-tests and UI/connector experiments. Production hides diagnostics. `APP_VARIANT` and `ANDROID_ARTIFACT` are build-time selectors. Never add provider credentials to logs or diagnostics. Production ownership, live-account validation, provider policy review and physical-device QA remain pending.

The current performance/alerts implementation is tracked in [the active plan](docs/plans/devgauge-performance-alerts-resets/00-MASTER-PLAN.md) and [execution log](docs/plans/devgauge-performance-alerts-resets/EXECUTION-LOG.md).

## Branding

The Android icon set is generated from [`icon.png`](icon.png) with `npm run icons` (requires ImageMagick 7). Committed outputs in `assets/`:

- `icon.png` — 1024×1024 full-bleed app icon.
- `adaptive-icon.png` / `monochrome-icon.png` — safe-zone foreground for Android adaptive and themed icons.
- `splash-icon.png` — splash logo.
- `play-store-icon.png` — 512×512 Play Store listing icon.

`app.config.ts` wires the icon, adaptive icon (with `#000000` background), monochrome icon, and the `expo-splash-screen` plugin. `npm run check` asserts these paths.

The interface follows a monochrome, Vercel-style design language: Geist and Geist Mono typography, restrained radii, thin rules instead of filled chips or banners, and independent light/dark themes with no decorative gradients, glows, or icon tiles.

## Release status

Implementation is in progress. Preview artifacts are available for internal verification. Production is **NO-GO** pending owner configuration, signed-in provider checks, cookie/deletion review and final device/accessibility evidence. The original goal is not complete.

See [release readiness](docs/release/release-readiness.md), the [privacy & data inventory](docs/release/privacy-data-inventory.md), the [mobile QA matrix](docs/release/mobile-qa-matrix.md), and the [provider incident runbook](docs/operations/provider-incident-runbook.md).
