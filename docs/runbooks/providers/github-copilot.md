# Runbook — GitHub Copilot

## Connection (OAuth)

- Flow: `GET /v1/connections/github-copilot/authorize` (authenticated) returns a
  PKCE S256 authorize URL + one-time `state`. The user completes GitHub OAuth in
  a browser; GitHub redirects to `/v1/connections/github-copilot/callback`.
- Callback validates + consumes the in-memory `state`, exchanges the code with
  the **client secret server-side**, verifies the GitHub user identity, stores
  the access (+ optional refresh) token in encrypted envelopes
  (`github-copilot:access` / `github-copilot:refresh`), marks the connection
  connected, and runs a first quota refresh.
- The GitHub client secret never leaves the backend and never appears in any
  response, log, or the authorize URL.
- State is single-use and expires after 10 minutes. Multi-instance deployments
  must move the in-memory state store to Redis.

## Usage refresh

- Adapter: `packages/provider-github-copilot`.
- Normalization preserves **every** runtime quota bucket (`quotaSnapshots` keys
  are dynamic — never allowlisted); known labels are presentation-only.
- `entitlementRequests === -1` → unlimited: no used percent is computed; `limit`
  is exposed as `null` and the UI shows "Unlimited".
- Runtime: `COPILOT_RUNTIME_MODE=sandbox` (fixture, used for CI/integration) or
  `sdk` (requires the pinned `@github/copilot-sdk` + CLI runtime in the worker
  image; wired in Phase 10).

## Failure modes and recovery

| Symptom | Meaning | Action |
|---|---|---|
| Callback `provider_unauthorized` | Bad code / expired state / wrong account | Restart authorize from the app |
| Refresh `contract_drift` | Quota RPC shape changed or SDK runtime missing | Check runtime pin + canary; cached data preserved |
| Token rejected upstream | Expired/revoked token | If expiring tokens are enabled, refresh via the stored refresh token; else mark `reauth_required` |

## Kill switch

Set `KILLSWITCH_PROVIDER_GITHUB_COPILOT=true` to stop new refreshes. Cached data
remains visible.

## Verification

- Unit: `pnpm --filter @devgauge/provider-github-copilot test` (normalization,
  unlimited, unknown buckets, OAuth URL/exchange/error mapping, token canary).
- Integration (real DB, sandbox): `DATABASE_URL=... pnpm --filter @devgauge/api test`
  covers authorize URL (no secret), bad-state rejection, and dynamic-bucket
  quota persistence.
- A real GitHub OAuth app + Copilot-entitled seat are required for the live
  end-to-end canary (Phase 10).
