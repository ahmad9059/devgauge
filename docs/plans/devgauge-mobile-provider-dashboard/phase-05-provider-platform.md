# Phase 5 — Build Provider Platform and Refresh Engine

Depends on: Phases 3 and 4

---

## 1. Goal

Implement the provider-independent domain, adapter registry, safe HTTP layer, normalization boundary, refresh state machine, and experimental capability controls used by every connector.

## 2. Scope

### In scope

- Closed registry for exactly five provider IDs.
- Adapter and capability contracts.
- Connection-scoped refresh orchestration.
- HTTPS allowlists, timeout, cancellation, bounded concurrency, backoff, and rate-limit handling.
- Runtime response validation and normalized decimal-string quantities.
- Foreground/manual refresh with cached/stale behavior.
- Signed experimental capability manifest and mock adapter.

### Out of scope

- Real provider OAuth/API implementations.
- Background continuous polling.
- Final dashboard composition.

## 3. Detailed Tasks / Design

1. Implement domain types from `ARCHITECTURE.md` and contracts from `API.md`.
2. Key refresh/disconnect/mutex operations by `connectionId`, not provider ID.
3. Limit global concurrency to two and coalesce duplicate connection refreshes.
4. Validate every response before persistence and fail one adapter independently.
5. Honor `Retry-After`; use jittered backoff only for eligible transient failures.
6. Persist successful data separately from latest failure/attempt state.
7. Verify capability manifest signature, audience, environment, issue/expiry times, monotonic version, and clock skew.
8. Provide deterministic mock adapter fixtures for all UI/E2E states.

## 4. Files Touched

- `src/domain/{providers,usage,errors}.ts` (new)
- `src/providers/{registry,types}.ts` (new)
- `src/services/network/{client,backoff,redaction}.ts` (new)
- `src/features/dashboard/refresh-connection.ts` (new)
- `src/services/capabilities/**` (new)
- provider contract harness, fixtures, and tests (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] Unknown values remain null; no absent limit becomes zero.
- [ ] Decimal quantities round-trip without currency precision loss.
- [ ] One adapter failure cannot block another.
- [ ] Duplicate refreshes coalesce per connection.
- [ ] Malformed, oversized, hostile, and changed-schema responses fail safely.
- [ ] `429` and exact `Retry-After` handling pass tests.
- [ ] Capability tamper/expiry/audience/replay tests pass.
- [ ] Seeded secrets are absent from logs.

## 6. Open Questions

- Capability manifest hosting/signing owner.
- Provider-specific refresh TTL values.
- Whether network reachability should use a dedicated package or request failures only.
