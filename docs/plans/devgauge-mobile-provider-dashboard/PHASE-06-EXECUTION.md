# Phase 6 Execution Evidence — GitHub Copilot Connector

> Status: **Connector implemented and fully tested as release-disabled infrastructure. Live enablement is blocked on the Phase 1 Android website-session matrix and the GitHub App permission spike.** Evidence date: 2026-09-28.

## Product gate (unchanged)

The owner requested an embedded GitHub website session. Phase 1's signed-in Android checks remain **not tested**, and no real GitHub App token has been proven against the billing endpoints. Per the plan, the connector therefore stays **candidate-disabled** and makes no network call. This is the permitted outcome ("otherwise the connector remains release-disabled"), not a shortcut.

## Implemented

- Auth decision: `src/providers/github-copilot/auth.ts` selects **GitHub App user-to-server device flow** (client id only, so no confidential exchange / no broker); the website-session path is returned only when the Phase 1 gate is explicitly passed. See `docs/decisions/0004-github-auth-flow.md`.
- Auth primitives: `src/services/auth/pkce.ts` (RFC 7636 S256, base64url without Buffer), `oauth-transaction.ts` (in-memory single-use TTL store binding state, PKCE verifier, provider, and exact redirect; atomic consume), and `device-flow.ts` (device authorization parsing, poll classification, `slow_down` backoff).
- Connector: `src/providers/github-copilot/{client,schema,normalize,adapter}.ts` — allowlisted `api.github.com` endpoints, required API version/User-Agent headers, tolerant-but-anchored Zod schema (`usageItems` required), decimal summation, and personal/organization normalization that never merges scopes or fabricates caps.
- Release gate: the refresh engine now skips any connector whose descriptor has `capabilities.liveUsage === false` and records a `capability_disabled` attempt without a network call (`src/features/dashboard/refresh-connection.ts`).
- Presentation: `src/features/connections/github/view.ts` returns the release-disabled card, distinct personal/organization options, minimum-permission consent copy, and unsupported managed-account guidance.
- Fixtures: `src/providers/github-copilot/fixtures.ts` (sanitized; no tokens or identifiers).

## Verified locally

- `npm run check` passes: TypeScript, ESLint, **211** unit checks across 42 files, and three build-profile config checks.
- Phase 6 adds **38 tests**: PKCE RFC vector and base64url, oauth transaction create/replay/state/redirect/expiry/unknown, device-flow parsing + poll classification + slow-down backoff, GitHub URL/header building and header redaction, normalization (scope separation, decimal sums, currency unit, empty-usage-is-unknown), adapter success and 401/403/404/changed-schema/credential failure modes, the release-disabled engine gate (zero network calls), disconnect clearing the credential, and the connection view copy.

## Acceptance criteria status

- [ ] Real test proves every enabled endpoint and minimum permission. **Blocked** — no live GitHub App token/permission spike yet; the connector remains release-disabled.
- [x] Any enabled website-session path demonstrates persistence/usage/cookie containment/logout. **Not applicable** — that path is not enabled.
- [x] Personal and organization scopes are never conflated.
- [x] PKCE, state mismatch, callback mismatch, expiry, and replay tests pass.
- [x] Broker requirements. **No broker is used** (device flow); the conditional broker controls are therefore not applicable.
- [x] Unknown cap renders as unknown, not zero/unlimited.
- [x] Disconnect always clears local credentials; remote revocation is declared and runs once a live token exists.
- [x] Failed feasibility leaves a clear release-disabled card.

## Out of scope (unchanged)

Repository/code permissions, fabricated entitlement caps, and other providers.

## Open questions carried forward

- Exact GitHub App account permission accepted by the billing endpoints (Phase 6 spike, owner/test-app dependent).
- Whether target personal plans expose an entitlement cap or consumption only.
- Phase 1 Android website-session results for GitHub.
