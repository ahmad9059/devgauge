# Phase 5 - Ship OpenCode Go Vertical Slice

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

- `packages/provider-opencode-go/src/client.ts` (new)
- `packages/provider-opencode-go/src/schema.ts` (new)
- `packages/provider-opencode-go/src/normalize.ts` (new)
- `packages/provider-opencode-go/src/errors.ts` (new)
- `packages/provider-opencode-go/src/__fixtures__/**` (new)
- `packages/provider-opencode-go/src/*.test.ts` (new)
- `apps/api/src/routes/connections/opencode-go.ts` (new)
- `apps/connector-worker/src/jobs/refresh-opencode-go.ts` (new)
- `apps/mobile/app/connect/opencode-go/**` (new)
- `apps/mobile/src/features/providers/opencode-go/**` (new)
- `packages/config/src/provider-metadata.ts`
- `docs/runbooks/providers/opencode-go.md` (new)

## 5. Acceptance Criteria And QA Checklist

- [ ] A valid key connects, fetches all three current windows, persists history, and renders in Usage/provider-detail screens.
- [ ] Invalid-key and no-entitlement responses produce different, actionable UI without retaining plaintext input.
- [ ] Unknown/missing/malformed fields never crash worker or app and never replace last-known-good usage.
- [ ] Percentage display is clamped but original out-of-range diagnostics remain available to restricted telemetry.
- [ ] Exact dollars, wallet, plan price, identity, and model breakdown are not inferred or promised.
- [ ] Refresh cadence, jitter, lock, retry, circuit breaker, and manual refresh coalescing pass fake-clock tests.
- [ ] Secret canaries do not appear in logs, traces, fixtures, errors, analytics, or crash reports.
- [ ] Disconnect stops jobs and destroys the encrypted credential; a deletion verification test passes.
- [ ] Source-backed provenance and last-sync age are visible and screen-reader-readable.
- [ ] Kill switch disables new refreshes while preserving cached data and presenting a service notice.
- [ ] Contract drift continues bounded scheduled/canary retries with backoff and cannot create a foreground retry storm.
- [ ] Controlled real-account smoke test passes in staging before beta flag enablement.

## 6. Open Questions

- Does OpenCode provide a test entitlement or must the team fund and isolate a canary account?
- Should disconnect delete retained history immediately or keep normalized, non-secret history until account deletion?
