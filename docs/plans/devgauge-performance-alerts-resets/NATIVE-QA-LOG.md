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
