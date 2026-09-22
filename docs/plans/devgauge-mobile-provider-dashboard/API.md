# DevGauge Provider and Broker API Plan

> At the validated starting point, no API client or backend existed (`README.md:1`), and this planning pass adds documentation only. All contracts below are proposed and must be validated against provider sandbox/partner access before implementation.

## 1. API Design Rules

1. Use only documented public endpoints unless a connector is explicitly Experimental and vendor permission is recorded.
2. Never scrape provider HTML or replay captured browser sessions.
3. Preserve provider-native semantics and map missing fields to null.
4. Validate every external response at runtime.
5. Keep provider credentials out of URLs, SQLite, logs, analytics, crash reports, and notification payloads.
6. Respect provider rate limits and `Retry-After`.
7. Isolate endpoint paths and parsers in provider modules so schema changes are contained.

## 2. Normalized Internal Contract

```ts
interface FetchUsageContext {
  connection: ProviderConnection;
  credential: ProviderCredential;
  now: Date;
  signal: AbortSignal;
}

interface NormalizedUsageResult {
  identity?: AccountIdentity;
  fetchedAt: string;
  schemaVersion: number;
  isPartial: boolean;
  windows: UsageWindow[];
  safeRequestId?: string;
}

interface AccountIdentity {
  externalId: string | null;
  displayName: string | null;
  accountHint: string | null;
  scope: 'personal' | 'organization' | 'workspace';
}
```

Normalizer invariants:

- Usage quantities are canonical non-negative decimal strings. `used === null` means the provider did not supply consumption and no safe derivation exists.
- `limit === null` means unavailable, not unlimited.
- `remaining` is derived only when units match and limit is known.
- `utilization` is derived only when a positive limit is known.
- Reset times include source and timezone semantics.
- Provider labels remain recognizable in the UI.

## 3. Provider Contracts

### 3.1 Claude

**Status:** blocked for automatic consumer-plan synchronization.

Validated facts:

- Claude Code supports first-party browser login and a `/usage` view.
- Anthropic Admin Usage/Cost APIs are for API organizations and unavailable to individual consumer accounts.
- Claude Code long-lived setup tokens are documented for model requests, not third-party consumer quota access.

V1 adapter behavior:

- `authModes = ['manual']`.
- `liveUsage = false`.
- Open official Claude usage/help surfaces through system browser.
- Let user create a local reset reminder with explicit `manual` source.
- Do not accept subscription OAuth tokens or credential files.

Future activation requirements:

- Anthropic-issued DevGauge client registration.
- Documented native redirect and PKCE support.
- Usage scope and consumer quota endpoint.
- Polling, retention, and revocation contract.

Sources:

- [Claude Code authentication](https://code.claude.com/docs/en/authentication)
- [Claude Code commands](https://code.claude.com/docs/en/commands)
- [Anthropic Usage and Cost API](https://platform.claude.com/docs/en/manage-claude/usage-cost-api)

### 3.2 OpenAI Codex

**Status:** blocked for automatic consumer-plan synchronization.

Validated facts:

- OpenAI documents ChatGPT sign-in for first-party Codex clients.
- Current consumer limits/reset times are visible in the first-party usage dashboard and CLI `/status`.
- No public third-party API for consumer quota or reset redemption is documented.
- API rate-limit headers are a separate API organization concept.

V1 adapter behavior:

- `authModes = ['manual']`.
- `liveUsage = false`.
- `openFirstPartyUsage()` opens `https://chatgpt.com/codex/settings/usage`.
- User may store a manual reset time and schedule a local notification.
- UI action is `View usage and resets`, never `Reset quota`.

Future reset capability interface:

```ts
interface ResetCapability {
  inventory: number;
  eligible: boolean;
  redeem(): Promise<{ windows: UsageWindow[] }>;
}
```

This interface remains unimplemented until OpenAI publishes and authorizes the operation.

Sources:

- [Codex authentication](https://developers.openai.com/codex/auth)
- [Codex pricing and usage limits](https://developers.openai.com/codex/pricing)
- [Codex usage dashboard](https://chatgpt.com/codex/settings/usage)

### 3.3 Command Code

**Status:** experimental pending vendor contract.

Candidate auth:

- User-generated API key entered through native secure form.
- System-browser handoff to official key management.
- No Command Code web-session extraction.

Candidate endpoints reported by implementation-oriented research, but **not verified by the cited public product documentation**:

```text
GET /alpha/whoami
GET /alpha/usage/summary?orgId={orgId}&since={timestamp}
GET /alpha/billing/credits?orgId={orgId}
GET /alpha/billing/subscriptions?orgId={orgId}&limit=1
```

These observations are unverified and must not be implemented from this plan alone. They are private/alpha and cannot be considered a stable public API. Before implementation, obtain vendor documentation or an exact vendor-owned source for base URL, token scopes, schema, polling, and revocation; until then network enablement remains blocked.

Expected normalized windows:

- Five-hour rolling window.
- Weekly window.
- Plan/credit period where returned.

Controls:

- Capability manifest defaults connector off in production until approved.
- Parser fixtures pin every accepted schema.
- Unknown/missing fields produce partial result, not fabricated limits.
- Schema validation failure disables refresh and preserves cache.

Source: [Command Code pricing and limits](https://commandcode.ai/docs/resources/pricing-limits)

### 3.4 OpenCode Go

**Status:** experimental pending usage-endpoint confirmation.

Official connection model:

- User signs into OpenCode Zen, subscribes, creates an API key, and pastes the key into a client.

Documented product limits:

- Five-hour: 20% of model monthly allowance.
- Weekly: 50%.
- Monthly: 100%.

Candidate current-usage request reported by repository implementation research, but **not documented on the cited public Go page as a supported account API**:

```http
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <api-key>
User-Agent: devgauge/<version>
```

Treat this route as an unverified observation, not an implementation contract. The product documentation describes console tracking but does not present this usage route as a stable public API. Obtain an exact vendor-owned source and written confirmation before implementation or production enablement.

Documented endpoints such as `/zen/go/v1/models` are not substitutes for account consumption.

Normalization:

- Preserve model-specific allowance where the API returns per-model rows.
- Do not collapse different model caps into one misleading global percentage unless provider explicitly supplies one.
- Weekly reset derivation is allowed only if current official rules define it and response lacks a timestamp; mark `derivation = documented-rule`.

Source: [OpenCode Go documentation](https://opencode.ai/docs/go/)

### 3.5 GitHub Copilot

**Status:** candidate supported and release-disabled until a Phase 6 spike proves that a GitHub App user token can call the required billing endpoint with an approved minimum permission set.

Candidate endpoints:

```text
GET /users/{username}/settings/billing/ai_credit/usage
GET /users/{username}/settings/billing/premium_request/usage
GET /organizations/{org}/settings/billing/ai_credit/usage
GET /organizations/{org}/settings/billing/premium_request/usage
```

Requirements:

- User endpoint applies to personally purchased Copilot plans.
- Organization-managed billing requires organization endpoint and administrator access.
- Determine and request the minimum GitHub App account permission accepted by the endpoint; do not assume an OAuth scope name.
- Use GitHub's current required API version header pinned and tested.
- Organization access is a separate explicit connection choice.

Normalization:

- Window kind is `billing` or `monthly` only when response time period supports it.
- Unit comes from `unitType`; do not convert billing amount into requests.
- If response reports consumption without entitlement cap, show used amount and `limit = null`.

Sources:

- [GitHub billing usage REST API](https://docs.github.com/en/rest/billing/usage)
- [GitHub App user authorization](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user)

## 4. OAuth Broker API

Use only when provider requirements make direct public-client exchange impossible.

### `POST /v1/oauth/github/transactions`

Creates a five-minute auth transaction. The app sends provider, exact callback URI, PKCE challenge, and a locally generated state. The broker returns a signed transaction ID after storing only hashes and binding data in a TTL replay store. The authorization request uses that same state and transaction.

### `POST /v1/oauth/github/exchange`

Request:

```json
{
  "code": "single-use-code",
  "codeVerifier": "pkce-verifier",
  "state": "transaction-state",
  "redirectUri": "https://auth.devgauge.app/callback/github",
  "transactionId": "uuid"
}
```

Response:

```json
{
  "accessToken": "token",
  "refreshToken": "token-or-null",
  "expiresAt": "2026-09-21T12:00:00.000Z",
  "grantedPermissions": ["provider-defined-minimum"]
}
```

Rules:

- Exact allowlisted redirect URI.
- Transaction must exist, be unexpired/unconsumed, and match provider, exact redirect URI, state hash, and the PKCE challenge derived from the submitted verifier.
- Mark the transaction consumed atomically before returning tokens; retries return a replay error and never repeat token material.
- Client secret remains server-side.
- `Cache-Control: no-store` and redacted logs.
- Rate limit by transaction/device attestation signal without creating an advertising identifier.

### `POST /v1/oauth/github/revoke`

Request contains a short-lived broker-issued revocation grant bound to the original exchange, plus token reference or revocation material as provider design permits. If no safe reference design exists, the app sends the token over TLS for immediate revocation through a no-store/no-log path. The response distinguishes remote revocation success from local deletion requirement.

### `GET /v1/capabilities`

Returns the signed experimental capability manifest. It never supplies arbitrary endpoint URLs or executable code.

Verification requires signature, audience/environment, `issuedAt`, `expiresAt`, bounded clock skew, and a monotonically increasing version persisted on device.

## 5. HTTP Client Policy

- HTTPS only; no cleartext exceptions in release builds.
- Fixed provider base URLs in code.
- Connection timeout around 10 seconds and total timeout around 20 seconds, tuned after measurement.
- Abort in-flight request when refresh is superseded or screen/app lifecycle requires it.
- Maximum two provider refreshes concurrently.
- Retry only idempotent GETs and token refresh under explicit rules.
- Exponential backoff with jitter for transport/5xx, no automatic retry for auth/permission/schema errors.
- Honor `Retry-After` exactly.
- Never follow redirects to a different unallowlisted host for API calls.

## 6. Response Validation and Versioning

Each adapter owns:

```text
schema.ts       Zod/raw response schemas
normalize.ts    raw -> domain mapping
fixtures/       sanitized success, partial, auth, rate-limit, changed-schema cases
client.ts       endpoints and headers
adapter.ts      capability implementation
```

- Raw schemas are strict for security-critical fields and tolerant only where documented.
- Unknown enum values are retained as safe text only if they cannot alter control flow.
- A provider schema change produces `schema_changed`, captures no raw secret payload, and disables only that connector.
- Parser schema versions are persisted with snapshots.

## 7. Refresh State Machine

```text
idle -> checking-policy -> loading-credential -> requesting -> validating
  -> persisting -> success
  -> auth-expired
  -> rate-limited(nextAllowedAt)
  -> schema-changed
  -> transient-failure(backoff)
  -> cancelled
```

Only one refresh per connection runs at a time. A manual refresh may raise priority but does not duplicate a request.

## 8. API Acceptance Criteria

- Each production-enabled endpoint has a linked official contract and fixture.
- Consumer/API/enterprise usage types are labeled correctly.
- GitHub remains release-disabled until user-token permission and endpoint compatibility tests pass.
- No connector depends on HTML selectors, cookies, or browser page injection.
- Every provider can fail independently.
- Rate-limit behavior is deterministic and tested.
- Disconnect revokes remotely where supported and always clears local credentials.
- Command Code/OpenCode Go can be disabled without app update.
- Claude/Codex remain blocked until partner requirements are met.
