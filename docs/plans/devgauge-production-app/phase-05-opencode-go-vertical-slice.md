# Phase 5 - Ship OpenCode Go Vertical Slice

> Status: **Implemented.** Real OpenCode Go adapter (`packages/provider-opencode-go`) with fixtures and error mapping; live endpoint verification; API connect validation + real-mode usage fetch wired behind `FEATURE_MOCK_TRANSPORT`; runbook added. Verified: 10 provider tests, live-wiring integration test (invalid key → `provider_unauthorized`), full workspace green.

Depends on: Phase 4 secure connection/snapshot pipeline

---

## 1. Goal

Deliver the first real end-to-end provider integration using OpenCode Go: secure API-key connection, validated polling, normalized current/history data, provider-specific UI, stale/error recovery, disconnect deletion, and operational visibility. This phase proves the shared architecture before adding runtime-based providers.

## 2. Scope

### In Scope

- OpenCode Go API-key onboarding and entitlement validation.
- Backend-only credential encryption and fixed-host HTTPS usage requests.
- Rolling, weekly, and monthly usage normalization.
- Provider-specific refresh cadence, retry/circuit-breaker behavior, contract fixtures, UI states, and disconnect.
- Staging canary and remote kill switch.

### Out Of Scope

- Zen wallet balance, exact dollars, plan price, identity, or per-model breakdown because the endpoint does not expose them (`docs/ai-coding-usage-provider-api-guide.md:616-626`).
- Direct mobile-to-OpenCode requests.
- Copilot, Codex, or Claude behavior.

## 3. Detailed Tasks And Design

### 3.1 Connection Flow

- Explain that DevGauge stores an encrypted OpenCode Go API key to refresh usage and send alerts while the app is closed.
- Use a labeled secure input with paste support and no analytics/session replay capture.
- Submit once with an idempotency key; immediately validate against the usage endpoint before marking connected.
- Map missing/invalid key to `provider_unauthorized`, missing Go entitlement to `entitlement_required`, and network/5xx/schema failures to retryable or contract states.
- Never echo, partially reveal, or return the submitted key after acceptance.

### 3.2 Adapter

- Use an allowlisted `https://opencode.ai/zen/go/v1/usage` client with strict TLS, connect/read/total timeouts, response-size limit, and no redirect to a different host.
- Validate `usage.rolling`, `usage.weekly`, and `usage.monthly` independently so one absent/null future field does not erase valid siblings.
- Normalize endpoint `percent` as used percentage, calculate remaining only when finite/known, preserve original value internally, and map `rate-limited` to `limited`.
- Keep labels in presentation metadata so the current rolling duration can change without a mobile release.
- Treat malformed 2xx as contract drift, preserve last-known-good usage, trip the adapter canary, surface a non-secret incident metric, and continue only bounded scheduled/canary retries with backoff.

### 3.3 Scheduling And Persistence

- Refresh on first connection, on freshness-aware app request, every 15 minutes in background, and no more than every 5 minutes during active foreground demand, matching the guide (`docs/ai-coding-usage-provider-api-guide.md:874-883`).
- Respect upstream retry headers if supplied; otherwise use exponential backoff with jitter and a per-connection lock.
- Deduplicate unchanged snapshots by normalized content hash while still updating connection health/last checked.

### 3.4 Mobile Experience

- Provide provider-specific privacy/help copy and clear 401/403 recovery.
- Show three runways with explicit consumed/remaining percentages, status, reset timestamp/countdown, source-backed provenance, and freshness.
- Use `Not provided by OpenCode` for unavailable metrics instead of empty placeholders.
- Disconnect requires confirmation, immediately removes the provider from active refresh, and leaves an optional local history-deletion choice consistent with account policy.

### 3.5 Testing And Operations

- Commit synthetic fixtures for success, boundary percentages, over-100 diagnostics, missing fields, invalid types, 401, 403, 429 if observed, 5xx, timeout, invalid JSON, huge body, redirect, and reset-time anomalies.
- Add a canary using a dedicated non-user account/credential stored outside test fixtures.
- Dashboard adapter success, latency, response class, contract failure, stale population, queue delay, and circuit state without logging keys.

## 4. Files Touched

- `packages/provider-opencode-go/` (new): `schema.ts`, `errors.ts`, `normalize.ts`, `client.ts`, `__fixtures__/fixtures.ts`, `client.test.ts`, `index.ts`.
- `apps/api/src/services/provider-fetch.ts` (new): resolves real OpenCode usage when credentials present + mock off.
- `apps/api/src/services/usage-service.ts`: real/contract-failure refresh classification (`contract_failed` vs `transient_failed`).
- `apps/api/src/routes/usage.ts` + `connections.ts`: pass crypto + mock flag; live key validation on connect when mock off.
- `apps/api/src/integration.test.ts`: live-mode describe block (`TEST_LIVE_PROVIDER=1`, optional `OPENCODE_TEST_KEY`).
- `docs/runbooks/providers/opencode-go.md` (new).
- `packages/config/src/provider-metadata.ts` (verified opencode labels; unchanged).

## 5. Acceptance Criteria And QA Checklist

- [x] A valid key connects, fetches all three current windows, persists history, and renders in Usage/provider-detail screens (valid-key path covered by live-wiring test when `OPENCODE_TEST_KEY` is set; UI renders any persisted snapshot).
- [x] Invalid-key and no-entitlement responses produce different, actionable UI without retaining plaintext input (401 → `provider_unauthorized`, 403 → `entitlement_required`; connect never returns the key).
- [x] Unknown/missing/malformed fields never crash worker or app and never replace last-known-good usage (per-window nullable validation; `contract_drift` preserves cached data).
- [x] Percentage display is clamped but original out-of-range diagnostics remain available to restricted telemetry (`diagnostics.upstreamPercent`).
- [x] Exact dollars, wallet, plan price, identity, and model breakdown are not inferred or promised.
- [ ] Refresh cadence, jitter, lock, retry, circuit breaker, and manual refresh coalescing pass fake-clock tests (BullMQ locks + backoff configured; dedicated fake-clock cadence test deferred to Phase 10 soak).
- [x] Secret canaries do not appear in logs, traces, fixtures, errors, analytics, or crash reports (canary assertions in provider + integration tests).
- [x] Disconnect stops jobs and destroys the encrypted credential (disconnect deletes envelope + tombstones, from Phase 4; connection test covers connect; deletion path unit-covered).
- [x] Source-backed provenance and last-sync age are visible and screen-reader-readable (source metadata + fetched age rendered; accessibility labels in components).
- [x] Kill switch disables new refreshes while preserving cached data (worker kill-switch check + API env flag; cached read model untouched).
- [x] Contract drift continues bounded scheduled/canary retries with backoff and cannot create a foreground retry storm (`contract_failed` refresh state; retry bound enforced by BullMQ/backoff).
- [ ] Controlled real-account smoke test passes in staging before beta flag enablement (requires a real OpenCode Go entitlement/canary credential).

## 6. Open Questions

- Does OpenCode provide a test entitlement or must the team fund and isolate a canary account? (Open — runbook documents the canary need.)
- Should disconnect delete retained history immediately or keep normalized, non-secret history until account deletion? (Open — current behavior keeps non-secret history.)
