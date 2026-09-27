# Phase 5 Execution Evidence — Provider Platform and Refresh Engine

> Status: **Implemented and locally verified; no real provider is enabled and no production network call exists.** Evidence date: 2026-09-28.

## Implemented

- Domain: `src/domain/decimal.ts` (canonical non-negative decimal-string arithmetic via BigInt), `src/domain/usage.ts` (`UsageWindow`/`UsageSnapshot`/`AccountIdentity` and `deriveWindow`), `src/domain/errors.ts` (`ProviderError` with codes, `Retry-After`, safe detail, HTTP status), and the canonical `ProviderId` registry in `src/domain/providers.ts`.
- Registry: `src/providers/registry.ts` closes exactly six providers, gives each a capability descriptor (support tier, auth modes, hosts, minimum refresh interval, manifest requirement), and resolves a registered adapter as authoritative for runtime capabilities.
- Contracts: `src/providers/types.ts` (`ProviderAdapter`, `ProviderDescriptor`, `FetchUsageContext`, `NormalizedUsageResult`, `ProviderCredential`, `SupportTier`).
- HTTP policy: `src/services/network/client.ts` (HTTPS-only, host allowlist, no redirects, connect/total timeout, external cancellation, size cap), `backoff.ts` (exponential jittered backoff + exact `Retry-After` parsing), `redaction.ts` (shared redaction), and `logger.ts` (redacting logger).
- Capability manifest: `src/services/capabilities/{ed25519,manifest}.ts` (Ed25519 via `@noble/ed25519`, canonical JSON signing payload, audience/environment/issue/expiry/clock-skew/monotonic-version checks, `isProviderEnabled`, `createCapabilityGate`).
- Refresh engine: `src/features/dashboard/refresh-connection.ts` — per-connection mutex with coalescing, global concurrency of two, trigger-aware policy (`nextAllowedRefreshAt`), credential loading from the vault, atomic persistence through Phase 4 `saveRefresh`, and independent per-adapter failure handling. `lifecycle.ts` maps foreground transitions and cache staleness.
- Contract harness: `src/providers/mock/**` — a deterministic adapter that exercises the real HTTP policy, Zod schema validation (`schema.ts`), normalization (`normalize.ts`), and sanitized fixtures (`fixtures.ts`).

## Verified locally

- `npm run check` passes: TypeScript, ESLint, **173** unit checks across 33 files, and three build-profile config checks.
- Phase 5 adds **62 tests**: decimal arithmetic and round-tripping, window derivation/null semantics, HTTP policy (allowlist, redirects, size cap, timeout, cancellation), backoff/Retry-After, redaction and the redacting logger, mock-adapter normalization and failure modes, registry invariants, capability verification (tamper/audience/environment/skew/expiry/replay), and the refresh engine (success, null preservation, coalescing, concurrency, isolation, rate-limiting, backoff, cancellation, capability gating, no-adapter skip).
- New dependencies: `zod` (runtime validation) and `@noble/ed25519` + `@noble/hashes` (pure-JS signatures, Hermes-compatible). `npx expo install --check` remains green.

## Acceptance criteria status

- [x] Unknown values remain null; no absent limit becomes zero.
- [x] Decimal quantities round-trip without currency precision loss (`0.1 + 0.2 = 0.3`, `9007199254740993` preserved, `18.50 → 18.5`).
- [x] One adapter failure cannot block another (`refreshMany` isolates failures).
- [x] Duplicate refreshes coalesce per connection.
- [x] Malformed, oversized, hostile, and changed-schema responses fail safely.
- [x] `429` and exact `Retry-After` handling pass tests.
- [x] Capability tamper/expiry/audience/replay tests pass.
- [x] Seeded secrets are absent from logs.

## Out of scope (unchanged)

Real provider OAuth/API implementations, background continuous polling, and final dashboard composition. The engine is not yet wired to the UI; the mock adapter stands in for connectors until Phases 6–8.

## Open questions resolved / carried forward

- **Resolved:** network awareness is request-failure driven (an `offline` transport error plus backoff) rather than a dedicated reachability package; see `lifecycle.ts`.
- Capability manifest hosting/signing owner and production key still to be assigned (Phase 10).
- Provider-specific refresh TTLs remain per-descriptor placeholders until vendor contracts exist.
