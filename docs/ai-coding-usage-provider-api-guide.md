# AI Coding Usage Tracker: Provider API Integration Guide

**Providers:** OpenAI Codex, Claude Code CLI, OpenCode Go, GitHub Copilot  
**Verified:** September 5, 2026  
**Purpose:** Implementation reference for a mobile application that displays provider usage windows, quota percentages, remaining allowance, and reset times.

> Provider contracts change. Pin CLI/SDK versions, validate every response at runtime, and keep provider-specific logic behind adapters.

## 1. Executive summary

| Provider | Recommended connection | Usage surface | Mobile integration | Support level |
|---|---|---|---|---|
| OpenAI Codex | ChatGPT device-code login managed by Codex App Server | `account/rateLimits/read`, `account/usage/read` | Backend adapter running App Server over `stdio` | Official |
| Claude Code | Local Claude Code `statusLine` JSON synced by a desktop companion | `rate_limits.five_hour`, `rate_limits.seven_day` | Desktop companion sends snapshots to the app backend | Official local surface |
| OpenCode Go | User-provided OpenCode Go API key | `GET /zen/go/v1/usage` | Direct mobile request or backend proxy | Source-backed, not separately documented as a public endpoint |
| GitHub Copilot | GitHub OAuth user token | Copilot SDK RPC `account.getQuota` | Backend adapter running the Copilot SDK/runtime | Official |

### Recommended MVP order

1. OpenCode Go
2. GitHub Copilot
3. OpenAI Codex
4. Claude Code companion

Claude should not use subscription OAuth directly in a public third-party mobile app. Anthropic says products built for others should use API-key authentication and prohibits routing third-party traffic against subscription limits. The official status-line export avoids collecting the user's Claude OAuth token.

---

## 2. Shared normalized model

Do not force every provider into a hard-coded “hourly plus weekly” schema. Copilot uses named entitlement buckets, OpenCode Go adds a monthly window, and Codex can return multiple dynamic limit IDs.

```ts
export type ProviderId =
  | "codex"
  | "claude-code"
  | "opencode-go"
  | "github-copilot";

export type UsageWindow = {
  id: string;
  label: string;
  usedPercent: number | null;
  remainingPercent: number | null;
  used: number | null;
  limit: number | null;
  unit: "requests" | "credits" | "usd" | "tokens" | "percent" | null;
  windowSeconds: number | null;
  resetsAt: string | null; // ISO 8601 UTC
  state: "normal" | "warning" | "limited" | "unknown";
};

export type ProviderUsage = {
  provider: ProviderId;
  plan: string | null;
  windows: UsageWindow[];
  fetchedAt: string;
  source: "official-api" | "official-local" | "source-backed" | "experimental";
  stale: boolean;
};
```

Normalization rules:

- Clamp percentages displayed in progress bars to `0..100`, but retain the original value for diagnostics.
- Calculate `remainingPercent = max(0, 100 - usedPercent)` only when `usedPercent` is known.
- Convert Unix epoch seconds to ISO 8601 in the provider adapter.
- Preserve unknown provider buckets. Never assume the only keys are `primary`, `secondary`, or `premium_interactions`.
- Mark cached data as stale rather than clearing a provider card after a transient error.

---

# 3. OpenAI Codex

## 3.1 Integration status

**Support:** Official Codex App Server protocol.  
**Recommended architecture:** Run `codex app-server` on the backend and communicate over its default `stdio` JSONL transport. Do not expose the experimental WebSocket listener directly to the public internet.

Codex App Server uses JSON-RPC-like messages with the `jsonrpc` field omitted. Requests contain `method`, `params`, and `id`; notifications omit `id`.

Source: [OpenAI Codex App Server documentation](https://developers.openai.com/codex/app-server/)

## 3.2 Start and initialize App Server

```bash
codex app-server
```

The default transport is newline-delimited JSON over standard input/output.

Every connection must begin with exactly one `initialize` request followed by an `initialized` notification:

```json
{"method":"initialize","id":0,"params":{"clientInfo":{"name":"usage_tracker","title":"Usage Tracker","version":"0.1.0"}}}
{"method":"initialized","params":{}}
```

Generate schemas from the exact installed Codex version instead of hand-maintaining protocol types:

```bash
codex app-server generate-ts --out ./schemas
codex app-server generate-json-schema --out ./schemas
```

## 3.3 Authentication methods

### Recommended: ChatGPT device-code flow

Request:

```json
{"method":"account/login/start","id":1,"params":{"type":"chatgptDeviceCode"}}
```

Response:

```json
{
  "id": 1,
  "result": {
    "type": "chatgptDeviceCode",
    "loginId": "<opaque-uuid>",
    "verificationUrl": "https://auth.openai.com/codex/device",
    "userCode": "ABCD-1234"
  }
}
```

Show `verificationUrl` and `userCode` in the mobile UI. Completion arrives asynchronously:

```json
{
  "method": "account/login/completed",
  "params": {
    "loginId": "<opaque-uuid>",
    "success": true,
    "error": null
  }
}
```

An account update follows:

```json
{
  "method": "account/updated",
  "params": {
    "authMode": "chatgpt",
    "planType": "plus"
  }
}
```

The App Server owns token persistence and refresh for this managed login. Never ask for a ChatGPT email or password.

### Browser callback flow

```json
{
  "method": "account/login/start",
  "id": 2,
  "params": {
    "type": "chatgpt",
    "useHostedLoginSuccessPage": true,
    "appBrand": "chatgpt"
  }
}
```

This returns `loginId` and `authUrl`. The App Server hosts a loopback callback, so device-code login is normally easier for a mobile-to-backend integration.

### Other modes

| Type | Use | Recommendation |
|---|---|---|
| `apiKey` | OpenAI API-key authentication | Not suitable for reading ChatGPT subscription usage |
| `chatgptAuthTokens` | Host supplies ChatGPT tokens | Experimental; do not use for the MVP |

`account/usage/read` requires Codex-services-backed authentication and does not work with API-key-only authentication.

## 3.4 Account methods

| Method | Purpose |
|---|---|
| `account/read` | Read current account information; can optionally refresh tokens |
| `account/login/start` | Begin login |
| `account/login/cancel` | Cancel a pending managed ChatGPT login by `loginId` |
| `account/login/completed` | Login completion notification |
| `account/updated` | Authentication/plan change notification |
| `account/logout` | Remove the active account from that App Server profile |

Logout:

```json
{"method":"account/logout","id":3}
```

## 3.5 Read rate limits

Request:

```json
{"method":"account/rateLimits/read","id":4}
```

Representative response:

```json
{
  "id": 4,
  "result": {
    "rateLimits": {
      "limitId": "codex",
      "limitName": null,
      "primary": {
        "usedPercent": 25,
        "windowDurationMins": 300,
        "resetsAt": 1788600000
      },
      "secondary": {
        "usedPercent": 40,
        "windowDurationMins": 10080,
        "resetsAt": 1789000000
      },
      "rateLimitReachedType": null
    },
    "rateLimitsByLimitId": {
      "codex": {
        "limitId": "codex",
        "limitName": null,
        "primary": {
          "usedPercent": 25,
          "windowDurationMins": 300,
          "resetsAt": 1788600000
        },
        "secondary": {
          "usedPercent": 40,
          "windowDurationMins": 10080,
          "resetsAt": 1789000000
        },
        "rateLimitReachedType": null
      }
    },
    "rateLimitResetCredits": null
  }
}
```

Field meanings:

| Field | Meaning |
|---|---|
| `rateLimits` | Backward-compatible single-bucket view |
| `rateLimitsByLimitId` | Multi-bucket map keyed by the provider's metered limit ID |
| `usedPercent` | Percentage used inside this window |
| `windowDurationMins` | Window duration in minutes |
| `resetsAt` | Unix epoch timestamp in seconds |
| `planType` | ChatGPT plan, when returned for the bucket |
| `credits` | Remaining workspace credit data, when provided |
| `rateLimitReachedType` | Server-classified reason a limit has been reached |
| `rateLimitResetCredits` | Earned resets when the service provides them |

Subscribe to live updates as well as polling:

```json
{
  "method": "account/rateLimits/updated",
  "params": {
    "rateLimits": {
      "limitId": "codex",
      "primary": {
        "usedPercent": 31,
        "windowDurationMins": 300,
        "resetsAt": 1788600000
      }
    }
  }
}
```

Adapter behavior:

- Prefer `rateLimitsByLimitId` when present.
- Fall back to `rateLimits` for older App Server versions.
- Emit one normalized window for each non-null `primary` and `secondary` object.
- Use the actual duration for the label; do not hard-code “5 hour” or “weekly.”

## 3.6 Read token-activity summaries

Request:

```json
{"method":"account/usage/read","id":5}
```

Response shape:

```json
{
  "id": 5,
  "result": {
    "summary": {
      "lifetimeTokens": 1234567,
      "peakDailyTokens": 45678,
      "longestRunningTurnSec": 540,
      "currentStreakDays": 8,
      "longestStreakDays": 14
    },
    "dailyUsageBuckets": [
      {"startDate":"2026-06-18","tokens":12345}
    ]
  }
}
```

Summary values and `dailyUsageBuckets` can be `null`. This method is useful for history screens but is separate from quota-window percentages.

## 3.7 Earned reset credits

This is optional and should not be part of the first read-only MVP.

```json
{
  "method": "account/rateLimitResetCredit/consume",
  "id": 6,
  "params": {
    "idempotencyKey": "<uuid-per-logical-attempt>",
    "creditId": "<opaque-credit-id>"
  }
}
```

Possible outcomes include `reset`, `alreadyRedeemed`, `nothingToReset`, and `noCredit`. Refresh `account/rateLimits/read` after the call. This is a mutating endpoint and should require an explicit confirmation in the mobile UI.

## 3.8 Codex production architecture

Recommended deployment inference based on the official protocol:

- Mobile calls your own HTTPS API.
- Backend runs a pinned Codex App Server binary over `stdio`.
- Isolate each user's App Server profile and persisted auth directory.
- Serialize login and quota RPC messages through a request-ID router.
- Keep provider credentials out of mobile logs and analytics.
- Do not depend on `https://chatgpt.com/backend-api/codex/usage`; it is an internal endpoint, not the documented integration surface.

---

# 4. Claude Code CLI

## 4.1 Integration status

**Recommended support:** Official local `statusLine` JSON plus a desktop companion.  
**Not recommended:** Reusing Claude subscription OAuth tokens in a third-party public application.

Official sources:

- [Claude Code status-line data](https://code.claude.com/docs/en/statusline)
- [Anthropic guidance for subscription authentication and third-party tools](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account)

## 4.2 Official local usage surface

Claude Code can run a configured local command and send structured session information to it on standard input. For Pro and Max subscriptions, the JSON can include:

```json
{
  "rate_limits": {
    "five_hour": {
      "used_percentage": 23.5,
      "resets_at": 1788600000
    },
    "seven_day": {
      "used_percentage": 41.2,
      "resets_at": 1789000000
    }
  }
}
```

Fields:

| Field | Meaning |
|---|---|
| `rate_limits.five_hour.used_percentage` | 5-hour limit consumed, from 0 to 100 |
| `rate_limits.five_hour.resets_at` | 5-hour reset as Unix epoch seconds |
| `rate_limits.seven_day.used_percentage` | 7-day limit consumed, from 0 to 100 |
| `rate_limits.seven_day.resets_at` | 7-day reset as Unix epoch seconds |
| `rate_limits.spend_limit.*` | Optional spend-limit percentage/reset behind a Claude apps gateway |

`rate_limits` is absent until the first API response. Every window can be absent independently, and Claude Code removes a window after its reset time passes.

## 4.3 Configure a companion sync command

Claude settings example:

```json
{
  "statusLine": {
    "type": "command",
    "command": "usage-tracker-companion ingest",
    "refreshInterval": 300
  }
}
```

Recommended companion behavior:

1. Read one JSON document from standard input.
2. Extract only `version` and `rate_limits` for quota sync.
3. Discard source-code paths, transcript paths, prompt IDs, repository identity, and other unrelated fields.
4. POST the minimized payload to your own backend with a companion-specific device credential.
5. Store the last unsent snapshot locally and retry with exponential backoff.
6. Never read or upload the user's Claude OAuth token.

Suggested minimized payload:

```json
{
  "provider": "claude-code",
  "deviceId": "dev_123",
  "claudeCodeVersion": "2.1.260",
  "capturedAt": "2026-09-05T12:00:00Z",
  "rateLimits": {
    "fiveHour": {
      "usedPercent": 23.5,
      "resetsAt": "2026-09-05T16:00:00Z"
    },
    "sevenDay": {
      "usedPercent": 41.2,
      "resetsAt": "2026-09-10T00:00:00Z"
    }
  }
}
```

The status-line command is event-driven. A five-minute refresh interval is sufficient for a mobile tracker and avoids unnecessary local/backend traffic.

## 4.4 Undocumented OAuth usage endpoint

Claude Code and community tooling have been observed calling:

```http
GET https://api.anthropic.com/api/oauth/usage
Authorization: Bearer <Claude subscription OAuth token>
anthropic-beta: oauth-2025-04-20
```

Observed payloads have included keys such as:

```json
{
  "five_hour": {
    "utilization": 0.36,
    "resets_at": "2026-09-05T16:00:00Z"
  },
  "seven_day": {
    "utilization": 0.62,
    "resets_at": "2026-09-10T00:00:00Z"
  },
  "seven_day_sonnet": null,
  "seven_day_opus": null,
  "seven_day_oauth_apps": null,
  "extra_usage": null
}
```

This is not a public third-party API contract. Payload shape and utilization scale have changed across versions, and reports show aggressive HTTP `429` responses. Do not implement it in the public mobile app or collect/export Claude's stored OAuth credential.

Evidence: [Anthropic Claude Code issue showing the request and HTTP 429 behavior](https://github.com/anthropics/claude-code/issues/30930)

## 4.5 Why the companion path is preferred

Anthropic states that subscription authentication is designed for native Anthropic applications, including Claude Code, and that developers building products for others should use Claude Console API-key authentication. API keys, however, report API billing usage rather than a person's Claude Pro/Max subscription windows.

Therefore:

- Use the official status-line fields for Pro/Max quota tracking.
- Use Anthropic's documented Usage and Cost Admin API only if you later add separate Claude API/Console usage tracking.
- Label Claude as “requires desktop companion” in the mobile onboarding flow.

---

# 5. OpenCode Go

## 5.1 Integration status

**Authentication:** OpenCode Go API key. No OAuth flow is required.  
**Usage endpoint:** Implemented in the official OpenCode source tree.  
**Risk:** The route is source-backed but is not currently described as a stable public usage API on the Go documentation page. Keep it behind an adapter.

Sources:

- [OpenCode Go documentation](https://opencode.ai/docs/go/)
- [Usage route in the official OpenCode repository](https://github.com/anomalyco/opencode/blob/dev/packages/console/app/src/routes/zen/go/v1/usage.ts)

## 5.2 Authentication

The user subscribes to OpenCode Go in OpenCode Zen, copies the API key, and pastes it into the mobile app.

```http
Authorization: Bearer <OPENCODE_GO_API_KEY>
```

Never ask for OpenCode account credentials. Store the API key in iOS Keychain or Android Keystore for direct requests, or encrypt it at rest if the backend must fetch usage for notifications.

## 5.3 Read usage

```http
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <OPENCODE_GO_API_KEY>
Accept: application/json
```

Example:

```bash
curl --request GET \
  --url https://opencode.ai/zen/go/v1/usage \
  --header "Authorization: Bearer $OPENCODE_GO_API_KEY" \
  --header "Accept: application/json"
```

Successful response:

```json
{
  "usage": {
    "rolling": {
      "status": "ok",
      "percent": 12,
      "resetsAt": "2026-09-05T18:00:00.000Z"
    },
    "weekly": {
      "status": "ok",
      "percent": 34,
      "resetsAt": "2026-09-09T12:00:00.000Z"
    },
    "monthly": {
      "status": "ok",
      "percent": 56,
      "resetsAt": "2026-09-22T12:00:00.000Z"
    }
  }
}
```

Window object:

```ts
type OpenCodeGoWindow = {
  status: "ok" | "rate-limited";
  percent: number;
  resetsAt: string; // ISO 8601
};
```

Mapping:

| Source | Normalized ID | Label |
|---|---|---|
| `usage.rolling` | `rolling` | Derive from current provider docs; presently 5 hours |
| `usage.weekly` | `weekly` | Weekly |
| `usage.monthly` | `monthly` | Monthly |

The current Go plan documentation lists base allowances of $12 per 5-hour period, $30 weekly, and $60 monthly, but says limits may change and effective allowance varies by model. Treat the endpoint's percentage/status/reset as authoritative. Do not derive exact dollars used from the percentage unless OpenCode adds the applicable limit to the response.

## 5.4 Error responses

Missing key:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
```

```json
{
  "type": "error",
  "error": {
    "type": "AuthError",
    "message": "Missing API key."
  }
}
```

Invalid key:

```json
{
  "type": "error",
  "error": {
    "type": "AuthError",
    "message": "Unauthorized"
  }
}
```

Valid key without Go entitlement:

```http
HTTP/1.1 403 Forbidden
```

```json
{
  "type": "error",
  "error": {
    "type": "EntitlementError",
    "message": "OpenCode Go subscription required."
  }
}
```

Treat unknown `5xx`, network failures, malformed JSON, and schema drift as transient. Preserve the last good snapshot and show its age.

## 5.5 Known omissions

The current response does not expose:

- Zen wallet balance
- Exact dollars used or remaining
- Plan price
- User identity
- Per-model usage breakdown

Only promise the three percentage/reset windows in the MVP.

---

# 6. GitHub Copilot

## 6.1 Integration status

**Authentication:** GitHub OAuth user token.  
**Quota API:** Official Copilot SDK RPC `account.getQuota`.  
**Recommended architecture:** Mobile performs OAuth; backend passes the resulting per-user token to a pinned Copilot SDK/runtime and returns a normalized quota snapshot.

Sources:

- [GitHub Copilot SDK usage and billing metrics](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/usage-and-billing)
- [GitHub Copilot SDK authentication](https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/authenticate)
- [GitHub OAuth authorization flows](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Copilot SDK multi-tenancy](https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/multi-tenancy)

## 6.2 GitHub OAuth web flow

Authorization endpoint:

```http
GET https://github.com/login/oauth/authorize
```

Recommended parameters:

| Parameter | Required | Notes |
|---|---:|---|
| `client_id` | Yes | GitHub OAuth App or GitHub App client ID |
| `redirect_uri` | Strongly recommended | Use a backend HTTPS callback or verified app link |
| `state` | Strongly recommended | Cryptographically random CSRF value |
| `code_challenge` | Strongly recommended | PKCE S256 challenge |
| `code_challenge_method` | With challenge | Must be `S256` |
| `scope` | Context dependent | Request the minimum permissions needed |

Example:

```text
https://github.com/login/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https%3A%2F%2Fapi.example.com%2Foauth%2Fgithub%2Fcallback
  &state=RANDOM_STATE
  &code_challenge=PKCE_CHALLENGE
  &code_challenge_method=S256
```

Exchange the returned authorization code:

```http
POST https://github.com/login/oauth/access_token
Accept: application/json
Content-Type: application/x-www-form-urlencoded
```

```text
client_id=...
client_secret=...
code=...
redirect_uri=...
code_verifier=...
```

Never bundle `client_secret` in the mobile application. Exchange the code on your backend. Validate `state`, then verify the resulting user's identity before associating the token with an app account.

GitHub supports expiring access tokens and refresh tokens. If enabled, access tokens expire after eight hours and refresh tokens expire after six months without use. Rotate both atomically after refresh.

## 6.3 GitHub device flow

If you prefer device authorization:

```http
POST https://github.com/login/device/code
Accept: application/json
Content-Type: application/x-www-form-urlencoded
```

```text
client_id=YOUR_CLIENT_ID
scope=...
```

Representative response:

```json
{
  "device_code": "<opaque-device-code>",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://github.com/login/device",
  "expires_in": 900,
  "interval": 5
}
```

Poll:

```http
POST https://github.com/login/oauth/access_token
Accept: application/json
Content-Type: application/x-www-form-urlencoded
```

```text
client_id=YOUR_CLIENT_ID
device_code=...
grant_type=urn:ietf:params:oauth:grant-type:device_code
```

Respect `interval`. On `slow_down`, add five seconds to the polling interval.

## 6.4 Pass the user token to the Copilot SDK

GitHub supports `gho_` OAuth access tokens, `ghu_` GitHub App user tokens, and fine-grained `github_pat_` tokens. Classic `ghp_` tokens are not supported by the Copilot SDK authentication guide.

TypeScript setup:

```ts
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient({
  gitHubToken: userAccessToken,
  useLoggedInUser: false,
});
```

The authenticated user must have the required Copilot subscription/entitlement.

## 6.5 Read quota

RPC:

```ts
const { quotaSnapshots } = await client.rpc.account.getQuota({});
```

Representative response shape:

```json
{
  "quotaSnapshots": {
    "premium_interactions": {
      "entitlementRequests": 1000,
      "usedRequests": 430,
      "remainingPercentage": 57,
      "resetDate": "2026-10-01T00:00:00Z"
    }
  }
}
```

Fields:

| Field | Type | Meaning |
|---|---|---|
| `entitlementRequests` | number | Included requests; `-1` means unlimited |
| `usedRequests` | number | Requests consumed in the current period |
| `remainingPercentage` | number | Entitlement remaining, not used |
| `resetDate` | string/null | ISO 8601 reset date when available |

The `quotaSnapshots` keys are runtime strings and can change. Iterate all keys and special-case labels only for presentation:

```ts
for (const [id, snapshot] of Object.entries(quotaSnapshots)) {
  const unlimited = snapshot.entitlementRequests === -1;
  const usedPercent = unlimited
    ? null
    : Math.max(0, 100 - snapshot.remainingPercentage);

  // Normalize id + snapshot without discarding unknown buckets.
}
```

## 6.6 SDK/runtime deployment requirements

The Copilot SDK communicates with the Copilot CLI runtime. Node.js, Python, and .NET SDK distributions can provide the CLI automatically; other languages may require it separately.

For a shared backend:

- Use GitHub's multi-user/server deployment guidance.
- Pass the requesting user's GitHub token rather than a shared personal token.
- Use isolated sessions and `mode: "empty"` if sessions are created.
- Pin both the SDK and CLI runtime because generated RPC fields can change.
- The quota-only service should not expose ambient filesystem/tools.

Do not search for or depend on an undocumented direct Copilot REST URL when the supported SDK RPC already provides quota.

---

# 7. Recommended app-facing adapter API

Keep provider credentials and protocol differences behind your own stable API.

## 7.1 Connection endpoints

```http
POST /v1/connections/codex/start
GET  /v1/connections/codex/{loginId}/status
DELETE /v1/connections/codex

POST /v1/connections/opencode-go
DELETE /v1/connections/opencode-go

GET  /v1/connections/github-copilot/authorize
GET  /v1/connections/github-copilot/callback
DELETE /v1/connections/github-copilot

POST /v1/connections/claude-code/devices
POST /v1/connections/claude-code/snapshots
DELETE /v1/connections/claude-code/devices/{deviceId}
```

## 7.2 Unified read endpoint

```http
GET /v1/usage
Authorization: Bearer <your-app-session-token>
```

```json
{
  "providers": [
    {
      "provider": "opencode-go",
      "plan": "go",
      "windows": [
        {
          "id": "rolling",
          "label": "5 hour",
          "usedPercent": 12,
          "remainingPercent": 88,
          "used": null,
          "limit": null,
          "unit": "percent",
          "windowSeconds": 18000,
          "resetsAt": "2026-09-05T18:00:00Z",
          "state": "normal"
        }
      ],
      "fetchedAt": "2026-09-05T12:00:00Z",
      "source": "source-backed",
      "stale": false
    }
  ]
}
```

## 7.3 Refresh policy

| Provider | Suggested foreground refresh | Background refresh | Notes |
|---|---:|---:|---|
| Codex | On open plus every 5 minutes | Every 15 minutes | Also consume `account/rateLimits/updated` while connected |
| Claude Code | Event-driven companion | Companion heartbeat every 5 minutes while CLI is active | Show “last synced” when the laptop is offline |
| OpenCode Go | On open plus every 5 minutes | Every 15 minutes | Back off on unknown throttling/errors |
| GitHub Copilot | On open plus every 15 minutes | Every 30–60 minutes | Monthly quota does not need rapid polling |

Always honor provider-supplied retry instructions where available. Use exponential backoff with jitter for transient failures.

---

# 8. Security requirements

- Never collect ChatGPT, Claude, GitHub, or OpenCode account passwords.
- Keep GitHub client secrets exclusively on the backend.
- Do not export Claude Code's OAuth token; sync only minimized status-line usage fields.
- Do not log `Authorization` headers, API keys, access tokens, refresh tokens, device codes, or OAuth callback codes.
- Encrypt server-side provider credentials with envelope encryption and rotate data-encryption keys.
- On mobile, use iOS Keychain and Android Keystore-backed secure storage.
- Bind every credential and provider snapshot to your own authenticated user ID.
- Support disconnect/revocation and delete provider credentials immediately on disconnect.
- Validate all upstream JSON; provider success responses can still be incomplete or change shape.
- Cache the last valid response separately from current connection/error state.
- Use HTTPS and certificate validation for all mobile/backend and backend/provider requests.

---

# 9. Support matrix and release decision

| Provider | Ship in V1 | Label in UI | Main risk |
|---|---:|---|---|
| OpenCode Go | Yes | Connected by API key | Source-backed endpoint could change |
| GitHub Copilot | Yes | Connected with GitHub | Requires backend Copilot SDK/runtime |
| Codex | Yes | Connected with ChatGPT | Per-user App Server auth isolation and version pinning |
| Claude Code | Yes, with companion | Desktop companion required | Usage updates depend on Claude Code running locally |

Do not ship direct Claude OAuth usage polling. If the companion is out of scope for V1, show Claude as “coming later” instead of asking users to paste tokens from their local credential store.

---

# 10. Source index

## OpenAI Codex

- [Codex App Server](https://developers.openai.com/codex/app-server/)

## Claude Code

- [Customize your Claude Code status line](https://code.claude.com/docs/en/statusline)
- [Log in to your Claude account: subscription and third-party guidance](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account)
- [Claude Code issue: OAuth usage endpoint throttling](https://github.com/anthropics/claude-code/issues/30930)
- [Claude Usage and Cost Admin API](https://platform.claude.com/docs/en/manage-claude/usage-cost-api)

## OpenCode Go

- [OpenCode Go](https://opencode.ai/docs/go/)
- [OpenCode Go usage route source](https://github.com/anomalyco/opencode/blob/dev/packages/console/app/src/routes/zen/go/v1/usage.ts)

## GitHub Copilot

- [Copilot SDK usage and billing metrics](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/usage-and-billing)
- [Copilot SDK authentication](https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/authenticate)
- [Authorizing GitHub OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Copilot SDK multi-tenancy and server deployments](https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/multi-tenancy)

