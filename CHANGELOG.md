# Changelog

## 1.0.0

First public release of DevGauge for Android ARM64.

### Features

- Unified usage dashboard for Claude, Codex, Command Code, OpenCode Go, GitHub Copilot, and Antigravity.
- Persistent in-app website connections and Antigravity Google OAuth authorization.
- Provider details with usage windows, reset information, refresh, reauthorization, and disconnect controls.
- Foreground refresh and Android background refresh with a six-hour minimum interval.
- Bounded concurrent synchronization, temporary-failure retries, and preservation of successful snapshots.
- SQLCipher-encrypted local storage and Android Keystore-backed credential storage.
- Local threshold alerts, reset reminders, quiet hours, and data deletion controls.
- Light and dark themes, configurable text sizing, and a centered empty dashboard state.

### Distribution

- Signed ARM64 APK using package ID `app.devgauge`.
- SHA-256 checksum provided alongside the APK.
- Production configuration with development diagnostics disabled.

### Usage notes

- Provider windows depend on the account plan and the data returned by first-party services.
- Android can defer background work; the six-hour interval is not an exact execution time.
- Website sign-in sessions can remain after local disconnection or data deletion.
