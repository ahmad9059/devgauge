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
