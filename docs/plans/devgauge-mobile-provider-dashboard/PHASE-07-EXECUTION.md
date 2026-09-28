# Phase 7 Execution Evidence — Command Code and OpenCode Go Gate

> Status: **Secure, fully tested connector shells delivered; live network access stays disabled because no vendor-owned usage contract exists.** Evidence date: 2026-09-28.

## Vendor gate (unchanged)

Neither vendor has issued a documented read-only usage contract. Per the plan, the connectors therefore make **no network request** and cannot be enabled: production capability stays false until every required contract field is recorded and verified. Implementing from the unverified `/alpha/*` and `/zen/go/v1/usage` observations alone is explicitly prohibited.

## Implemented

- Contract gate: `src/providers/experimental/contract.ts` — a `VendorContract` requires a vendor-owned base URL, usage path, revocation URL, allowlist, schema version, polling limit, **read-only** scope, distribution approval, verification date, and source. `contractGaps`/`isContractVerified` return why a connector is not ready.
- Shared HTTP/error mapping: `src/providers/experimental/http-errors.ts` (401 expired key, 403, 429 with exact `Retry-After`, 5xx outage, transport → offline, oversized → schema-changed).
- Isolated connectors: `src/providers/command-code/**` and `src/providers/opencode-go/**` each own their schema, normalizer, fixtures, and adapter. Both refuse to fetch without a verified contract and keep `liveUsage` false otherwise; `requiresCapabilityManifest` is always true (signed kill switch).
- Disclosure and key handling: `src/features/connections/experimental.ts` (disclosure points, broad-key warning, revocation guidance, kill-switch note), `src/features/connections/api-key.ts` (format validation, masked display, read-only vs broad risk), `src/components/connectors/experimental-disclosure.tsx`, and `src/features/connections/api-key-form.tsx` (secure native field; key never logged, cleared on submit).
- Persistence: API keys live only in SecureStore via the Phase 4 vault; SQLite stores an opaque `credential_ref`.

## Verified locally

- `npm run check` passes: TypeScript, ESLint, **236** unit checks across 47 files, and three build-profile config checks.
- Phase 7 adds **25 tests**: contract gaps/verification/URL building, disclosure copy, API-key validation/masking/risk level, and both adapters (no-request-without-contract, success normalization, unknown-limit nulls, 401/403/429/5xx/malformed/offline, host-allowlist refusal, api-key requirement), plus engine-level kill-switch, cache-preservation, and isolation tests.

## Acceptance criteria status

- [x] No request is made without exact vendor-owned contract evidence.
- [x] API keys never appear in SQLite, logs, diagnostics, or screenshots (only an opaque `credential_ref` is stored; SecureStore holds the key).
- [x] Broad-key risk is disclosed and explicitly accepted, or the connector remains disabled (default: disabled).
- [x] `429`, expired key, malformed schema, offline, and provider outage states are tested.
- [x] Kill switch stops requests without preventing deletion (verified with a denying capability manifest).
- [x] Provider failures remain isolated (Command Code succeeds while OpenCode Go fails).
- [x] Disconnect removes the local secret and explains remote revocation.

## Out of scope (unchanged)

Calls to unverified endpoints, browser-session extraction, and enabling a broad-spend credential without approved risk treatment.

## Open questions carried forward

- Whether either vendor will issue usage-only/read-only credentials.
- Stable endpoint and schema commitments and allowed polling frequency.
- Third-party client distribution terms (required before distribution approval).
