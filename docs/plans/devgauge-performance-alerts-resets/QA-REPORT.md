# QA report — verification in progress

2026-10-01. Candidate source `0f84dfab81eddd4514738c6265401358d28e6403`; audit baseline `54bf0f1`. **Original goal incomplete; production NO-GO.** These are scoped observations, not a blanket pass.

## Automated evidence

`npm run check` and `npm run format:check` passed after the cold-tap regression: **83 files / 417 tests**, typecheck, zero-warning lint and config. Logs: `/tmp/devgauge-cold-tap-regression-{check,format}.log`. Tests cover normalization/absolute timestamps, atomic rollback, connection write guards, cancellation drain, cycle/scope matching, native scheduling acknowledgement recovery, deletion failures and startup redirect routing. Mocked native tests do not prove Android delivery or provider credits.

Installed Expo compatibility check was up to date and Doctor passed 21/21. No dependencies changed afterward. Production audit remains **14 moderate, zero high/critical**, with two underlying advisories; see DEPENDENCY-REVIEW.md. No incompatible major override was applied; public-release dependency gate remains open.

## Artifact evidence

| Artifact | APK bytes | MiB | Scope |
|---|---:|---:|---|
| Original universal | 129,907,371 | 123.89 | Four ABIs |
| Same-source arm64 baseline | 53,109,982 | 50.65 | Like-for-like architecture |
| Current phone `0f84dfa` | 43,811,350 | 41.78 | arm64 only |
| Current emulator `0f84dfa` | 44,616,867 | 42.55 | x86_64 only |

Universal-to-compact reduction **66.27%**, same-ABI **17.51%**; 60 MiB APK budget passes. Exact checksums, clean-prebuild provenance and successful sequential build logs are in BASELINE.md. SQLCipher and Hermes remain enabled. Signature verified for `artifacts/devgauge-device-test.apk`, package `app.devgauge.preview`, min SDK 24/target 36. This is an internal debug-key-signed release preview, not a production AAB or Play download/installed-size measurement.

## Native matrix

| Requirement | Evidence / status |
|---|---|
| Encrypted reopen/forward migration under R8 | Pixel retained diagnostic sample data across release installs; schema-4 manual creation worked |
| Generic background notification/warm tap | `fb86422` passed on Pixel; OS inexact window recorded |
| Foreground notification/Codex warm tap | `0f84dfa` tablet: owned generic shade notification while MainActivity focused, tap opens Codex; heads-up animation unverified |
| Process-death delivery | `c8c20cd` passed on tablet after confirmed PID termination; not force-stop/power-restricted proof |
| Cold tap | Failed on `c8c20cd`; `0f84dfa` native repeat after PID termination opens Claude detail correctly |
| Contextual permission prompt | `0f84dfa` tablet denied/retryable → Allow notifications → actual DevGauge OS prompt → granted, via UI |
| Large text/layout | `42535d2` 375.7 dp/150% portrait and landscape wraps; tablet notifications light/dark inspected; full matrix pending |
| Edited manual native schedule/retry dedup | `0f84dfa`: old alarm replaced, two retries retain one new alarm |
| Quiet hours/timezone/provider reset changes | Automated cases pass; full native trial pending |
| Native delete-all | Key/file failure regressions pass; `0f84dfa` UI delete-all cancels an active future manual alarm, removes entry and reopens settings |
| Live account performance/redemption | Not run in workspace; owner has account and device-test APK |
| Current x86_64 installed footprint / RAM | One empty-account observation: package allocated 58.41 MiB, local data 3.50 MiB, PSS 100.11 MiB; no baseline/arm64 comparison |
| Physical phone/TalkBack/production AAB | Not verified; production package/signing inputs missing |

NATIVE-QA-LOG.md retains artifact-specific failures as well as successes. No sampled p50/p95, press latency, RAM or installed-size improvement is asserted. Direct account-bound earned-reset reading/consumption remains unsupported in this app; handoff is explicitly partial. Remaining evidence must be gathered before the goal can close.
