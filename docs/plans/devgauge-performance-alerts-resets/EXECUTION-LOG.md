# Execution log

## 2026-10-02 — Finger-following native pager

Owner clarified WhatsApp-style page dragging: left advances Usage → Connectors → Settings, right returns, and holding partway must show both pages. `78f1d75` replaces the discrete PanResponder tab switch with Expo Router TopTabs backed by react-native-tab-view and SDK-compatible react-native-pager-view. The old reversed-order helper/tests are removed. `8d1d065` includes subsequent bottom-label sizing fixes for system text scaling. Full source gates pass 445 tests, and final style changes pass typecheck/formatting. Android verifies both directions directly over provider cards, first/last boundaries, short-drag cancellation, vertical scrolling, bottom button taps and the Theme sheet. A held native drag screenshot shows both pages before release. Final artifact evidence is recorded in QA-REPORT.md. No owner's physical device was modified.

## 2026-10-01 — Text-only heading and tab swipes

Owner revised the header to text only and requested right swipes from Usage to Connectors to Settings, with left swipes returning. `805e6b0` removes the chrome mark and adds horizontal gesture handling around each tab scene while preserving the bottom tab buttons. Short/vertical/diagonal drags do not navigate; endpoints do not wrap. Source gates pass **84 files / 448 tests**, typecheck, lint, config and formatting. Android release checks confirm both directions, boundaries, vertical Connector scrolling, bottom tab taps and the Settings Theme sheet. Existing sample data remains intact. The owner's physical phone was untouched. Artifact evidence is recorded in QA-REPORT.md.

## 2026-10-01 — Usage header polish

Owner requested a hidden dashboard scrollbar, a sharper and larger header logo, and less space before the name. `e23c1c0` implements these using the existing artwork: remove launcher padding in the view, render a 36 dp visible mark with higher-quality Android decoding, use theme tint, and reduce the gap to 4 dp. Source gates pass 445 tests and all other checks. Emulator dark/light inspection and a short viewport confirm logo contrast, spacing and retained scrolling without an indicator. Sequential preview APK builds and the phone signature/size budget pass; QA-REPORT.md records exact artifact evidence. Physical phone testing remains with the owner.

## 2026-10-01 — GitHub Included usage capture and final reset display

`3565ac3` fixes Included usage heading recognition, isolates additional spend, and completes valid GitHub page quota without waiting for absent resets. `dd7efee` handles the owner's six-digit Claude timestamp precision and recovers previously stored valid reset text. `6cb6d0d` shares the final hourly/weekly countdown and monthly date formatting rule between cards and detail, removes time-unverified copy, and formats other wall times in the device timezone. The owner confirmed Command Code empty limits get reset dates only after first use; no missing timer is invented. All source gates pass 445 tests, plus three display tests in each of two timezones. Native build/handoff evidence is recorded in QA-REPORT.md.

## 2026-10-01 — fix website reset persistence regression

Owner phone test of `2d504f9` showed missing reset labels on all four website providers. `8633b6a` adds the omitted `resetsSourceText` live INSERT argument, guards data rows from switching parser sections, and waits for late reset labels across website providers. Four provider-specific real SQLite round-trip cases reproduce failure on the previous writer and pass with the correction. Full source gates pass: 83 files / 433 tests, typecheck, lint, configuration and formatting. Replacement builds and native scope are recorded in QA-REPORT.md.

## 2026-10-01 — owner UI and workspace credits revision

The owner withdrew earned-reset controls and requested device-local reset labels without timezone suffixes, inline detail actions, semantic Connection colors, correct “just now” freshness and bottom-right card update labels. Implemented in `3a3fed7`, `183eb79` and `203c2ba`. `1d114fa` fixes Claude section/reset association and partial capture completion. `2d504f9` adds Codex workspace monthly credits, retains exact usage counts, wraps long progress text, and applies page completion policy to both sign-in and refresh. Final automated gates: 83 files / 425 tests, typecheck, lint, config and formatting pass. Live owner-account capture remains to be tested on the delivered APK; no provider timing was fabricated.

Both final native release builds succeeded sequentially. `2d504f9` emulator upgrade retained sample data; native inspection verifies right-aligned freshness, inline actions and Disconnect → Cancel without data removal. Phone APK is 41.78 MiB, signature verified, and copied to the stable `artifacts/devgauge-device-test.apk` handoff. QA-REPORT.md records exact sizes, hashes and evidence limits.

## 2026-10-01 — Baseline and usage correctness

- Read all ten original plan documents and the previous plan's cross-cutting rules; inspected mounted sync, extraction, storage and provider view paths.
- Worktree started at `54bf0f1` with only the requested plan folder untracked. Existing plan documents preserved.
- Recorded original APK checksum and ABI sizes in BASELINE.md. Approved ADB inspection found no connected devices.
- Phase 3 first slice: replace magnitude-based percent guessing with explicit field units, declared ratio metadata, malformed-value handling and over-cap preservation. Regression fixtures previously encoded the faulty ratio assumption and were corrected.
- Remaining phases and acceptance requirements remain open; this log does not assert completion.

## Undo policy

Each implementation slice is committed separately and its hash recorded here after validation. Revert dependent slices before prerequisites. Forward SQLite migrations and consumed provider credits require separate handling; code reverts alone cannot undo them. No push, deployment or publication is authorized by this work.

## Committed implementation slices

| Commit | Concern | Validation at commit |
|---|---|---|
| `4f2c77f` | Explicit percent/ratio normalization | Web-session regressions; typecheck |
| `8ce9f0f` | Atomic connection/snapshot persistence | Injected snapshot failure and parallel saves; typecheck |
| `e0fbad5` | Absolute resets and original source text; migration 2 | 358 tests; typecheck; config check |
| `8922225` | Production view types and connector metadata | View/fixture tests; typecheck |
| `c49d925` | Foreground freshness/countdown clock | 38 dashboard tests; typecheck |
| `c8e54c8` | Explicit manual timezone and save-error feedback | 8 manual-reset tests; typecheck |
| `742e086` | Durable R8/resource shrink settings | Clean prebuild properties inspected; config check |
| `678bce9` | Phone/emulator/universal packaging profiles | Clean phone prebuild ABI inspected; profile config check |
| `111ac74` | Repeatable ZIP size/checksum/budget report | Original APK matched independent Python baseline |
| `f190c26` | Shared write queue and changed-connection guard | 71 focused storage/refresh tests; typecheck |
| `d6d5244` | Mounted transports use shared coordinator; legacy sync route consolidated | Full check/format; 16 engine tests including deadline, cooldown restart and late disconnect |
| `a716c2e` | Valid quota commits without waiting for DOM reset text | 37 session tests; typecheck |
| `722e065` | Account-generation discovery cache; parallel fallback reads; no refresh onboarding | 24 Antigravity tests; typecheck |
| `267faeb` | Filter before response cloning; stop capture; native message caps | 5 bridge tests; typecheck; lint (baseline warnings only) |
| `15c0c0c` | Deferred bounded history retention | 11 retention/usage tests; typecheck |
| `957e61a` | Accurate timing and unknown duration fallback | 12 session/Antigravity tests; typecheck |
| `fe99c64` | Provider/account/window/cycle threshold matching | 7 threshold tests; typecheck |
| `c056fcb` | Android channel, contextual permission and safe cold/warm tap routing | 15 notification tests; typecheck/config; baseline lint warnings retained |

Same-ABI baseline and intermediate shrinking-enabled release builds succeeded. See BASELINE.md for exact sizes/hashes/source commits. Emulator release builds now pass and install; detailed observations and hashes are in NATIVE-QA-LOG.md. No physical phone or eligible reset account has been tested.

Production dependency audit: 14 moderate, 0 high, 0 critical findings. Expo compatibility reports dependencies up to date and Expo Doctor passed all 21 checks; final audit resolution remains Phase 8 work. Do not use a zero-high count as a clean-dependency claim.

## Remaining required work

- Phase 2: measured release-only dependency inclusion, emulator/native checks, final phone/emulator/AAB artifacts, installed/Play measurements. Production application ID remains requested from the owner.
- Phase 3: final native migration/reopen and manual UI/timezone checks.
- Phase 4: signed-in cold/warm trials, call counts/RAM, runtime error matrix and instrumentation review.
- Phase 5: settings/journal/reconciliation/quiet hours/manual edit-delete are implemented. Complete the native delivery, permission prompt/revoke and edited-window/timezone matrix.
- Phase 6: contracts, typed offer parsing and unknown-availability handoff sections are implemented. Prove account-bound Android direct transport, durable redemption/retry and fresh-limit results. A handoff cannot close direct redemption.
- Phase 7: provider actions, cancellation drain, reduced-motion sync and runtime/release docs are implemented. Native provider-specific cookie removal remains unproved; full device/accessibility QA remains open.
- Phase 8: complete gates and dependency review; final artifact/account/device/accessibility checks; QA-REPORT.md and COMPLETION-REPORT.md with exact undo map.

The original goal remains active. No completion or external-blocked claim has been made.

## Current automated gate evidence

After notification foundations, `npm run check` passed (typecheck, lint, **78 files / 386 tests**, config). `npm run format:check` passed. Baseline lint warnings were removed in a separate quality commit; the aggregate check and format check passed again with zero lint warnings. These checks do not prove native delivery, real provider redemption, or physical-device performance.

Native build logs are `/tmp/devgauge-size-baseline-build.log`, `/tmp/devgauge-size-shrunk-build.log`, and `/tmp/devgauge-emulator-release-build.log`; artifacts/reports are intentionally gitignored. Preserve successful APKs when rebuilding. Both successful arm64 builds used SQLCipher and Hermes. Native reopen under shrinking retained existing sample data; final signed-in and physical-device checks remain open.

## Notification, provider-action and reset follow-up

| Commit | Scope | Verification |
|---|---|---|
| `a102631` | Baseline lint cleanup | Aggregate check and format, zero warnings |
| `5dcde22` | Durable native notification intent journal; permission/failure/cancellation recovery; startup return reconciliation | 393 tests, full check/format; injected acknowledgement and intent failures |
| `bac9570` | Scoped persisted rule settings, cycle dedup, provider reset schedules, quiet hours and manual edit/delete | 400 tests, full check/format; native screen opens |
| `f87de41` | Manual fallback creation and timezone confirmation | 402 tests/full gates with action slice; native UI creation |
| `fb86422` | Refresh/retry/reauthorize/disconnect, scoped reminder cancellation, delete-all drain and reduced motion | 402 tests/full gates; native background reminder and warm tap |
| `09ec622` | Official reset contracts and Android transport gaps | Official pages fetched 2026-10-01; no mutation performed |
| `aafc9c7` | Earned-credit model and explicit unknown-availability handoffs | 411 tests/full gates; native section renders unknown |
| `cda318b` | Mounted capability metadata and auth-specific actions; current README/release status | Full gates; release APK installs/reopens |
| `b72b004` | Active/queued cancellation drains before database close | 17 engine tests |
| `42535d2` | Large-text row wrapping and timing-neutral reminder copy | **82 files / 412 tests**, typecheck, zero-warning lint, config and format; rebuilt portrait/landscape 375dp/150% screenshot inspection |

See NATIVE-QA-LOG.md for exact emulator APK checksums and limits. The fresh compact phone build from `42535d2a0a22bb2748c6670077a6192239ef7427` succeeded in 4m 1s; its process is terminal. APK and size report are preserved separately. It measures 41.78 MiB, 66.27% below the original universal artifact and 17.51% below the same-ABI baseline; see BASELINE.md for exact hashes and limits. No native build remains running.

Schema is now **4**. Migration 3 preserves recoverable native intents independently of deleted parents; migration 4 adds rule scopes/detail opt-in. Reverting code does not remove these installed schema changes. Native reminder cancellation must complete before deleting the journal or database key. Undo new code slices in reverse chronological order; restore a prior APK/database backup only when appropriate, never claim that Git revert refunds a consumed provider credit.

The goal remains active. Owner production application ID and eligible reset-account/transport access were requested and have not yet been supplied. Independent artifact and device verification continues.

## Disclosure and dependency verification

- `c8c20cd`: privacy/provider disclosures describe mounted HTTPS transports, optional provider/window notification detail and browser sign-in that can survive local deletion. Full check passed: 82 files / 412 tests, typecheck, zero-warning lint and config; format passed.
- `09086c0`: reviewed both underlying production dependency advisories and documented incompatible direct override/SDK downgrade risks in DEPENDENCY-REVIEW.md. Production audit remains 14 moderate dependency findings, zero high/critical; no incompatible override was introduced. This is not a full security audit.
- Both `c8c20cd` release builds succeeded. Exact artifact hashes and file-size comparisons are in BASELINE.md. Tablet notification light (`42535d2`) and dark (`c8c20cd`) screenshots were inspected; no overlap or clipped text was observed on those screens. Android Accessibility Suite's permission dialog initially obstructed the dark check; stopping that system test app cleared it before the valid capture. This does not prove TalkBack accessibility.

## Native QA corrections

- `2a298d8`: explicitly remove the closed database file before deleting its key, preserving a retryable readable empty database on file-removal failure. 414 tests/full gates passed.
- `4e43eff`: respect retryable Android notification denial via `canAskAgain`; 415 tests/full gates passed. Emulator release build succeeded in 3m 8s.
- `0f84dfa`: cold notification tap landed on the default startup route in the tablet trial; retain responses across the index redirect. 83 files / 417 tests, typecheck, zero-warning lint, config and format passed. Native retest pending.
- The first follow-up build attempts omitted the documented JBR native-access environment and failed in Worklets. Retrying with the existing script's `JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED` passed for emulator. Concurrent phone/emulator builds shared node_modules native outputs and caused a phone missing-library strip failure. Build those architectures sequentially while sharing node_modules; the failed phone build is not an artifact candidate.

## Owner device-test handoff

Owner confirmed they have an account and requested the final build to test on their device. Built and signature-verified the `0f84dfa` arm64 internal preview APK; stable handoff copy is `artifacts/devgauge-device-test.apk` (41.78 MiB). Exact hashes and architecture/package details are in BASELINE.md. Full source gates pass: **83 files / 417 tests**, typecheck, zero-warning lint, config and format. Current emulator APK installed after boot. No production AAB or direct redemption pass is claimed.

Cold-route fix has unit regression coverage; repeat native cold tap, permission prompt and app delete-all trials remains required. Account access is now owner-held for their device trials, not available within this workspace. Ask for observed sign-in/sync/reminder/cold-tap outcomes after that testing; production application ID and supported account-bound redemption transport remain unresolved.

## Current emulator verification and audit reports

`0f84dfa` native repeat proved contextual Android permission grant, reminder delivery after confirmed process death and correct cold tap to Claude detail. App delete-all removed the elapsed manual fixture and reopened notification settings without an app error. Active future-alarm cancellation/edited-reset proof remains open; an automation edit did not establish such a schedule. NATIVE-QA-LOG.md records exact scenario and times. No owner physical device was modified.

QA-REPORT.md and COMPLETION-REPORT.md now contain the actual phase audit, 417-test evidence, artifact measurements, remaining requirements and reverse chronological commit/undo map. Both explicitly state the goal is incomplete and production NO-GO. Documentation-only changes do not alter the supplied `0f84dfa` device-test APK.

## Active schedule cleanup verification

`0f84dfa` tablet native UI trial created a future manual Claude reminder, edited its UTC instant, verified exactly one replacement Android alarm, retried reconciliation twice without duplicates, then deleted all local data. The future alarm was cancelled (zero pending app alarms) and notification settings reopened without the entry/load error. Exact instants and redacted alarm/UI evidence paths are in NATIVE-QA-LOG.md; QA-REPORT.md now reflects this scoped pass. Remote provider-window change, disconnect/live credentials, quiet/timezone/power and full device/accessibility checks remain open. Candidate APK unchanged.

## Foreground notification verification

`0f84dfa` tablet trial proved generic notification list delivery while MainActivity stayed focused and correct tap navigation to Codex. NATIVE-QA-LOG.md records the actual requested time, inexact scheduling window and observation limits; transient heads-up animation is unverified. Candidate APK/source unchanged. Await owner device/account results and production ID; direct earned-reset transport, live latency/account/cookie matrix and full accessibility/power verification remain incomplete.

## Emulator footprint observation

Verified the installed `0f84dfa` emulator APK hash and recorded allocated package/local-data blocks and one empty-account Notifications memory observation in BASELINE.md. Package 58.41 MiB, user data 3.50 MiB, process PSS 100.11 MiB, 0 WebViews. This is x86_64/API-35 current-state evidence only, not Android Settings total/Play download/arm64 footprint, a baseline comparison, signed-in RAM or a performance pass. No source/APK changed.
