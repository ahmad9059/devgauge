# Android Test Handoff — Embedded Website Sessions

Use the **internal preview APK** at `artifacts/devgauge-phase1-preview.apk` (SHA-256 `1fc4a85c3b85fc74fc2092561820fcf52107c62e06c5b6911aeea3d3bc235056`). It is debug-key signed for testing, package `app.devgauge.preview`, supports Android 7.0+ and common ARM/x86 architectures. The APK must show **Settings → Diagnostics → Android WebView feasibility spike**; if that link is absent, it cannot run this check. Install on a test phone (Android settings may require allowing the local APK install), then use test accounts on official provider pages. Keep passwords, MFA codes and session cookies on the phone; do not send them to the agent or commit screenshots with account details.

For each of **Claude**, **Codex** and **GitHub Copilot**:

1. In Diagnostics, open the provider. Confirm the displayed host is the official provider/identity site. If navigation is blocked, report **only the host** shown in the app (never the full URL, which may contain an authorization code).
2. Sign in, including MFA when needed. Record whether the first-party usage page shows the correct account's current usage and reset data. Do not mark a blank/loading or login page as a successful connection.
3. Force-close and reopen DevGauge; return to that provider and check if the same account remains signed in. Use Reload to see whether usage remains accessible.
4. If practical, sign out and sign in with another **test** account; check whether account identity switches cleanly. Also check another provider to see whether its session was disturbed.
5. Note any errors, extra identity-provider hosts, requirement for third-party cookies, expired-session behavior, and whether system Back works.

Return **redacted text only**, for example:

```text
Android version / WebView version / APK build date:
Claude: login pass/fail; usage visible pass/fail; persists after restart pass/fail; logout pass/fail; notes
Codex: login pass/fail; usage visible pass/fail; persists after restart pass/fail; logout pass/fail; notes
Copilot: login pass/fail; usage visible pass/fail; persists after restart pass/fail; logout pass/fail; notes
Extra official login host(s), if navigation was blocked:
```

This diagnostic does **not** fetch or normalize quota values yet; a pass proves only that the website flow works in the Android WebView. It does not establish provider permission or authorize production synchronization. Gemini CLI is a separate coding-agent quota spike and is not part of this browser test.
