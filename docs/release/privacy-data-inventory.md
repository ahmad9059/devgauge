# Privacy and Data Inventory

> Reconciles the actual Phase 4–9 data flows against `SECURITY.md` and the Google
> Play Data Safety form. Reviewed 2026-10-01. Update this file whenever a
> dependency or network behavior changes.

## 1. Data stored on device

| Data | Where | Purpose | Notes |
|---|---|---|---|
| Connections metadata (provider, scope, opaque ref) | Encrypted SQLite | Show connectors | No secrets |
| Usage snapshots + windows | Encrypted SQLite | Dashboard/history | Decimal strings; nulls preserved |
| Refresh attempts | Encrypted SQLite | Diagnostics | Sanitized error only |
| Settings + manual reset entries | Encrypted SQLite | Preferences/reminders | No secrets |
| Credential records (tokens/API keys) | Android Keystore via SecureStore | Provider auth | Never in SQLite/logs |
| SQLCipher key | Android Keystore via SecureStore | DB encryption | Never leaves device |
| Provider website cookies | App-private Android WebView storage | Keep website sign-in | Not exported to diagnostics; provider-specific deletion is unproved |
| Notification rules/operation journal | Encrypted SQLite | Recover scheduling/cancellation | Includes routing/scope; generic copy default, optional provider/window name |
| Local notifications | OS scheduler | Reminders | Generic copy default; optional provider/window name, no account identifiers or amounts |

## 2. Data transmitted

- Connecting and syncing uses first-party website HTTPS requests for Claude, Codex, Copilot, Command Code and OpenCode Go, plus Google OAuth/provider quota HTTPS requests for Antigravity. Provider website sign-in may involve identity providers; do not claim that every browser navigation is a quota API request.
- The native bridge restricts origins/routes and capture size/time. OAuth quota reads use the stored account’s credential. Legacy partner/API adapter gates remain independent from the mounted application transports.
- Usage/history is not uploaded to a DevGauge server. No reset broker/desktop companion is configured. Final account/policy review is still required.
- No advertising identifiers; no telemetry/analytics SDK.

## 3. SDKs and dependencies

- Expo / React Native modules (MIT), `expo-sqlite` (SQLCipher), `expo-secure-store`,
  `expo-notifications` (local only), `expo-crypto`.
- `zod` (MIT) for runtime validation; `@noble/ed25519` + `@noble/hashes` (MIT)
  for capability-manifest signatures. No analytics or crash-reporting SDK.

## 4. Android permissions

- `INTERNET` (Expo/React Native runtime).
- `POST_NOTIFICATIONS` (local reminders; requested contextually, denial is safe).
- No location, contacts, camera, microphone, storage-media, or phone permissions.

## 5. Retention and deletion

- Default detailed history retention: 90 days; the latest successful snapshot per
  connection is kept while connected.
- Settings → Data clears cached usage; delete-all removes connections, history,
  settings, credentials, owned reminders and the database key. Native cancellation must succeed before journal/key deletion. Browser/WebView cookies can remain; global cookie clearing is avoided because it would affect unrelated sessions.
- Keys are unrecoverable if SecuredStorage is cleared; recovery is a documented
  destructive local reset.

## 6. Play Data Safety mapping

- **DevGauge server collection:** no DevGauge account/server or analytics. Provider authentication/usage requests transmit data to providers; this is not a completed Google Play classification.
- **Stored on device only:** connection metadata, usage history, settings.
- **Optional credential storage:** provider tokens/keys in secure storage, used
  only to authenticate the user's own provider account.
- **Provider transmission:** authentication and usage requests reach the user-selected provider/identity provider. Final Play Data Safety classification requires owner review.
- **Encrypted in transit / at rest:** at rest via SQLCipher + Keystore; in transit
  HTTPS for the mounted provider transports.
- **Deletion:** in-app Settings → Data.

## 7. Outstanding (owner/release actions)

- Finalize the store-linked privacy policy URL and legal entity.
- Re-verify permissions against the merged manifest of the release build.
- Decide whether any crash-reporting SDK is added after this inventory.
