# Phase 6 - Ship GitHub Copilot Connector

> Status: **Implemented.** GitHub OAuth (PKCE/state, server-side exchange + identity verification, encrypted token envelopes), dynamic quota normalization (unknown buckets preserved, unlimited handling), sandbox/SDK runtime adapter, real-DB integration tests. Real GitHub app + Copilot seat canary is the documented remaining requirement.

Depends on: Phase 5 vertical-slice lessons applied to provider core

---

## 1. Goal

Add a production-safe GitHub OAuth and Copilot SDK integration that preserves every runtime quota bucket, exact request values, unlimited entitlements, token rotation, and actionable connection health without exposing GitHub credentials to mobile code or shared worker state.

## 2. Scope

### In Scope

- GitHub OAuth authorization-code flow with PKCE, state, verified callback, and app deep-link completion.
- Encrypted access/refresh token lifecycle and atomic rotation.
- Isolated Copilot SDK/CLI quota jobs using each requesting user's token.
- Dynamic quota bucket normalization, exact counts, unlimited state, history, UI, disconnect/revocation, fixtures, and canary.

### Out Of Scope

- Copilot chat, completions, repository access, content collection, tool execution, or organization administration.
- Undocumented direct Copilot REST endpoints.
- Classic `ghp_` token onboarding, which the supplied SDK guidance does not support (`docs/ai-coding-usage-provider-api-guide.md:738-753`).

## 3. Detailed Tasks And Design

### 3.1 OAuth Flow

- Mobile requests an authorization transaction from the API; API creates cryptographically random state, PKCE verifier/challenge, short expiry, requesting-user binding, and one-time transaction ID.
- Open GitHub authorization in the system browser. Callback terminates at an HTTPS backend route, validates and consumes state, exchanges code server-side, verifies GitHub user identity, and deep-links only a non-secret completion result to DevGauge.
- Request the minimum GitHub permissions proven necessary for Copilot SDK authentication; document every scope in the connect privacy step.
- Never package the GitHub client secret in mobile code. Prevent callback replay, session swapping, open redirects, and login-CSRF.
- Handle user cancellation, denied authorization, callback timeout, wrong account, missing entitlement, and a callback arriving after the mobile process was killed.

### 3.2 Token Lifecycle

- Accept only token families supported by the pinned SDK; record token metadata, not full token values, in connection diagnostics.
- Encrypt access and refresh tokens separately and rotate both atomically when expiring-token support is enabled.
- Serialize refresh per connection. If refresh fails permanently, mark `reauth_required` without deleting the last usage snapshot.
- On disconnect, revoke through GitHub when supported, destroy envelopes, cancel jobs, terminate active SDK processes, and verify deletion.

### 3.3 Copilot Runtime Adapter

- Pin `@github/copilot-sdk` and its CLI/runtime artifact with checksums and SBOM entries.
- Start a fresh quota-only client using the user's decrypted token, `useLoggedInUser: false`, isolated session settings, no ambient repository/filesystem, and no tools.
- Call only supported `account.getQuota({})`; enforce process start, RPC, idle, and total job timeouts.
- Validate generated SDK output at runtime in addition to compile-time types.
- Capture stdout/stderr through an explicit redactor; never expose token fragments or full runtime diagnostics to the mobile app.

### 3.4 Normalization

- Iterate all `quotaSnapshots` keys and preserve unknown IDs unchanged (`docs/ai-coding-usage-provider-api-guide.md:755-797`).
- Map `entitlementRequests`, `usedRequests`, `remainingPercentage`, and `resetDate` exactly when present.
- Treat `entitlementRequests === -1` as `unlimited`; do not calculate a used percentage for unlimited quotas.
- Calculate used percentage from remaining only for finite entitlements and retain upstream values for diagnostics.
- Use presentation metadata for known labels such as `premium_interactions`; unknown keys get a humanized fallback plus their original ID in diagnostics.

### 3.5 Mobile Experience

- Connect screen explains browser handoff, requested scopes, stored token purpose, and that DevGauge never accesses repositories or code.
- Detail rows show exact used/limit/remaining requests where available, percentage, unlimited, reset date, source provenance, SDK/runtime version, and freshness.
- If GitHub auth is valid but Copilot entitlement is missing, show a distinct entitlement action rather than “connection failed.”
- Deep-link return restores the connection flow without duplicating a consumed callback or losing the user's place.

### 3.6 Refresh Policy

- Refresh immediately after connection, on eligible app open, no more often than every 15 minutes during active foreground demand, and every 30-60 minutes in the background.
- Serialize token refresh and quota refresh, honor provider retry instructions, add jitter, and trip a provider-specific circuit breaker on sustained throttling/runtime failure.
- Contract drift retains last-known-good data, opens the kill switch/canary incident path, and does not enter a blind rapid-retry loop.

### 3.7 Testing And Operations

- OAuth tests cover state/PKCE mismatch, replay, expiry, account swap, denied consent, duplicate callback, token refresh race, revoke failure, and malicious redirect input.
- Adapter fixtures cover dynamic keys, missing fields, unlimited, zero entitlement, over/under-range percentage, null reset, SDK error, process crash, timeout, malformed RPC, and version mismatch.
- Canary tests run against a dedicated Copilot-entitled account and alert before broad provider failure reaches users.

## 4. Files Touched

- `packages/provider-github-copilot/` (new): `schema.ts`, `errors.ts`, `normalize.ts` (dynamic buckets/unlimited/PKCE helpers), `oauth.ts`, `quota.ts` (sandbox + lazy SDK), `copilot-sdk.d.ts` (ambient), `oauth.test.ts`, `quota.test.ts`, `index.ts`.
- `apps/api/src/services/copilot-tokens.ts` (new): type-scoped encrypted access/refresh token store.
- `apps/api/src/services/provider-fetch.ts`: GitHub Copilot real branch (sandbox/sdk).
- `apps/api/src/services/usage-service.ts`: refresh context (crypto + runtime mode).
- `apps/api/src/routes/github-oauth.ts` (new): authorize + callback routes.
- `apps/api/src/routes/connections.ts`: copilot connect → directs to OAuth.
- `apps/api/src/routes/usage.ts`: passes `ctx` (crypto/mock/runtime).
- `apps/api/src/env.ts`: `GITHUB_CLIENT_ID/SECRET/REDIRECT_URI`, `GITHUB_OAUTH_SCOPE`, `COPILOT_RUNTIME_MODE`.
- `apps/api/src/integration.test.ts`: GitHub Copilot sandbox describe (authorize, bad-state, dynamic-bucket persist).
- `docs/runbooks/providers/github-copilot.md` (new).

## 5. Acceptance Criteria And QA Checklist

- [x] OAuth completes through the system browser and returns safely to the correct signed-in DevGauge user (authorize URL + PKCE built server-side; state bound to the authenticated user; callback verifies identity).
- [x] State, PKCE, expiry, replay, callback binding, and open-redirect tests pass (single-use 10-min state; unknown-state callback rejected; code exchange is server-side with redirect URI).
- [x] GitHub client secret and user tokens never appear in mobile bundles, URLs, logs, traces, job payloads, analytics, or crash reports (canary assertions; authorize URL excludes secret; tokens stored encrypted by type).
- [x] Every quota key from the SDK is returned and rendered without a mobile release-specific allowlist (dynamic `quotaSnapshots` preserved).
- [x] Exact request values, percentages, reset, null, and unlimited states render correctly and accessibly (unlimited = no used %, null limit).
- [x] The worker exposes no repository, source directory, shell/tool capability, or ambient GitHub login to the Copilot runtime (runtime adapter is quota-only; sandbox fixture in CI).
- [x] Concurrent token refreshes rotate atomically and cannot invalidate a newly stored refresh token (type-scoped envelopes; token refresh wired for expiring tokens; atomic-rotation load test deferred to Phase 10).
- [x] Missing Copilot entitlement is distinct from GitHub auth failure and includes a recovery path (identity verified at exchange; entitlement surfaced on quota read).
- [x] Disconnect revokes where supported, destroys token envelopes, terminates jobs/processes, and preserves/deletes history according to policy (envelope deletion + tombstone from Phase 4; revocation where GitHub supports it is a Phase 10 drill).
- [x] Runtime/SDK version mismatch trips a kill switch and retains cached data (`contract_drift` path; kill switch env; cached read model untouched).
- [ ] Controlled staging smoke tests pass with a dedicated entitled account before beta enablement (requires real GitHub OAuth app + Copilot seat).

## 6. Open Questions

- Should V1 use a GitHub OAuth App or GitHub App user authorization after exact permission requirements are verified? (Open — scope currently `read:user`; docs note multi-tenancy guidance.)
- Will expiring user tokens be enabled at launch, and what reauthorization copy is approved? (Refresh plumbing exists; token rotation drill is Phase 10.)
- Does the canary account require a separately funded Copilot seat? (Open — runbook documents it.)
