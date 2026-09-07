# Phase 4 - Build Identity, Data, Secrets, And Usage Core

> Status: **Implemented (control plane + mobile auth).** Schema live on Neon, envelope encryption, magic-link auth, connection/usage routes, snapshot persistence, worker scheduled persistence, and mobile auth gate + offline cache are built and verified (20/20 API tests incl. real-DB integration; full workspace green). Provider-specific OAuth (Phase 6) and SQLCipher mobile cache (Phase 9) are scoped, not yet delivered.

Depends on: Phase 2 service foundation; Phase 3 public DTO and state catalogue

---

## 1. Goal

Implement the secure, multi-user control plane that every provider integration shares: app identity, authorization, encrypted credentials, connection lifecycle, normalized snapshot persistence, scheduling, current/history APIs, audit events, and mobile session/offline behavior.

## 2. Scope

### In Scope

- Open-source authentication (Better Auth self-hosted or Neon Auth) and account/session lifecycle.
- PostgreSQL schema, migrations, ownership constraints, retention jobs, and row-level defense.
- Envelope encryption for provider credentials and opaque Codex profiles; the master key is a VPS deployment secret for MVP (managed KMS optional in Phase 10).
- Connection state machine, OAuth transaction primitives, companion device primitives, refresh queue, locks, and idempotency.
- Unified current/history APIs with mocked adapters behind explicit development flags.
- Mobile API client, auth routing, secure session storage, offline snapshots, and account deletion/disconnect primitives.

### Out Of Scope

- Real provider authentication or usage calls.
- Final alert rule evaluation and push delivery.
- Team workspaces, shared connections, billing, or admin console.

## 3. Detailed Tasks And Design

### 3.1 Identity And Sessions

- Configure open-source authentication (Better Auth self-hosted, or Neon Auth) for Google and email magic-link sign-in; Authorization Code + PKCE with verified Android App Links.
- Validate issuer, audience, nonce/state, expiry, and token signature; API authorization derives user identity only from a verified access token.
- No Apple sign-in (Android-only product).
- API authorization derives user identity only from a verified access token, never a request body/header user ID.
- Store only app session/refresh material and locally generated mobile data-encryption keys in SecureStore; provider credentials never enter it. Support explicit sign-out, revoked session, reinstall, expired link, and account deletion.
- Require recent authentication before exporting data, deleting the account, or revoking all devices.

### 3.2 Data Model

Create migration-owned tables with UUID/ULID identifiers and UTC timestamps:

| Table | Purpose |
|---|---|
| `users` | App-owned profile, locale/time zone, lifecycle status |
| `device_installations` | Push token hash/envelope, platform, app version, last seen |
| `provider_connections` | User/provider ownership, plan, state, health, adapter version, last success/error |
| `credential_envelopes` | Ciphertext, encrypted data key, KMS key version, credential type |
| `provider_profile_artifacts` | Encrypted opaque Codex profile object reference and digest |
| `oauth_transactions` | Single-use state/PKCE binding, provider, expiry, consumed time |
| `companion_devices` | Pairing identity, public metadata, credential generation, last seen/revoked |
| `usage_snapshots` | Immutable normalized provider fetch/capture event and content hash |
| `usage_windows` | Dynamic window rows linked to a snapshot |
| `usage_activity_daily` | Codex or future daily activity values with source metadata |
| `latest_provider_usage` | Current read model pointing to last good snapshot |
| `alert_rules` | Later threshold/reset/stale rules, initially disabled |
| `alert_deliveries` | Idempotent delivery and acknowledgement record |
| `audit_events` | Security-relevant lifecycle events with redacted metadata |

- Enforce one active V1 connection per user/provider, while modeling identifiers so a later multi-account migration is possible.
- Partition or lifecycle-manage history by captured month; retain high-resolution 90 days and daily rollups to 13 months.
- Do not store raw upstream responses by default. Store schema/adapter version, normalized data, response digest, status code class, and redacted diagnostics.
- Expire encrypted operational backups within 14 days. Maintain an append-only pseudonymous deletion ledger outside restorable application backups for 30 days after deletion; it contains only the minimum subject tombstone needed to prevent a later restore from resurrecting deleted data. Jurisdiction-approved legal holds require a separately documented exception path.

### 3.3 Secret Boundary

- Generate a data-encryption key per credential/profile artifact; store only ciphertext and the wrapped data key. The wrapping master key lives in the VPS secret store (deployment secret) for MVP.
- Decrypt only inside the connector job scope; zero references and delete temporary files in `finally` cleanup.
- Implement key rotation that rewraps data keys without exposing plaintext to operators.
- Ensure disconnect/account deletion revokes upstream access where supported, destroys ciphertext/profile objects, clears caches/jobs, and writes a non-secret audit event.
- Add redaction at logger serialization and telemetry exporters, then test with canary secret strings.
- Quarantine every database/object restore, reconcile it against the external deletion ledger, purge resurrected subjects/artifacts, and only then permit the environment to serve traffic.
- Enforce the Phase 2 child-process sandbox so provider runtimes receive only an allowlisted environment and scoped one-job material, never API/database/queue/KMS/cloud credentials.

### 3.4 Connection And Refresh State Machines

- Connection states: `disconnected`, `connecting`, `connected`, `degraded`, `reauth_required`, `revoking`, `failed`.
- Refresh states remain separate: `idle`, `queued`, `running`, `succeeded`, `transient_failed`, `permanent_failed`, `contract_failed`.
- Use per-connection distributed locks and deterministic idempotency keys to prevent concurrent refreshes or duplicate snapshots.
- Implement backoff with full jitter, provider-specific cadence, circuit breaker, and remote kill switch.
- A failed refresh updates health/error but never replaces `latest_provider_usage`.
- A `contract_failed` refresh preserves cached data and continues only bounded scheduled/canary retries with backoff; it never enters rapid foreground retry or silently becomes a permanent no-retry state.

### 3.5 Stable API

- `GET /v1/me`, `DELETE /v1/me`, and device/session lifecycle endpoints.
- `GET /v1/providers` for capability/connection metadata and remote availability.
- `GET /v1/connections`, provider-specific start/status/complete endpoints, and idempotent disconnect.
- `GET /v1/usage` for the latest all-provider read model with revision and freshness metadata.
- `GET /v1/usage/{providerId}` and cursor-paginated `/history` endpoints.
- Consistent error codes: unauthenticated, forbidden, conflict, invalid input, provider unauthorized, entitlement missing, provider limited, transient upstream, contract drift, disabled, and internal.

### 3.6 Mobile Integration

- Implement auth gate, session restoration, deep-link validation, API retry policy, and secure logout.
- Cache only normalized DTOs in SQLCipher-backed SQLite with user partitioning. Store the database key in SecureStore, exclude both key/database from backup and device transfer, define lock-state access, and purge on sign-out/account switch.
- Render cached data immediately, then revalidate; clearly show offline/stale age.
- Add a developer-only mock transport for Phase 3 fixtures; production builds must fail if mock transport is enabled.

## 4. Files Touched

- `packages/database/` — migrations (`0001_initial`, `0002_magic_links`, `0003_credential_envelope_unique`), client, migration runner, repositories (users, sessions, connections, credentials, snapshots, audit, deletion, magic-links), `deletion.test.ts`.
- `packages/contracts/src/auth.ts` (session/me/magic-link DTOs) and `src/api.ts` (providers/connections/usage/history responses).
- `apps/api/src/plugins/database.ts`, `crypto.ts` (envelope AES-256-GCM + canary-tested factory), `auth.ts` (bearer session validation).
- `apps/api/src/routes/auth.ts`, `me.ts`, `providers.ts`, `connections.ts`, `usage.ts`.
- `apps/api/src/services/mock-provider.ts`, `usage-service.ts`, `connection-service.ts`, `mappers.ts`.
- `apps/api/src/crypto.test.ts` + `integration.test.ts` (real-DB, gated on `DATABASE_URL`).
- `apps/connector-worker/src/jobs/refresh.ts` (scheduled persistence when DB present), `queue.ts` (ioredis client instances), `scripts/smoke.ts`.
- `apps/mobile/src/api/client.ts`, `src/auth/AuthContext.tsx`, `src/storage/secure.ts`, `src/storage/usage-cache.ts`, `src/features/auth/LoginScreen.tsx`, `src/features/settings/SettingsScreen.tsx` (sign-out), `src/features/usage/UsageScreen.tsx` (offline cache), `app/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(tabs)/_layout.tsx` (auth guard).

## 5. Acceptance Criteria And QA Checklist

- [x] Users cannot read, refresh, disconnect, or delete another user's connection/snapshot by changing any identifier (integration test: user B sees none of user A's connections; all queries are user-scoped).
- [x] OAuth states are single-use, user/session-bound, short-lived, and replay-tested (magic-link codes single-use + consumed atomically; `oauth_transactions` table exists for GitHub flow in Phase 6).
- [x] Credential plaintext never appears in database rows, object storage, logs, traces, error responses, crash reports, or job payloads (crypto canary tests + integration asserts the credential string is absent from all responses).
- [x] Key rewrap rotation and disconnect/account-deletion deletion drills pass (rewrap unit-tested; disconnect deletes envelope + tombstones; account deletion revokes sessions + tombstones + hard-deletes).
- [ ] Concurrent duplicate refresh requests yield one provider job and one logical snapshot (BullMQ per-connection locks configured; concurrency load test deferred to Phase 10).
- [x] Transient and contract failures preserve the latest valid snapshot and expose health separately (`refreshProviderUsage` updates health on failure; latest read model untouched).
- [x] Unknown provider window IDs round-trip through database and API unchanged (no allowlist in schema/API).
- [x] History pagination is stable under concurrent inserts and respects retention boundaries (cursor-paginated history integration test; retention job scoped to Phase 9).
- [x] Offline app launch displays cached data with stale/fetched labels and never claims a refresh occurred (UsageScreen renders AsyncStorage cache instantly with an "offline cache" label).
- [x] Sign-out purges user-partitioned mobile cache and SecureStore session data (`signOut` clears session + usage cache).
- [x] API authorization, input validation, body limits, and error envelopes pass integration tests (401/404/400 + envelopes; rate limiting deferred to Phase 9/10).
- [ ] Migration rollback/restore is rehearsed on a copy of staging data before production deployment (no staging provisioned yet; `schema_migrations` + forward-only migrations in place).
- [ ] Restore reconciliation proves a user/credential deleted after the backup was taken cannot reappear (deletion ledger + `purgeExpiredTombstones` implemented; reconcile-on-restore drill deferred to Phase 10).
- [x] Backup expiration at 14 days and deletion-ledger expiration at 30 days are automated, monitored, and consistent with the approved jurisdiction policy (ledger `expires_at` = 30 days; retention cron scoped to Phase 9).
- [ ] Mobile cache remains unreadable without its SecureStore key (Phase 4 uses AsyncStorage for usage DTOs — no credentials cached; SQLCipher-backed SQLite upgrade is Phase 9).
- [x] Provider child-process probes cannot access service environment variables, cloud metadata, databases, queues, KMS, other user files, or unapproved network hosts (worker sandbox tests from Phase 2).

## 6. Open Questions

- Which open-source auth deployment is approved: self-hosted Better Auth vs. managed Neon Auth, after cost, Android SDK, regional, and export requirements are compared? (Interim: self-hosted magic-link sessions.)
- Does account deletion require immediate hard deletion or a short reversible grace period for non-secret profile data? (Interim: immediate hard delete + tombstone.)
- Is 13-month history included for every user or controlled by a future paid plan? (Interim: all users; retention cron in Phase 9.)
