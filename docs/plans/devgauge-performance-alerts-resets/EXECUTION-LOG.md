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

Same-ABI baseline and intermediate shrinking-enabled release builds succeeded. See BASELINE.md for exact sizes/hashes/source commits. An emulator release build of `c056fcb` is running; its process handle and logs must be revalidated before installing. No physical phone or eligible reset account has been tested.

Production dependency audit: 14 moderate, 0 high, 0 critical findings. Expo compatibility reports dependencies up to date and Expo Doctor passed all 21 checks; final audit resolution remains Phase 8 work. Do not use a zero-high count as a clean-dependency claim.

## Remaining required work

- Phase 2: measured release-only dependency inclusion, emulator/native checks, final phone/emulator/AAB artifacts, installed/Play measurements. Production application ID remains requested from the owner.
- Phase 3: final native migration/reopen and manual UI/timezone checks.
- Phase 4: signed-in cold/warm trials, call counts/RAM, runtime error matrix and instrumentation review.
- Phase 5: persisted actionable rule settings; recoverable DB/native reconciliation; quiet hours; manual edit/delete; permission/state UI; disconnect/deletion cleanup; actual delivery matrix.
- Phase 6: RESET-CONTRACTS.md; prove native direct transport or report its external blocker; earned-reset states/sections and first-party handoff/post-return refresh if needed. A handoff cannot close the direct-redemption requirement.
- Phase 7: working provider actions, cancellation/cookie scope, reduced-motion feedback, runtime capability and release documentation.
- Phase 8: complete gates and dependency review; final artifact/account/device/accessibility checks; QA-REPORT.md and COMPLETION-REPORT.md with exact undo map.

The original goal remains active. No completion or external-blocked claim has been made.

## Current automated gate evidence

After notification foundations, `npm run check` passed (typecheck, lint, **78 files / 386 tests**, config). `npm run format:check` passed. Baseline lint warnings were removed in a separate quality commit; the aggregate check and format check passed again with zero lint warnings. These checks do not prove native delivery, real provider redemption, or physical-device performance.

Native build logs are `/tmp/devgauge-size-baseline-build.log`, `/tmp/devgauge-size-shrunk-build.log`, and `/tmp/devgauge-emulator-release-build.log`; artifacts/reports are intentionally gitignored. Preserve successful APKs when rebuilding. Both successful arm64 builds used SQLCipher and Hermes. Native reopen under shrinking is still awaiting the emulator artifact.
