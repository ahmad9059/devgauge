# Native verification log — in progress

2026-10-01. Emulator evidence only. No eligible signed-in provider account, physical phone or TalkBack user trial has been verified. These observations do not close the original goal.

## Environment and artifacts

Pixel_8_API_35, Android 15/API 35, x86_64, persisted emulator userdata. Release preview installs used `adb install -r`, preserving the existing diagnostic sample connection and snapshots. The displayed Claude account is labeled **Demo · sample data**; its usage is not live-account performance evidence.

| Source commit | APK bytes | MiB | SHA-256 |
|---|---:|---:|---|
| `c056fcb1b8f88d47e966e24e935bdd1399eac1d4` | 44,493,299 | 42.43 | `30fdf045a0ffe68e6db76ee16304742120cd4427ed5ba9b17184c983aec9993b` |
| `fb86422` | 44,613,107 | 42.55 | `e27b2e11d7045d18e50ebb738d1fd7db1957b38f33c33fff5f00595bf01ce727` |
| `cda318b` | 44,616,983 | 42.55 | `f0d810876308ff9eb20f61d4e27bec5938ba8c46ce2a28f13f954ad150f0d0d9` |
| `42535d2a0a22bb2748c6670077a6192239ef7427` | 44,616,871 | 42.55 | `2f4effc5a28920bdf1f02a22bf1634308e7e03e3e9051c4398ce544e654d8b07` |

APKs and JSON size reports are preserved in gitignored `artifacts/devgauge-preview-emulator-<commit>.*`. Native logs are `/tmp/devgauge-emulator-release-build.log`, `/tmp/devgauge-emulator-notification-build.log`, `/tmp/devgauge-emulator-actions-build.log`, `/tmp/devgauge-emulator-runtime-build.log`, and `/tmp/devgauge-emulator-ui-followup-build.log`. Incremental builds reused the originally clean-prebuilt emulator tree. Build results were successful; latest incremental build took 44 seconds. APK bytes are not installed size, Play download size or RAM.

## Observed results

- Native startup and process restart opened the existing encrypted database, retained diagnostic sample snapshots and loaded Geist/icon fonts under R8/resource shrinking. Creating a manual reminder exercised forward journal/scope migrations and native scheduling. No application fatal exception was observed. An emulator System UI ANR was cleared; it is not evidence that the application crashed.
- Notification settings displayed denied/granted permission accurately after refresh/focus. Permission grant/revoke for this delivery trial used `adb shell pm grant/revoke ... android.permission.POST_NOTIFICATIONS`; it was not an OS prompt usability test.
- On `fb86422`, created a future Claude manual reminder through the UI, entered an explicit UTC instant, confirmed Asia/Karachi device timezone, and saved. UI showed **scheduled** and `dumpsys alarm` showed an owned `RTC_WAKEUP` notification event.
- Requested time: 2026-10-01 20:15:54 PKT. Android assigned an inexact window of about 81 seconds and posted the notification at approximately 20:17:15 PKT while the application was backgrounded. The shade showed generic title/body, and tapping opened Claude’s provider detail. `am kill` did not terminate the retained process, so this proves background delivery and warm tap only; it does not prove killed-app/cold-tap delivery.
- Returning to settings showed **elapsed**, not an invented delivered acknowledgement. Deleted this QA reminder through the UI; the entry disappeared. Original notification permission was restored to denied.
- `cda318b` rendered the earned-reset section as **Availability unknown**, separated from normal usage-window countdowns. No credit was consumed and no first-party redemption was attempted.
- At 375.7 dp width (`wm size 1080x1920`, density 460), 150% system font and animator/transition scales zero, a settings label ellipsis was observed. `42535d2` removed ListRow title/subtitle clamps; the rebuilt screen wrapped the full permission label. Portrait and landscape screenshots are `artifacts/devgauge-42535d2-notifications-{375dp,landscape}-font150.png`. Scroll content extends below the viewport normally. This limited check does not establish all screens or active sync motion accessibility.
- Emulator size/density/font/rotation/animation settings were restored afterward. Existing sample data was retained.

## Remaining native matrix

Physical arm64 install; live sign-in and cold/warm sync timings/call counts; WebView/OAuth account changes and cookie-scoped logout; foreground, cold tap, process-killed and power-restricted reminder delivery; native edited reset/quiet-hour/timezone trials; disconnect and delete-all recovery; full light/dark/tablet and TalkBack matrix. RAM samples are scenario-specific observations, not a measured performance improvement.

## Tablet verification and defects found

DevGauge_Tablet_API_35, Android 15/API 35, x86_64, 2560×1600 at density 320 (1280×800 dp). Fresh application data; no real account or the Pixel diagnostic sample is involved. Installed `42535d2`, then `c8c20cd` with `adb install -r`.

- Notifications screen: light screenshot `artifacts/devgauge-42535d2-tablet-notifications-light.png` and dark `artifacts/devgauge-c8c20cd-tablet-notifications-dark.png` inspected without clipped text or overlap. The initial dark attempt was obstructed by Android Accessibility Suite's notification permission dialog; its obscured capture is not valid UI evidence. Stopping that system app cleared the dialog before the valid dark capture. No TalkBack trial is claimed.
- `c8c20cd`: granted app notification permission using adb for an isolated delivery trial. Created a manual Claude reminder through the form with explicit timezone confirmation and UTC instant `2026-10-01T15:37:06Z`. UI showed scheduled; Android assigned a roughly 109.56-second inexact window.
- Backgrounded the application, then terminated its PID 4795 with `kill -9` from the rooted emulator. `pidof` confirmed no app process. This is process death, not Android force-stop (which has different alarm semantics). By 20:39:02 PKT, the OS had restarted receiver PID 5261 and posted generic **DevGauge reminder / Check your provider’s scheduled usage reset.** The trial demonstrates delivery after process death on this emulator, not a physical phone or power-restricted OS.
- Notification tap launched MainActivity but landed on default Usage rather than Claude detail. **Cold route failed.** `0f84dfa` retains the notification response until the initial index redirect settles; native retest remains pending. Unit regressions simulate the redirect race, duplicate handling, navigation readiness and unsafe payloads.
- Cleanup review found delete-all relied on key-loss recovery instead of explicitly removing the file. `2a298d8` removes the file before the encryption key and retains the key on file-removal failure; failure/retry and native-cancellation regressions pass. `4e43eff` uses Android `canAskAgain` to offer contextual opt-in after retryable denial; permanent denial opens settings. Native prompt and cleanup retests remain pending.

The tablet was shut down to free build memory, with its QA manual entry still retained for cleanup testing. Night mode and notification permission must be restored after the trial. Root adb was used only in this emulator; restore unroot after process-death checks.

## Device-test handoff and emulator cleanup

Owner requested the final device-test APK and confirmed account access on their device. `0f84dfa` emulator APK installed successfully after boot; cold tap/OS prompt/app delete-all retests are still not claimed. The tablet's isolated QA data was cleared with Android `pm clear`, rather than claiming that app delete-all was tested. Original light system mode and denied notification permission were restored, adb unrooted and the emulator stopped. Pixel diagnostic sample data was unaffected. Exact final handoff hashes are in BASELINE.md.

## Current candidate native retest

`0f84dfa`, DevGauge_Tablet_API_35/API 35/x86_64, 2560×1600 at density 320. Commands explicitly selected emulator-5554; the owner's newly connected physical device was not modified.

- With denied/retryable notification permission, settings showed **Allow notifications**. Pressing it displayed the actual **Allow DevGauge to send you notifications?** Android prompt. Pressed Allow through UI; returned status was granted. This replaces adb-only grant evidence for contextual prompting, but does not cover every denial/revocation sequence.
- Created a Claude manual reminder for `2026-10-01T15:50:09Z` through the form with timezone confirmation. Android assigned an 85.417-second inexact window. Backgrounded and killed PID 2562; no app PID remained before delivery. Notification was present by 20:51:41 PKT.
- Tapped the reminder in the shade after process death. The current build opened **Claude provider detail**, with truthful unavailable usage/unknown earned-reset availability because there is no connected account. Cold routing now passes on this artifact. Screenshot: `artifacts/devgauge-0f84dfa-cold-tap-result.png`; UI tree: `/tmp/devgauge-cold-route-result.xml`.
- Settings showed the reminder as elapsed. An automation attempt to edit to the next day did not establish a native future schedule; do not count it as edited-schedule or pending-cancellation proof.
- Used Settings → Delete all local data → Delete everything against this isolated manual-reminder fixture. UI reported deletion; notification settings reopened with no manual reminder. No app fatal/native-JS error was observed and no pending app alarm remained. This verifies successful local cleanup/reopen with an elapsed reminder, not cancellation of an active future alarm or browser cookies/live account credentials. UI evidence: `/tmp/devgauge-delete-result.xml` and `/tmp/devgauge-after-delete.xml`.

Current reports preserve remaining active-schedule cancellation, quiet-hours/timezone, foreground/power, live account and accessibility checks. The candidate APK handed to the owner is unchanged.
