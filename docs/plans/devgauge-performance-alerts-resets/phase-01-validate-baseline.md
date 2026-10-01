# Phase 1 — Validate Current App and Establish Baselines

Status: source audit complete; signed-in device performance measurements pending. Planning only. Date: 2026-10-01.

## 1. Live architecture

Android Expo/React Native app. Root mounts `AppProvidersProvider` and `SyncProvider` (`app/_layout.tsx:63`). Live session orchestration is `src/features/dashboard/sync-provider.tsx:240`. The older refresh engine is called by diagnostics (`app/diagnostics/demo-connector.tsx:79`, `app/diagnostics/storage.tsx:211`), and `AutoSyncOnOpen` is not mounted. Do not optimize only those older paths. README's no-live-connectors statement (`README.md`, Release status) conflicts with this wiring. Registry capabilities still mark live usage/reset redemption false (`src/providers/registry.ts:11`, `:27`).

## 2. Claim-by-claim validation

| ID | Finding / evidence | Priority |
|---|---|---|
| A01 | APK is large: inspected local `artifacts/devgauge-phase1-preview.apk`, 129,907,371 bytes = 123.89 MiB. Four ABI directories contain 99.37 MiB of native libraries; x86/x86_64 alone 54.34 MiB. `android/gradle.properties:31` lists four ABIs. | High |
| A02 | Release minification/resource shrinking default false (`android/app/build.gradle:69`, `:116`). Native project is regenerated with prebuild clean (`scripts/build-progress.mjs:74`); fixes must live in durable Expo config/build inputs. | High |
| A03 | APK assets total 3.20 MiB; JS bundle 3.19 MiB. Image assets in repository total roughly 560 KiB. Asset compression alone cannot explain/fix the 124 MiB APK. | Medium |
| A04 | Four retries (`src/features/dashboard/sync-retry.ts:7`) with 12-second cold deadlines or 2.5+12-second warm fallback (`sync-provider.tsx:52`, `:187`, `:207`) imply approximately 51.5–61.5 seconds for repeated timeout failures, excluding persistence overhead. This is a code-derived bound, not measured sync latency. | High |
| A05 | All targets run in Promise.all (`sync-provider.tsx:269`), with persistent full-screen invisible WebViews (`:425`, `:493`); renderer/memory impact needs device measurement. | Medium |
| A06 | Auto sync is once per mount (`sync-provider.tsx:319`); AppState listener only tears down idle WebViews (`:337`). No foreground due-refresh in this live coordinator. | High |
| A07 | Failures/storage exceptions swallowed (`sync-provider.tsx:147`, `:169`); status has no failed-provider outcome (`:55`). Existing cooldown/error engine is bypassed. | High |
| A08 | Telemetry records every session save as manual, zero duration (`src/services/web-session/session.ts:118`). | High |
| A09 | Antigravity repeats discovery (`src/providers/antigravity/quota.ts:468`), may onboard and poll ten times (`:491`, `:497`), tries summary hosts sequentially (`:525`), then sequential independent fallback requests (`:545`, `:551`). | High |
| A10 | Explicit percent values <=1 multiplied by 100 (`src/services/web-session/usage-extract.ts:82`, `:99`). Example used_percent=1 becomes 100%, and 0.5 becomes 50%. | High |
| A11 | Text resets saved as raw strings (`src/services/web-session/usage-text.ts:79`, `:90`), including potentially relative labels. Invalid timestamp strings remain display-only (`provider-views.ts:88`). | High |
| A12 | Absolute reset instant converted to rounded minutes (`provider-views.ts:69`); provider memo has no clock dependency (`app-providers.tsx:73`); detail reconstructs clock using current date plus stale minutes (`app/provider/[providerId].tsx:116`). Countdown/freshness freeze and reset labels drift. | High |
| A13 | Connection updated before snapshot transaction (`src/services/web-session/session.ts:60`, `:109`). A failed save can leave new connection state without its snapshot. | High |
| A14 | Bridge clones every fetch response before heuristic filtering (`src/services/web-session/bridge-script.ts:20`, `:87`), scans whole body text (`:35`) and observes subtree (`:57`). Narrow capture before reading and validate native bridge input. | Medium |
| A15 | Threshold/reset settings hardcoded Off with no action (`app/(tabs)/settings.tsx:175`). Helpers exist, but production searches found no callers for threshold evaluator/manual reset form/scheduler. | High |
| A16 | Threshold rules include providerId but candidates do not; every rule checks every candidate (`src/services/notifications/thresholds.ts:1`, `:9`, `:41`). Provider alerts can cross-match when enabled. | High |
| A17 | Dedup key has no reset-cycle identity (`thresholds.ts:22`); persisting it forever would suppress alerts in later cycles. | High |
| A18 | Reminder saves enabled rule before permission/native scheduling (`src/features/connections/manual-reset.ts:73`, `:88`); native failure leaves partial state. | High |
| A19 | Manual reset validator Date.parse plus unused numeric offset check (`manual-reset.ts:27`, `:33`) cannot establish unambiguous timezone interpretation. | High |
| A20 | Expo scheduler requests permission and schedules DATE only (`src/services/notifications/expo-scheduler.ts:13`); app/src search found no foreground handler, Android channel setup, or notification response listener. | High |
| A21 | Provider detail retry no-op (`app/provider/[providerId].tsx:100`); refresh/reauthorize/disconnect merely close sheet (`:198`). | High |
| A22 | Reset redemption capabilities false for Claude/Codex (`src/providers/registry.ts:13`, `:29`). Current app has no implemented earned-reset redemption. New official provider support is discussed below. | High |
| A23 | SyncControl expands/spins without reduce-motion check (`src/components/usage/sync-control.tsx:18`, `:24`); existing button already supports pressed/loading feedback (`src/components/ui/button.tsx:83`). | Medium |
| A24 | Retention helper exists (`src/storage/repositories/usage.ts:396`) but no app production caller found. Runtime history/storage growth needs explicit retention policy. | Medium |
| A25 | Public installed-app OAuth client values intentionally compiled into app (`src/providers/antigravity/oauth.ts:1`, `:9`), while general public-config policy forbids secrets (`src/config/environment.ts:17`). Do not classify public installed-client identifiers as confidential secrets; document ownership/scopes and ensure no user tokens enter bundles/logs. | Review |

## 3. Build artifact breakdown

| Component | MiB in APK |
|---|---:|
| lib/x86_64 | 27.49 |
| lib/x86 | 26.85 |
| lib/arm64-v8a | 26.70 |
| lib/armeabi-v7a | 18.33 |
| Four DEX files, compressed | 14.94 |
| assets | 3.20 |

Largest libraries summed across ABIs: React Native 25.09 MiB, libcrypto 16.97 MiB, Hermes 9.34 MiB, expo-sqlite 6.92 MiB. Preserve SQLCipher; do not trade encryption for download size. Native libraries are stored uncompressed in this artifact. AAB upload size, APK size, Play per-device download size, installed disk size, build directory size and RAM are different measurements.

## 4. Current provider reset contracts

Verified official docs on 2026-10-01:

- [Claude limit resets](https://support.claude.com/en/articles/17007452-what-is-a-limit-reset): eligible offers restore the indicated session or weekly limits; web/Desktop Settings > Usage exposes Reset for free with confirmation. Redemption cannot be undone. Mobile/Claude Code do not currently expose that button. No public third-party redemption endpoint established by this audit.
- [Codex App Server](https://learn.chatgpt.com/docs/app-server), earned reset section: rateLimits/read exposes reset-credit metadata when available. account/rateLimitResetCredit/consume takes idempotencyKey and optional creditId; returns reset/alreadyRedeemed/nothingToReset/noCredit. Re-read limits afterward. This is an app-server protocol, not proof that the mobile WebView can invoke a public HTTP endpoint. Android integration remains to be proven.
- [Expo BuildProperties](https://docs.expo.dev/versions/latest/sdk/build-properties/): durable prebuild options include buildArchs, release minification and resource shrinking. Use the installed SDK-compatible plugin.
- [Codex models](https://learn.chatgpt.com/docs/models?surface=app): select gpt-6.1-sol in picker or launch `codex --model gpt-6.1-sol`; config `model = "gpt-6.1-sol"` sets a local default. Account/client availability applies.

## 5. Verification actually run

Typecheck passed; ESLint: 0 errors, 14 warnings; Vitest: 70 files / 331 tests passed; format check passed. Config check initially hit sandbox child-process EPERM and passed on approved rerun. Aggregate npm run check initially exited at that sandbox failure; constituent checks passed. No application source changes from running checks (git status remained clean before adding plan docs).

No signed-in phone/emulator exercise, native rebuild, real notification delivery, dependency vulnerability/network audit, or reset redemption was performed. This is a fast source/build-artifact audit, not a claim to identify every possible defect.

## 6. Baseline tasks for execution

Record current commit/build/device/Android/WebView versions. Measure 20 cold and 20 warm runs per connected provider: cached first paint, manual/auto trigger, first updated card, per-provider and total p50/p95, call counts, renderer count and peak/idle RAM. Cover offline, expired auth, 429, schema change, restart and foreground. Save redacted measurements in BASELINE.md (new). Measure installed/download sizes separately. Keep original APK/checksum for comparison outside tracked source. A missing account/device blocks live evidence only; continue independent implementation and report the outstanding check honestly.

## 7. Original request

> check this proejct and findout all problems fastly and give me to give to codex goal plan to work, current my problems like app size is huge, and also have problems like it sync time for auto manual sync make then insane crazy fast!!, , and also add the everything working like notififcations system thershold alerts , and also like codex and claude now provide the resets for there usage, in the detail page of both add the section to directly apply the reset , and also for notfications build like showing when we getting weekly resets/hourly reset for an provider, and also ui like microinteraction, and each thing is commit sepreate for easy undo, understand the current codebase and give prompt for codex goal with gpt-6.1-sol defaut,
