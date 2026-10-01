# Execution log

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

See NATIVE-QA-LOG.md for exact emulator APK checksums and limits. A fresh compact phone build from `42535d2a0a22bb2748c6670077a6192239ef7427` is running in `/tmp/devgauge-phone-release-ica_1nt4`, unified exec session **10698**, logs `/tmp/devgauge-current-phone-{prebuild,build}.log`. Clean phone prebuild succeeded; preserve the resulting APK separately after successful Gradle completion. Do not restart a live build without terminal evidence.

Schema is now **4**. Migration 3 preserves recoverable native intents independently of deleted parents; migration 4 adds rule scopes/detail opt-in. Reverting code does not remove these installed schema changes. Native reminder cancellation must complete before deleting the journal or database key. Undo new code slices in reverse chronological order; restore a prior APK/database backup only when appropriate, never claim that Git revert refunds a consumed provider credit.

The goal remains active. Owner production application ID and eligible reset-account/transport access were requested and have not yet been supplied. Independent artifact and device verification continues.
