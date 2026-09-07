# Phase 7 - Ship OpenAI Codex Connector

Depends on: Phase 4 secret/profile primitives; Phase 6 isolated runtime controls

---

## 1. Goal

Integrate the official Codex App Server protocol through a hardened process supervisor, isolated per-user profiles, device-code onboarding, dynamic rate-limit normalization, live update ingestion, and optional read-only activity summaries. Codex profile contents remain opaque and inaccessible outside the connector boundary.

## 2. Scope

### In Scope

- Pinned Codex binary acquisition, checksum verification, schema generation, and compatibility canary.
- JSONL `stdio` process supervision, initialization, request routing, notifications, timeouts, and cleanup.
- ChatGPT device-code login, status/cancel/logout, per-user profile encryption/isolation, and reconnection.
- Dynamic rate limits, plan, reached reason, returned credit metadata as read-only, usage summaries, daily token buckets, history, and mobile UI.

### Out Of Scope

- API-key-only login for ChatGPT subscription usage.
- Host-supplied experimental ChatGPT tokens.
- Experimental public WebSocket exposure or internal `chatgpt.com/backend-api` endpoints.
- Consuming earned reset credits; V1 remains read-only.

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

### 3.6 Mobile Experience

- Connection privacy copy says ChatGPT authentication is handled by Codex App Server and DevGauge never asks for an email/password.
- Show every dynamic limit group/window, actual duration, consumed/remaining percent, reset, plan, reached reason, freshness, and official-source provenance.
- Show token activity only when returned; null summary values are “Not provided,” and absent activity is not presented as zero.
- Credit availability may be shown as informational metadata; no consume button or hidden mutation route ships.

### 3.7 Testing And Operations

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
- `packages/provider-codex/src/__fixtures__/**` (new)
- `apps/api/src/routes/connections/codex.ts` (new)
- `apps/connector-worker/src/jobs/codex-login.ts` (new)
- `apps/connector-worker/src/jobs/refresh-codex.ts` (new)
- `apps/mobile/app/connect/codex/**` (new)
- `apps/mobile/src/features/providers/codex/**` (new)
- `docs/runbooks/providers/codex.md` (new)

## 5. Acceptance Criteria And QA Checklist

- [ ] Binary is pinned, checksum-verified, schema-generated, SBOM-listed, and canary-tested.
- [ ] Device-code login survives app background/termination, supports cancel, and cannot bind to the wrong DevGauge user.
- [ ] App Server initialization order, request-ID routing, notification dispatch, malformed JSON, timeout, and process cleanup tests pass.
- [ ] Concurrent jobs cannot access, overwrite, log, or infer another user's profile artifact.
- [ ] Profile plaintext is absent after job cleanup and encrypted artifact deletion is verifiable on disconnect/account deletion.
- [ ] Dynamic limit IDs and actual durations survive normalization, persistence, API, and UI without hard-coded primary/secondary assumptions.
- [ ] Live rate-limit updates and scheduled reads deduplicate correctly.
- [ ] Quota remains available when the separate activity read fails or returns null.
- [ ] No ChatGPT password, host-supplied token, internal endpoint, public App Server socket, or reset-credit mutation exists.
- [ ] Device codes, auth/profile contents, and sensitive process output do not appear in logs, traces, analytics, or crash reports.
- [ ] Kill switch stops new process launches while cached data remains visible with an incident message.
- [ ] Foreground/background cadence, live-update dedupe, jitter, retry instructions, activity isolation, circuit breaker, contract drift, and kill switch pass fake-clock tests.
- [ ] Controlled real-account staging smoke tests pass before beta enablement.

## 6. Open Questions

- What is the acceptable per-connected-user compute/storage cost for Codex profile refreshes?
- How long may an unfinished device-code login worker remain active before forced cancellation?
- Which returned credit metadata is useful enough to expose read-only without implying DevGauge can consume it?
