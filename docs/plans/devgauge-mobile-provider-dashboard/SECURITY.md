# DevGauge Security and Privacy Plan

> Security posture is architectural because no application code exists yet (`README.md:1`). This document defines mandatory controls and release gates, not findings against an implementation.

## 1. Security Objectives

1. DevGauge never learns provider passwords.
2. Compromise of SQLite does not expose provider credentials.
3. A malicious deep link cannot complete or redirect another auth transaction.
4. One provider cannot receive another provider's credential.
5. Logs, analytics, exports, notifications, and crash reports contain no secrets.
6. Disconnect and delete actions are complete, explainable, and testable.
7. Experimental provider failure cannot compromise supported connectors.

## 2. Non-Negotiable Authentication Boundary

Third-party login must use an external user-agent via `expo-auth-session` or `openAuthSessionAsync`, backed by `ASWebAuthenticationSession` on iOS and Custom Tabs/Auth Tab on Android.

Prohibited:

- `react-native-webview` for provider authentication.
- JavaScript injection into login or usage pages.
- Cookie extraction, session replay, or cookie transfer.
- Capturing usernames, passwords, passkeys, MFA codes, or keystrokes.
- Importing Claude `.credentials.json` or Codex `auth.json`.
- Reusing first-party CLI client IDs without vendor authorization.
- Scraping private account endpoints with browser sessions.

RFC 8252 requires native apps to use external user-agents and says embedded user-agents must not be used because the host can capture credentials and cookies. If a provider does not offer a registered third-party OAuth/API contract, the connector stays blocked.

## 3. Threat Model

| Threat actor | Goal | Primary controls |
|---|---|---|
| Malicious app on device | Intercept OAuth callback/code | Claimed HTTPS links where possible, PKCE S256, exact redirect, state, unique provider paths |
| Network attacker | Read/modify usage/token traffic | HTTPS only, OS trust store, no cleartext, redirect host allowlist |
| Compromised provider response | Trigger unsafe behavior or corrupt DB | Runtime schema validation, fixed endpoints, bound SQL, domain constraints |
| Lost/unlocked device | Read provider tokens and history | SecureStore, SQLCipher decision, OS lock, optional biometric gate |
| Log/analytics operator | Obtain credentials/account details | Central redaction, data minimization, opt-in telemetry decision |
| Malicious deep link/notification | Open arbitrary route or finish auth | Route allowlist, transaction binding, state/nonce validation |
| Supply-chain compromise | Exfiltrate secrets | Minimal dependencies, lockfile, provenance/audit, review native SDKs |
| Experimental endpoint change | Return unexpected data or redirect | Signed kill switch, schema contracts, no arbitrary URLs, fail closed |

## 4. OAuth Security Requirements

- Authorization Code flow with PKCE S256.
- At least 256 bits of entropy for state and verifier material.
- Transaction-specific state; OIDC nonce where applicable.
- Unique callback path per provider.
- Exact redirect matching; claimed HTTPS preferred, reverse-domain scheme fallback.
- Verify issuer/audience/signature/expiry for ID tokens when used.
- Reject callbacks with missing, expired, replayed, or mismatched transaction data.
- Keep verifier and authorization code only until exchange completes.
- Never ship a confidential client secret in JavaScript/native bundle.
- Minimum provider scopes and explicit consent copy.
- Refresh token rotation where provider supports it.
- Remote revocation before local deletion where possible.

## 5. Credential Storage

### SecureStore

- One credential record per connection with opaque lookup key.
- Async APIs only to avoid blocking the JS thread.
- Small records only; large account payloads are rejected/minimized.
- `WHEN_UNLOCKED` or stricter iOS accessibility.
- Consider `requireAuthentication` as opt-in due to invalidation/recovery UX.
- Explicit deletion on disconnect and delete-all.
- Android backups exclude SecureStore.
- iOS reinstall persistence is treated as possible; first launch checks and offers cleanup/recovery.

### SQLite

- No tokens, API keys, cookies, auth codes, or raw headers.
- SQLCipher key in SecureStore, never source/app config/database.
- Prepared statements for all dynamic values.
- Diagnostics export operates on a redacted view, not raw tables.

## 6. Network Security

- Provider hosts are compile-time allowlisted.
- User input never controls base URL, redirect target, or proxy.
- HTTPS with modern platform defaults; certificate pinning is not default because rotation risks availability, but may be reconsidered for a DevGauge-owned broker.
- Disable HTTP redirects across origins for API calls.
- Bounded request/response size and timeouts.
- Do not store response bodies in production logs.
- API keys use authorization headers, never query strings.
- Broker sets `no-store`, strict transport security, restrictive CORS, request-size limits, and structured redaction.

## 7. Logging, Analytics, and Diagnostics

Central redaction must remove values for keys matching:

```text
authorization, cookie, set-cookie, token, access_token, refresh_token,
api_key, secret, code, verifier, password, session
```

Rules:

- Provider request IDs may be logged if they are not credentials.
- Account email/login is masked by default.
- Diagnostics export requires preview and explicit share action.
- No session replay analytics SDK.
- Crash reporting is not added until its data inventory and scrub hooks are approved.
- Development SQLite inspectors and network inspectors are disabled in release builds.

## 8. Notification Privacy

- Ask permission only after user enables a reminder.
- Default lock-screen copy: `DevGauge: a provider usage window changed` or `A usage window is resetting soon`.
- Do not put provider tokens, exact account identifiers, usage amounts, or sensitive work details in payloads.
- Local notification routes are allowlisted.
- Cancel provider notifications on disconnect/delete.
- App remains fully usable when permission is denied.

## 9. Local Data Lifecycle

| Event | Required behavior |
|---|---|
| Disconnect | Attempt remote revocation, delete SecureStore credential, cancel notifications, retain/delete history per user choice |
| Delete provider data | Delete connection, history, attempts, rules, schedules, and secret |
| Delete all data | Revoke all possible credentials, cancel all notifications, delete DB/key/settings, report partial remote failures |
| App upgrade | Migrate transactionally; never log decrypted records |
| Biometric/key invalidation | Explain credential/database recovery; never silently downgrade protection |
| Experimental connector disabled | Stop network requests; preserve readable cached data and offer credential deletion |

## 10. Provider-Specific Risks

### Claude and Codex

- Consumer sessions are high-value, broad credentials.
- No supported third-party quota API means any cookie/session approach is a security and policy risk.
- Connector remains blocked until vendor partnership requirements are met.

### Command Code and OpenCode Go

- User API keys may permit model usage/spend, not merely read-only usage.
- Ask vendors for read-only usage scopes. If keys are broad, show explicit risk and consider no production release.
- Undocumented endpoint changes require kill switches and parser isolation.

### GitHub Copilot

- Use a GitHub App rather than a broadly scoped classic token.
- Request only plan/billing read capability needed.
- Distinguish personal from organization-admin authorization.
- Confidential exchange remains broker-side if required.

## 11. App Store and Privacy Compliance

- Publish in-app and store-linked privacy policy covering collection, local storage, retention, deletion, providers, and optional broker.
- Complete Apple App Privacy and Google Data Safety forms from an actual data inventory.
- Provide reviewer notes explaining external authentication and demo behavior.
- If DevGauge later creates its own accounts, implement in-app account deletion and required web deletion path.
- Review Apple third-party/social credential rules before sending any provider token to a backend.
- Do not describe blocked/manual providers as connected accounts.
- Obtain trademark/brand-asset permission and follow each provider's brand guidelines.

## 12. Secure Development Lifecycle

- Threat-model review before auth/database implementation.
- Dependency lockfile and automated vulnerability/license checks.
- Secret scanning in pre-commit and CI.
- Typecheck, lint, unit, contract, migration, and E2E gates.
- Security review of all deep-link/auth changes.
- Production config prohibits debug menus and non-HTTPS traffic.
- Release checklist validates privacy disclosures against actual SDKs.
- Incident runbook includes connector kill switch, token-revocation guidance, and user notice criteria.

## 13. Security Test Matrix

- OAuth callback with wrong/missing/replayed state.
- Callback on wrong provider route.
- PKCE verifier mismatch.
- Expired token refresh and refresh-token rotation.
- Malicious notification/deep-link route.
- Provider response with huge values, NaN, negative values, unexpected enums, and hostile text.
- Logs and diagnostics scanned for seeded fake secrets.
- SQLite export scanned for seeded fake tokens.
- Disconnect with network failure and later revocation guidance.
- iOS reinstall/keychain persistence scenario.
- Android restore without Keystore key.
- SQLCipher key loss and recovery.
- Experimental manifest signature tampering, expiry, audience mismatch, clock skew, and lower-version replay.

## 14. Release Blockers

- Any embedded WebView authentication or cookie capture.
- Any provider secret in SQLite/logs/analytics.
- Claude/Codex automatic sync without documented partner approval.
- Command Code/OpenCode Go production enablement without vendor endpoint permission.
- Missing remote/local credential deletion path.
- OAuth state/PKCE/redirect validation test failure.
- Privacy disclosures not matching actual data flow.

## 15. References

- [RFC 8252: OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)
- [RFC 7636: PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 Security Best Current Practice, RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)
- [React Native security](https://reactnative.dev/docs/security)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo SQLite security](https://docs.expo.dev/versions/latest/sdk/sqlite/#security)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
