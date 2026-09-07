# Phase 4 - Build Identity, Data, Secrets, And Usage Core

Depends on: Phase 2 service foundation; Phase 3 public DTO and state catalogue

---

## 1. Goal

Implement the secure, multi-user control plane that every provider integration shares: app identity, authorization, encrypted credentials, connection lifecycle, normalized snapshot persistence, scheduling, current/history APIs, audit events, and mobile session/offline behavior.

## 2. Scope

### In Scope

- Managed OIDC mobile authentication and account/session lifecycle.
- PostgreSQL schema, migrations, ownership constraints, retention jobs, and row-level defense.
- KMS envelope encryption for provider credentials and opaque Codex profiles.
- Connection state machine, OAuth transaction primitives, companion device primitives, refresh queue, locks, and idempotency.
- Unified current/history APIs with mocked adapters behind explicit development flags.
- Mobile API client, auth routing, secure session storage, offline snapshots, and account deletion/disconnect primitives.

### Out Of Scope

- Real provider authentication or usage calls.
- Final alert rule evaluation and push delivery.
- Team workspaces, shared connections, billing, or admin console.

## 3. Detailed Tasks And Design

### 3.1 Identity And Sessions

- Configure Apple, Google, and email magic-link sign-in through the approved managed OIDC provider.
- Use Authorization Code + PKCE and verified `devgauge://`/universal/app links; validate issuer, audience, nonce/state, expiry, and token signature.
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
- Expire encrypted operational backups within 35 days. Maintain an append-only pseudonymous deletion ledger outside restorable application backups for 90 days after deletion; it contains only the minimum subject tombstone needed to prevent a later restore from resurrecting deleted data. Jurisdiction-approved legal holds require a separately documented exception path.

### 3.3 Secret Boundary

- Generate a data-encryption key per credential/profile artifact; store only ciphertext and KMS-wrapped key.
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

- `packages/database/src/schema/**` (new)
- `packages/database/migrations/**` (new)
- `packages/database/src/repositories/**` (new)
- `packages/contracts/src/auth.ts` (new)
- `packages/contracts/src/connections.ts` (new)
- `packages/contracts/src/usage.ts` (new)
- `apps/api/src/plugins/auth.ts` (new)
- `apps/api/src/plugins/database.ts` (new)
- `apps/api/src/plugins/crypto.ts` (new)
- `apps/api/src/routes/me.ts` (new)
- `apps/api/src/routes/connections.ts` (new)
- `apps/api/src/routes/usage.ts` (new)
- `apps/api/src/services/connection-service.ts` (new)
- `apps/api/src/services/usage-service.ts` (new)
- `apps/connector-worker/src/queues/refresh.ts` (new)
- `apps/connector-worker/src/security/job-sandbox.ts` (new)
- `apps/mobile/src/auth/**` (new)
- `apps/mobile/src/api/**` (new)
- `apps/mobile/src/storage/**` (new)
- `apps/mobile/app/(auth)/**` (new)

## 5. Acceptance Criteria And QA Checklist

- [ ] Users cannot read, refresh, disconnect, or delete another user's connection/snapshot by changing any identifier.
- [ ] OAuth states are single-use, user/session-bound, short-lived, and replay-tested.
- [ ] Credential plaintext never appears in database rows, object storage, logs, traces, error responses, crash reports, or job payloads.
- [ ] Key rewrap rotation and disconnect/account-deletion deletion drills pass in staging.
- [ ] Concurrent duplicate refresh requests yield one provider job and one logical snapshot.
- [ ] Transient and contract failures preserve the latest valid snapshot and expose health separately.
- [ ] Unknown provider window IDs round-trip through database and API unchanged.
- [ ] History pagination is stable under concurrent inserts and respects retention boundaries.
- [ ] Offline app launch displays cached data with stale/fetched labels and never claims a refresh occurred.
- [ ] Sign-out purges user-partitioned mobile cache and SecureStore session data.
- [ ] API authorization, input validation, rate limits, body limits, and error envelopes pass integration tests.
- [ ] Migration rollback/restore is rehearsed on a copy of staging data before production deployment.
- [ ] Restore reconciliation proves a user/credential deleted after the backup was taken cannot reappear in a restored environment.
- [ ] Backup expiration at 35 days and deletion-ledger expiration at 90 days are automated, monitored, and consistent with the approved jurisdiction policy.
- [ ] Mobile cache remains unreadable without its SecureStore key; backup/device-transfer/reinstall/key-loss tests fail closed and recover through reauthentication/refetch.
- [ ] Provider child-process probes cannot access service environment variables, cloud metadata, databases, queues, KMS, other user files, or unapproved network hosts.

## 6. Open Questions

- Which managed OIDC provider is approved after cost, mobile SDK, regional, and export requirements are compared?
- Does account deletion require immediate hard deletion or a short reversible grace period for non-secret profile data?
- Is 13-month history included for every user or controlled by a future paid plan?
