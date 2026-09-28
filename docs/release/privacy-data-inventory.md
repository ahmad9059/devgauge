# Privacy and Data Inventory

> Reconciles the actual Phase 4–9 data flows against `SECURITY.md` and the Google
> Play Data Safety form. Reviewed 2026-09-28. Update this file whenever a
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
| Local notifications | OS scheduler | Reminders | Generic copy only |

## 2. Data transmitted

- **This build transmits nothing.** Every connector is disabled; no provider
  network request is made.
- When a connector is enabled: HTTPS only, fixed allowlisted hosts, fixed
  endpoints, bounded size/time, no third-party analytics. An optional broker
  would carry only confidential OAuth exchange material (no usage history).
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
  settings, credentials, and the database key.
- Keys are unrecoverable if SecuredStorage is cleared; recovery is a documented
  destructive local reset.

## 6. Play Data Safety mapping

- **Collected:** none by DevGauge (no account, no analytics).
- **Stored on device only:** connection metadata, usage history, settings.
- **Optional credential storage:** provider tokens/keys in secure storage, used
  only to authenticate the user's own provider account.
- **Shared:** not applicable in this build.
- **Encrypted in transit / at rest:** at rest via SQLCipher + Keystore; in transit
  HTTPS only (when connectors are enabled).
- **Deletion:** in-app Settings → Data.

## 7. Outstanding (owner/release actions)

- Finalize the store-linked privacy policy URL and legal entity.
- Re-verify permissions against the merged manifest of the release build.
- Decide whether any crash-reporting SDK is added after this inventory.
