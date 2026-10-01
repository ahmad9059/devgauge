# QA report — verification in progress

## 2026-10-02 — Native pager and held page dragging

Owner clarified that the previous discrete/inverted swipe implementation was unsuitable. Source `8d1d065` uses Expo Router TopTabs with a native pager, retaining the bottom navigation and text-only heading. Left swipes advance Usage → Connectors → Settings; right swipes return. Pages follow the finger continuously, including a held partial drag. New dependencies are react-native-pager-view 8.0.2 (the installed Expo SDK's compatible version) and react-native-tab-view 4.3.3. Removed the old PanResponder component, direction helper and its three obsolete tests.

Full gates pass **83 files / 445 tests**, typecheck, lint, config and formatting (`/tmp/devgauge-pager-final-check.log`). Final bar margin changes also pass typecheck and formatting (`/tmp/devgauge-pager-typecheck.log`, `/tmp/devgauge-pager-final-format.log`). An intermediate sizing expression failed typecheck because lineHeight can be undefined; the final source includes a fallback. Bottom label sizing accounts for system font scale and removes inherited label margins.

Pixel API 35 release `8d1d065` passes gestures directly over provider cards in both directions, first/last boundaries, short-drag cancellation, vertical Connector scrolling, bottom tab taps and the Theme sheet (`/tmp/devgauge-pager-final-native.log`). At 150% system font scale, all bottom labels remain visible. Holding a drag before UP exposes both adjacent pages: `artifacts/devgauge-8d1d065-half-drag.png`; settled large-text screenshot: `artifacts/devgauge-8d1d065-large-text.png`. Sample connection data was retained. Display/font settings were reset after inspection; the owner's physical phone was untouched. These are UI observations, not live-provider verification.

Final x86_64 release build succeeds in 25 seconds. Emulator APK: **44,711,903 bytes / 42.64 MiB**, SHA-256 `4c728bb083feb621a78feb329df50facf08fcf2a1066734fb3a8c46896e9d52e`. Earlier artifacts below are historical.

Phone release build succeeds in 2m32s. `artifacts/devgauge-preview-phone-8d1d065.apk`: **43,906,386 bytes / 41.87 MiB**, arm64-v8a, SHA-256 `d9c598421f513230af0f19e8cfc26d8eb0a9925d3bf6dcf477633322a93c298b`. APK signature verification and 60 MiB budget pass; the stable device-test APK matches it. This is an internal preview, not a production AAB.

## 2026-10-01 — Text-only heading and tab swipes

`805e6b0` removes the header logo and adds right swipes Usage → Connectors → Settings, with left swipes returning. The bottom tab buttons remain available. Horizontal intent and a 64 dp completed drag are required; short, vertical and diagonal drags do not change tabs, and endpoints do not wrap. Source gates pass **84 files / 448 tests**, typecheck, lint, config and formatting (`/tmp/devgauge-swipe-final-check.log`, `/tmp/devgauge-swipe-format.log`).

Pixel API 35 release inspection confirms text-only chrome, both directions, endpoint behavior, vertical Connector scrolling, tab taps and the Settings Theme sheet. Native assertion log: `/tmp/devgauge-swipe-native.log`; header screenshot: `artifacts/devgauge-805e6b0-header.png`. Initial QA assertions incorrectly expected a scrolled-off heading to remain visible; correcting that assertion produced a passing run without source changes. A 375.6 dp / 150% font UI dump confirms the heading and refresh control fit. Display/font settings were restored. Sample data was retained; no live account or physical phone claim is made.

Sequential release builds succeeded: emulator 2m54s, phone 2m20s. Phone `artifacts/devgauge-preview-phone-805e6b0.apk`: **43,814,834 bytes / 41.79 MiB**, arm64-v8a, SHA-256 `84ad492841f80f92e3d6d1b27755f523b3a2507a9374b81255e8d9a0ea1ee421`. Signature verification and 60 MiB budget pass; the stable device-test APK matches it. Emulator APK: **44,620,351 bytes / 42.55 MiB**, SHA-256 `78cd1d5720b3a8f94b3fcd61063b74c4ee2cefe7c393b26f40c2a7da9244265b`. These are internal preview APKs; earlier artifacts below remain historical.

## 2026-10-01 — Usage header polish

`e23c1c0` hides the Usage scroll indicator while retaining scrolling, expands the visible DevGauge mark to 36 dp (matching provider icon width), reduces the name gap to 4 dp, and uses Android image downsampling with theme tint. Launcher safe-zone padding is cropped in the header view; the original artwork is preserved. Source gates pass **83 files / 445 tests**, typecheck, zero-warning lint, config and formatting (`/tmp/devgauge-header-{check,format}.log`).

Pixel API 35 release inspection verifies the larger unclipped mark and tighter spacing in dark and light themes. A reduced-height viewport confirms content scrolls with no right indicator. Existing sample data is retained; this is visual evidence, not live provider verification. Screenshots: `artifacts/devgauge-e23c1c0-header-dark.png`, `artifacts/devgauge-e23c1c0-header-light.png`, and `artifacts/devgauge-e23c1c0-scroll.png`. Display size and dark preference were restored. Only emulator-5554 was installed to; the owner's phone was untouched.

Sequential native builds pass. The initial phone process exited 143; a retry with one worker succeeded in 46 seconds. Phone APK `artifacts/devgauge-preview-phone-e23c1c0.apk`: **43,814,042 bytes / 41.78 MiB**, arm64-v8a, SHA-256 `efeb76ad4940664e627d89980512323c531e9ebab58a1ec0e41d31b25db828b2`. Signature verification and the 60 MiB budget pass. The stable `artifacts/devgauge-device-test.apk` matches it. Emulator APK: **44,619,559 bytes / 42.55 MiB**, SHA-256 `9629d1886adc1c21c0523e66dc678b10c2a694d6f708c96d11d5176f96d6ca83`. These remain internal preview builds, not production AABs. Earlier artifacts below are historical.

## 2026-10-01 — GitHub sign-in and final reset display rules

Owner screenshots identify GitHub's current “Included usage” heading with 0 / 200 AI credits and no reset label. `3565ac3` recognizes that heading as the main credit quota, excludes Additional usage from it, and completes sign-in/shared page refresh once those fresh counts are captured. Missing reset text on this panel no longer holds sign-in open. Tests cover the supplied layout, completion policy and SQLite save/reload with Connected status and exact credit counts.

`dd7efee` accepts explicit-offset ISO timestamps with up to nine fractional digits, truncating to JavaScript milliseconds; the owner's Claude timestamps have six digits. Dashboard mapping also recovers valid instants from previously saved reset source text when `resetsAt` is null. `6cb6d0d` uses one formatter for cards and detail: rolling/hourly limits display “Resets in 4h 57m,” weekly “Resets in 6d 22h,” monthly “Resets on Oct 15.” “Time unverified” is removed. Other wall-clock dates use “Oct 2, 2026 3:23AM” in device-local time without a timezone suffix. Offset-free full website date labels support local display countdowns only; they are not promoted to scheduled notification instants.

The owner confirmed Command Code displays reset dates after usage begins. Empty rolling/weekly windows have no reset date yet, and fresh page capture no longer waits for those absent dates. This matches [Command Code's first-request window rules](https://commandcode.ai/docs/resources/usage-limits); no timer is fabricated for an unused window.

Final source gates pass: **83 files / 445 tests**, typecheck, zero-warning lint, configuration and formatting (`/tmp/devgauge-github-time-{check,format}.log`). Three targeted display tests also pass independently under Asia/Karachi and America/New_York (`/tmp/devgauge-github-time-{karachi,new-york}.log`). Live GitHub sign-in verification on the owner's account remains a device recheck; parser/persistence/policy tests do not claim that verification.

Final source `6cb6d0d` release builds pass sequentially: x86_64 74 seconds, arm64 70 seconds (`/tmp/devgauge-github-time-{emulator,phone}-build.log`). Emulator upgrade/launch succeeds; native static gallery shows the shared ProviderCard countdown “Resets in 4h 40m” with the update label at bottom right (`artifacts/devgauge-6cb6d0d-reset-gallery.png`). Gallery fixture data is not a connected provider account. Phone APK is **43,813,858 bytes / 41.78 MiB**, SHA-256 `fedfd51b3e50c973e1b203f095bc2cc6240c39a7d798156870ebbc9adc7ea7fd`; signature verification and 60 MiB budget pass. Emulator APK is **44,619,375 bytes / 42.55 MiB**, SHA-256 `e40f35eee3dc2f6ab3a9788c9e12e8fa8f8938092ee20a92ce0788000b2c5e09`. Stable device-test APK now matches `artifacts/devgauge-preview-phone-6cb6d0d.apk`.

## 2026-10-01 — website reset labels lost after live save

Owner device evidence on `2d504f9` showed missing Claude, Codex, Command Code and GitHub Copilot reset labels while Antigravity still displayed countdowns. The shared live snapshot INSERT had sixteen columns/placeholders but omitted the final `resetsSourceText` parameter, silently storing null. Earlier parser-only tests did not exercise that missing live-write value.

`8633b6a` writes the reset source field, keeps reset durations and numeric credit rows from changing the active section, and waits for missing reset labels on all website providers before committing early quota data. Both sign-in and shared refresh use this completion policy; the existing deadline preserves verified partial usage when a provider supplies no reset timing. No reset date is invented.

Four real SQLite regression cases cover provider text → domain windows → live snapshot save → database reload → dashboard view, matching reset text to its window key. All four fail against the previous writer and pass after the fix. Negative-control log: `/tmp/devgauge-reset-persistence-negative-control.log`. Full gates pass: **83 files / 433 tests**, typecheck, zero-warning lint, configuration and formatting; logs `/tmp/devgauge-reset-persistence-{check,format}.log`. The earlier artifact evidence below remains historical.

Sequential release builds succeeded: emulator 46 seconds, phone 52 seconds (`/tmp/devgauge-reset-persistence-{emulator,phone}-build.log`). Emulator release upgrade/launch retained existing sample data and its due-reset label; this is reopen evidence, not live account capture. Final arm64 phone artifact `artifacts/devgauge-preview-phone-8633b6a.apk` is **43,811,030 bytes / 41.78 MiB**, SHA-256 `f3cc51ea1aa968aab17e5bb5741af35eb816a24567fc558026cb1e17f7bd6cb2`; APK signature verification and 60 MiB budget pass. The stable `artifacts/devgauge-device-test.apk` matches it. x86_64 APK is **44,616,547 bytes / 42.55 MiB**, SHA-256 `94ce738425cdde61d6ea0f56ae78076cb0737a2a81a1a2da71e4f4e800f4fb38`. Fresh provider sync is required to replace snapshots that previously lost reset text. Owner live account recheck remains pending.

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

NATIVE-QA-LOG.md retains artifact-specific failures as well as successes. No sampled p50/p95, press latency, RAM or installed-size improvement is asserted. The owner subsequently withdrew earned-reset controls; they are removed from detail pages and direct redemption is no longer a release requirement. Remaining live/native/production evidence in the revised scope must be gathered before the broader goal can close.

## Owner-requested detail and usage revision

Source commits `3a3fed7`, `183eb79`, `203c2ba`, and `1d114fa` implement local timestamp formatting without timezone suffixes, fresh snapshot age, inline detail actions, status colors, earned-section removal, right-aligned card update labels, and Claude reset capture repairs. Full source gates pass: **83 files / 422 tests**, typecheck, zero-warning lint, config and formatting. Logs: `/tmp/devgauge-claude-reset-{check,format}.log`.

`2d504f9` additionally captures Codex's optional workspace monthly bar, exact credit counts and reset text, and applies bounded page completion to both sign-in and refresh. Regression fixtures include the owner's concatenated “Resets Nov 1, 2026 5:00 AM378 of 1,000 credits used” text, percentage-only limits, personal accounts without a third bar, and API/page completion policy. Final source gates pass: **83 files / 425 tests**, typecheck, zero-warning lint, configuration and formatting. Logs: `/tmp/devgauge-workspace-{check,format}.log`. Fresh page discovery can take longer than the prior API-only early completion; no updated live latency claim is made.

Pixel API 35 native inspection of `183eb79` at 375.7 dp and 100%/150% font scale confirms the Connection Stale chip is amber, earned controls and action menu are absent, and all three horizontal buttons remain within the scrollable page. Large labels wrap within their cells. Sample data remained intact; it is not a live Claude account. Screenshots: `/tmp/devgauge-detail-normal.png` and `/tmp/devgauge-detail-large.png`.

Final `2d504f9` x86_64 release install succeeded over the existing preview with sample data retained. Native Usage inspection confirms the update label ends at the card's right content edge. Inline Disconnect opens the existing confirmation sheet; Cancel preserves the connection. Screenshot: `artifacts/devgauge-2d504f9-usage-375dp.png`. Emulator display/font settings were restored after inspection. Workspace credits and live Claude reset capture are parser/policy regression evidence, not live account verification.

Sequential final release builds succeeded (`/tmp/devgauge-workspace-emulator-build.log`, `/tmp/devgauge-workspace-phone-build.log`). Phone source is `2d504f9`; APK **43,810,598 bytes / 41.78 MiB**, arm64-v8a, SHA-256 `54f7809cda0efb43785eb25bfbad8b09f2ee51486d76bf144cf9ac89ad3a18ae`. Emulator **44,616,115 bytes / 42.55 MiB**, x86_64, SHA-256 `0fee6bbab196a40baa45c615f61c01cb586cc1a1a4e705c29530f482e01840a3`. Phone APK signature verification passes; package `app.devgauge.preview`, minimum SDK 24, target 36. It is an internal debug-key-signed release preview. `artifacts/devgauge-device-test.apk` now matches `artifacts/devgauge-preview-phone-2d504f9.apk`. The 60 MiB APK budget passes. Earlier artifact references above remain historical.
