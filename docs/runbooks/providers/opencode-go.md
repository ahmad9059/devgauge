# Runbook — OpenCode Go

## Connection

- Users paste an OpenCode Go API key from OpenCode Zen.
- When mock transport is off (`FEATURE_MOCK_TRANSPORT=false`), the API validates
  the key against `https://opencode.ai/zen/go/v1/usage` **before** storing it.
- The key is sealed with envelope encryption (`credential_envelopes`,
  `credential_type = opencode-go:api_key`) and never returned or logged.

## Usage refresh

- Adapter: `packages/provider-opencode-go` (`fetchOpenCodeGoUsage`).
- Endpoint is allowlisted and single-host; requests use `redirect: "error"`,
  a 10s timeout, and a 1 MiB response cap.
- Windows `rolling` / `weekly` / `monthly` are validated and normalized
  independently; `rate-limited` maps to `limited`; upstream percents are kept in
  diagnostics (display values are clamped).
- Errors: 401 → `provider_unauthorized`, 403 Entitlement → `entitlement_required`,
  429/5xx/network/timeout → retryable `transient_upstream`, malformed 2xx →
  `contract_drift` (preserves last-known-good; bounded backoff).

## Failure modes and recovery

| Symptom | Meaning | Action |
|---|---|---|
| Connect returns `provider_unauthorized` | Bad/rotated key | Ask user to re-paste a fresh key (Settings → Connectors) |
| Connect returns `entitlement_required` | No Go plan | Tell user to subscribe in OpenCode Zen |
| Refresh `contract_failed` | Endpoint shape changed | Check the adapter canary + incident metric; preserve cached data |
| Refresh `transient_failed` | Upstream flake | Retry with backoff; no user action |

## Kill switch

Set `KILLSWITCH_PROVIDER_OPENCODE_GO=true` to stop new refreshes. Cached data
remains visible; the app shows a service notice.

## Verification

- Unit: `pnpm --filter @devgauge/provider-opencode-go test` (fixtures for
  success, over-100, missing fields, 401/403/429/5xx, malformed, timeout).
- Integration (real mode): `TEST_LIVE_PROVIDER=1 DATABASE_URL=... pnpm --filter @devgauge/api test`
  exercises live connect validation. A valid-key smoke requires `OPENCODE_TEST_KEY`.
- Canary: a dedicated non-user OpenCode credential (separate from fixtures)
  should be configured once a test entitlement is available.

## Notes

- The endpoint does not expose wallet balance, exact dollars, plan price,
  identity, or per-model usage — those are never inferred or promised.
