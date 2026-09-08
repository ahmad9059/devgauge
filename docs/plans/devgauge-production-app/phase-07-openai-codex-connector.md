# Phase 7 - Ship OpenAI Codex Connector

> Status: **Implemented and migrated; authenticated canary pending.** The pinned `0.153.4` App Server handshake/account-read canary, generated-schema drift gate, isolated process supervisor, encrypted profile artifacts, device login, quota/activity normalization, reset-credit workflow, API/worker wiring, mobile states, and production migration `0006_codex_operations.sql` are complete. The controlled authenticated-account staging canary remains pending access.

Depends on: Phase 4 secret/profile primitives; Phase 6 isolated runtime controls

---

## 1. Goal

Integrate the official Codex App Server protocol through a hardened process supervisor, isolated per-user profiles, device-code onboarding, dynamic rate-limit normalization, live update ingestion, and optional read-only activity summaries. Codex profile contents remain opaque and inaccessible outside the connector boundary.

## 2. Scope

### In Scope

- Pinned Codex binary acquisition, checksum verification, schema generation, and compatibility canary.
- JSONL `stdio` process supervision, initialization, request routing, notifications, timeouts, and cleanup.
- ChatGPT device-code login, status/cancel/logout, per-user profile encryption/isolation, and reconnection.
- Dynamic rate limits, plan, reached reason, returned credit metadata, usage summaries, daily token buckets, history, and mobile UI.
- Consuming earned reset credits with explicit confirmation, idempotency, and post-consume refresh (promoted to V1 in the Phase 1 sign-off; tracked as risk R13).

### Out Of Scope

- API-key-only login for ChatGPT subscription usage.
- Host-supplied experimental ChatGPT tokens.
- Experimental public WebSocket exposure or internal `chatgpt.com/backend-api` endpoints.

## 3. Detailed Tasks And Design

### 3.1 Binary And Generated Contract

- Pin a known Codex App Server release and platform artifact; verify checksum/signature and include it in the SBOM.
- Generate TypeScript and JSON schemas from that exact installed version in CI rather than maintaining protocol shapes manually (`docs/ai-coding-usage-provider-api-guide.md:84-104`).
- Fail builds on unreviewed generated-schema drift. Upgrade through fixture replay, canary login/read, and staged rollout.
- Keep a provider kill switch and minimum/maximum supported protocol version metadata.

### 3.2 Process Supervisor

- Start `codex app-server` with a unique per-job profile directory and no public listener.
- Send exactly one `initialize` request and `initialized` notification before any account RPC (`docs/ai-coding-usage-provider-api-guide.md:90-97`).
- Parse bounded newline-delimited JSON incrementally, reject oversized/non-JSON lines, route integer request IDs, and dispatch known notifications without blocking stdout.
- Serialize profile-mutating login/logout operations per connection; permit bounded read sequencing only after initialization.
- Enforce startup, RPC, login, idle, and total process timeouts; terminate process groups and clean temporary directories on cancel/error/shutdown.
- Redact device codes, profile paths, auth material, and suspicious stdout/stderr fields before telemetry.

### 3.3 Profile Isolation

- Treat the App Server profile directory as an opaque secret artifact. Archive only after process shutdown, encrypt with a per-artifact data key, store digest/version metadata, and remove the plaintext directory.
- Restore into a newly created directory with restrictive permissions for each job. Never reuse one user's directory for another or mount all profiles into one worker path.
- Lock each profile across login/read/logout jobs and use optimistic artifact version checks before save.
- Deletion destroys the encrypted object and envelope, calls `account/logout` when possible, cancels active jobs, and records only redacted audit metadata.

### 3.4 Device-Code Connection

- API creates a connection/login attempt and starts an isolated App Server login job with `chatgptDeviceCode`.
- Mobile displays returned verification URL and user code with copy/open actions, expiry countdown, accessible instructions, cancel, and resume after app restart.
- Worker consumes `account/login/completed` and `account/updated`; API exposes safe login status without returning profile/token contents.
- On success, persist plan metadata/profile artifact, trigger first quota/activity read, and invalidate the one-time login attempt.
- Handle expired/cancelled login, user denial, process crash, late completion, duplicate polling, and app switching accounts mid-flow.

### 3.5 Rate Limits And Activity

- Call `account/rateLimits/read`; prefer `rateLimitsByLimitId`, fall back to legacy `rateLimits`, and emit every non-null window (`docs/ai-coding-usage-provider-api-guide.md:250-287`).
- Derive labels from actual `windowDurationMins`; preserve limit ID/name, plan type, reached reason, credits, and reset-credit metadata as read-only fields.
- Consume `account/rateLimits/updated` notifications while a process is alive and persist only validated changes.
- Call `account/usage/read` separately; map nullable summary and daily usage buckets without combining token activity with quota percentages (`docs/ai-coding-usage-provider-api-guide.md:289-317`).
- A failure of activity read must not fail a valid quota refresh.

### 3.6 Reset-Credit Consumption (V1)

- Read credit availability from `account/rateLimits/read` and expose it only when the App Server returns reset-credit metadata; never fabricate credit values.
- Consume a credit only after the user explicitly confirms in the mobile UI, explaining what the action does and that it mutates their ChatGPT/Codex allowance (`docs/ai-coding-usage-provider-api-guide.md:319-334`).
- Send `account/rateLimitResetCredit/consume` with a per-logical-attempt `idempotencyKey` so duplicate taps or retries cannot redeem the same credit twice.
- Handle every documented outcome (`reset`, `alreadyRedeemed`, `nothingToReset`, `noCredit`) and surface the result distinctly to the user.
- After a successful consume, immediately refresh `account/rateLimits/read` and persist the updated state; treat the post-consume read as required, not best-effort.
- Rate-limit consume attempts per user/connection, record a dedicated audit event, and gate the route behind the provider mutation feature flag.
- A failed consume must never corrupt the last-known-good usage read model.

### 3.7 Mobile Experience

- Connection privacy copy says ChatGPT authentication is handled by Codex App Server and DevGauge never asks for an email/password.
- Show every dynamic limit group/window, actual duration, consumed/remaining percent, reset, plan, reached reason, freshness, and official-source provenance.
- Show token activity only when returned; null summary values are “Not provided,” and absent activity is not presented as zero.
- Reset-credit availability shows an informational `Use a reset credit` control only when real credit metadata is present, and only from within the provider detail screen with a confirmation sheet; no hidden mutation route ships elsewhere.

### 3.8 Testing And Operations

- Build a fake JSONL App Server harness for deterministic initialize, response ordering, interleaved notifications, malformed lines, crash, timeout, duplicate IDs, late messages, and schema changes.
- Run isolation tests proving two user profiles cannot share paths, locks, decrypted artifacts, logs, or process environment.
- Canary uses a dedicated account under approved terms and exercises account read, quota read, and activity read after every binary upgrade.
- Refresh immediately after connection, on eligible app open, no more often than every 5 minutes during foreground demand, and every 15 minutes in the background; consume validated live update notifications while a process is active.
- Honor provider retry instructions, jitter retries, isolate the activity-read failure budget, and trip a contract/runtime circuit breaker without discarding cached quota.

## 4. Files Touched

- `packages/provider-codex/generated/**` (new, generated from pinned binary)
- `packages/provider-codex/src/process-supervisor.ts` (new)
- `packages/provider-codex/src/jsonl-router.ts` (new)
- `packages/provider-codex/src/profile-artifact.ts` (new)
- `packages/provider-codex/src/login.ts` (new)
- `packages/provider-codex/src/rate-limits.ts` (new)
- `packages/provider-codex/src/activity.ts` (new)
- `packages/provider-codex/src/reset-credit.ts` (new)
- `packages/provider-codex/src/__fixtures__/**` (new)
- `apps/api/src/routes/connections/codex.ts` (new)
- `apps/api/src/routes/codex/reset-credit.ts` (new)
- `apps/connector-worker/src/jobs/codex-login.ts` (new)
- `apps/connector-worker/src/jobs/refresh-codex.ts` (new)
- `apps/connector-worker/src/jobs/codex-consume-reset-credit.ts` (new)
- `apps/mobile/app/connect/codex/**` (new)
- `apps/mobile/src/features/providers/codex/**` (new)
- `docs/runbooks/providers/codex.md` (new)

## 5. Acceptance Criteria And QA Checklist

- [x] Binary is pinned, checksum-verified, schema-generated, SBOM-listed, and canary-tested.
- [x] Device-code login survives app background/termination, supports cancel, and cannot bind to the wrong DevGauge user.
- [x] App Server initialization order, request-ID routing, notification dispatch, malformed JSON, timeout, and process cleanup tests pass.
- [x] Concurrent jobs cannot access, overwrite, log, or infer another user's profile artifact.
- [ ] Profile plaintext is absent after job cleanup and encrypted artifact deletion is verifiable on disconnect/account deletion.
- [ ] Dynamic limit IDs and actual durations survive normalization, persistence, API, and UI without hard-coded primary/secondary assumptions.
- [x] Live rate-limit updates and scheduled reads deduplicate correctly.
- [x] Quota remains available when the separate activity read fails or returns null.
- [x] No ChatGPT password, host-supplied token, internal endpoint, or public App Server socket exists.
- [x] Reset credits are only ever consumed after explicit user confirmation; an idempotency key prevents duplicate redemption; every documented outcome maps to a distinct, correct UI result.
- [x] A successful reset-credit consume immediately triggers a validated quota refresh and the post-consume state is persisted.
- [x] A failed consume never corrupts the last-known-good usage read model; consume attempts are rate-limited and leave a dedicated audit event.
- [x] Reset-credit consumption is disabled by the provider mutation feature flag and kill switch, and these fail closed.
- [ ] Device codes, auth/profile contents, and sensitive process output do not appear in logs, traces, analytics, or crash reports.
- [ ] Kill switch stops new process launches while cached data remains visible with an incident message.
- [ ] Foreground/background cadence, live-update dedupe, jitter, retry instructions, activity isolation, circuit breaker, contract drift, and kill switch pass fake-clock tests.
- [ ] Controlled real-account staging smoke tests pass before beta enablement.

## 6. Open Questions

- What is the acceptable per-connected-user compute/storage cost for Codex profile refreshes?
- How long may an unfinished device-code login worker remain active before forced cancellation?
- What exact copy and confirmation interaction should wrap reset-credit consumption, and how should partial credit redemption be described? (Resolve during Phase 3 design review.)
