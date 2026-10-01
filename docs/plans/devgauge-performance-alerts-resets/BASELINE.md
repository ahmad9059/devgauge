# Execution baseline

Measured on 2026-10-01 from commit `54bf0f1` before implementation.

## Artifact

`artifacts/devgauge-phase1-preview.apk`: **129,907,371 bytes (123.89 MiB)**.
SHA-256: `acbcedffad23aaea0fdca29b2bb1358c9499277ab20eda43d3a713d20081c2c6`.

| Native ABI | Bytes stored in APK |
|---|---:|
| arm64-v8a | 27,994,696 |
| armeabi-v7a | 19,215,912 |
| x86 | 28,152,568 |
| x86_64 | 28,820,312 |

Measured with Python zipfile central-directory compressed sizes. This is a universal APK; The same-ABI rebuild is recorded below. No installed-size, Play-download or RAM measurement is available yet.

## Runtime evidence

Approved `adb devices` returned an empty device list. No connected physical phone or running emulator was available. Signed-in accounts and eligible earned-reset offers have not been exercised. Cold/warm latency, first paint, delivery, TalkBack and RAM remain **not measured**, rather than synthetic passes.

Source revalidation confirms the active SyncProvider still has a serialized 250 ms acknowledgement delay, four retry attempts, persistent invisible WebViews, and no foreground due-refresh. These are code observations, not latency measurements.

## Same-ABI baseline rebuild

Isolated `git archive 54bf0f1`, clean Expo prebuild, release `assembleRelease -PreactNativeArchitectures=arm64-v8a`, JBR 25, two Gradle workers. Build succeeded in 3m 59s. The original source/dependency declarations were preserved; node_modules were shared with the workspace.

`artifacts/devgauge-baseline-arm64.apk`: **53,109,982 bytes (50.65 MiB)**. SHA-256 `18825af098a7db9a182312c58443a9d9649583eb03a91692aafc04b4654ab5bc`. Native arm64 bytes: 27,994,696; compressed DEX: 15,667,991.

## Shrinking comparison (intermediate build)

Isolated `git archive 957e61a`, clean prebuild with `ANDROID_ARTIFACT=phone`, R8/resource shrinking enabled. Build succeeded in 5m 5s.

`artifacts/devgauge-preview-phone-957e61a.apk`: **43,603,206 bytes (41.58 MiB)**. SHA-256 `90d6f68f10d524547e8b8fa86036fd98fde1097fca092f4cff9ec1757646d271`. Native arm64 bytes unchanged at 27,994,696; compressed DEX 6,446,089.

**Same-ABI reduction: 17.9%. Universal-to-compact reduction: 66.4%.** Compact APK passes the provisional 60 MiB budget. These are APK file measurements, not installed size, RAM or Play download. Final-feature artifact and native QA remain pending.

Reproduce: `node scripts/report-android-size.mjs artifacts/devgauge-preview-phone-957e61a.apk --baseline artifacts/devgauge-baseline-arm64.apk --max-mib 60`.

## Runtime availability update

Pixel_8_API_35 and DevGauge_Tablet_API_35 AVDs were discovered after baseline inspection. Pixel_8_API_35 booted headlessly as emulator-5554 (x86_64); a shrinking-enabled emulator build from `c056fcb` is in progress. This does not establish physical-phone or signed-in eligible-account verification.

## Current feature-complete local build candidate (not final release)

Source `42535d2a0a22bb2748c6670077a6192239ef7427`, clean `APP_VARIANT=preview ANDROID_ARTIFACT=phone EXPO_PUBLIC_SPIKE_TEST=1` prebuild in `/tmp/devgauge-phone-release-ica_1nt4`; Gradle release succeeded in 4m 1s. This includes persisted notification rules/reconciliation, provider actions and unknown-availability earned-reset handoffs. Direct earned-reset redemption remains incomplete.

- `artifacts/devgauge-preview-phone-42535d2.apk`: **43,811,354 bytes / 41.78 MiB**, arm64-v8a only; SHA-256 `6b6b7b895ce2d7cf4895d61eb1c23cc5f1b45de8b99e8a9b1cece6a2539f40ec`.
- Same-ABI baseline reduction: **17.51%**, with compressed native bytes unchanged at 27,994,696 and compressed DEX 6,446,089. Original four-ABI universal → compact reduction: **66.27%**. The 60 MiB APK file budget passes.
- Companion x86_64 candidate `artifacts/devgauge-preview-emulator-42535d2.apk`: **44,616,871 bytes / 42.55 MiB**; SHA-256 `2f4effc5a28920bdf1f02a22bf1634308e7e03e3e9051c4398ce544e654d8b07`.
- Reports are the matching `.size.json` files. Native/API evidence and limits are in NATIVE-QA-LOG.md. No physical arm64 install, installed-size improvement, Play download measurement or signed-in latency/RAM improvement is claimed.

Build logs: `/tmp/devgauge-current-phone-prebuild.log`, `/tmp/devgauge-current-phone-build.log`. A Gradle warning reports daemon metaspace pressure at build end; the build exited successfully. Do not suppress it or claim it caused an application crash.

## Privacy disclosure candidate

Source `c8c20cd80f430074f3707fe243afc693f1a70fd1`, incremental release builds in the same isolated phone/emulator trees. Both builds succeeded; no dependency or native configuration changed. Phone build log: `/tmp/devgauge-phone-disclosure-build.log`; emulator log: `/tmp/devgauge-emulator-disclosure-build.log`.

| Artifact | Bytes | MiB | SHA-256 |
|---|---:|---:|---|
| `artifacts/devgauge-preview-phone-c8c20cd.apk` | 43,809,982 | 41.78 | `5ec80a2d8c2622a5e818fed52ab5deff49e38617878ee2764fd868b409111fa7` |
| `artifacts/devgauge-preview-emulator-c8c20cd.apk` | 44,615,499 | 42.55 | `642bceb8b6475ee96ca176b069085c7dea1d22fc4a21bdafa08958c70874bf2f` |

Matching `.size.json` reports are preserved. Phone same-ABI reduction remains 17.51%; universal-to-compact reduction is 66.28%. Native compressed bytes and DEX are unchanged from the prior candidate; the 60 MiB phone APK budget passes. Tablet installation and dark notifications layout were inspected on this source. Physical phone, signed-in performance and production AAB remain unverified.

## Device-test handoff

Owner confirmed eligible account access and requested the final device-test build. Source `0f84dfab81eddd4514738c6265401358d28e6403`; sequential phone rebuild succeeded in 1m 8s after the shared-output concurrency failure described in EXECUTION-LOG.md. Emulator rebuild succeeded in 26 seconds.

| Artifact | Bytes | MiB | SHA-256 |
|---|---:|---:|---|
| `artifacts/devgauge-preview-phone-0f84dfa.apk` | 43,811,350 | 41.78 | `f51a57b7296b57cf2de85a792126b5815b643f42ebb02124e1a41d568273b01e` |
| `artifacts/devgauge-preview-emulator-0f84dfa.apk` | 44,616,867 | 42.55 | `3564568b761255a68181efb6fca2b08dc91385652e2fa0975d17e983dc45c5ef` |

`artifacts/devgauge-device-test.apk` is an identical copy of the phone artifact. APK signature verification passed. Package `app.devgauge.preview`, version 0.1.0/code 1, min SDK 24, target SDK 36, arm64-v8a. This is the debug-key-signed internal preview release build, not a signed production AAB. Owner has not supplied the production application ID. Device/account QA and the direct-redemption transport remain open; handing over this APK does not complete the original goal.

## Current emulator installation and memory observation

2026-10-01 16:05:33 UTC, `0f84dfab81eddd4514738c6265401358d28e6403`, DevGauge_Tablet_API_35/API 35/x86_64. Device APK SHA-256 matched `3564568b761255a68181efb6fca2b08dc91385652e2fa0975d17e983dc45c5ef`. Empty account state after prior app delete-all, Notifications screen focused, 1 activity and 0 WebViews. WebView package available on this emulator: com.google.android.webview 124.0.6367.219.

| Measurement | Value | Meaning |
|---|---:|---|
| APK apparent bytes | 44,616,867 / 42.55 MiB | Same preserved emulator APK |
| Package directory allocated blocks | 59,816 KiB / 58.41 MiB | `du -sk` of installed APK parent directory, including compiled package files |
| `/data/user/0/app.devgauge.preview` allocated blocks | 3,588 KiB / 3.50 MiB | This empty-account app's local data/cache |
| App process PSS | 102,514 KiB / 100.11 MiB | One `dumpsys meminfo` observation |
| App process RSS | 233,156 KiB / 227.69 MiB | One observation; includes shared/resident pages |
| App process swap | 0 KiB | At observation |

These disk numbers are 1024-byte allocated blocks, not the Android Settings storage total or Play download size. Other OS/shared/Keystore/device-encrypted/external directories are not included. No physical arm64, baseline installation or signed-in sync sample was measured, so no installed-size or RAM improvement is claimed. This observation does not satisfy the 20 cold/20 warm runs/provider performance requirement.

Reproduce on the isolated rooted emulator: `adb -s emulator-5554 shell pm path app.devgauge.preview`, verify `sha256sum` and `stat -c %s` on that APK, run `du -sk` on its parent and `/data/user/0/app.devgauge.preview`, and `dumpsys meminfo app.devgauge.preview` with the same empty-account screen. Capture focus/activity/WebView count and sample time; do not compare a different scenario as a performance delta. Raw evidence: `/tmp/devgauge-device-footprint.json`, `/tmp/devgauge-empty-notifications-meminfo.txt`, `/tmp/devgauge-footprint-ui.txt`. Unrooted and stopped the emulator afterward.
