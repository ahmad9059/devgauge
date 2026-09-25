# DevGauge Architecture

> This is a greenfield architecture. Before this planning pass, the repository contained only its name (`README.md:1`); it now also contains planning documents but no application implementation.

## 1. Architecture Decision

Build DevGauge as an **Android-only** local-first Expo React Native application with provider adapters behind a normalized domain boundary.

```text
Expo Router UI
  -> application use cases
    -> provider registry
       -> GitHub Copilot adapter (WebView candidate; OAuth API fallback candidate)
      -> Command Code adapter (experimental)
       -> OpenCode Go adapter (experimental)
       -> Gemini CLI adapter (approved quota source candidate; user-shared stats fallback)
       -> Claude adapter (WebView candidate; manual fallback)
       -> Codex adapter (WebView candidate; manual fallback)
    -> secure credential vault (expo-secure-store)
    -> local WebView cookie store (embedded-session candidates only)
    -> local repository (expo-sqlite + SQLCipher candidate)
    -> local notification scheduler

Optional stateless broker
  -> confidential OAuth code exchange/revocation only
  -> no provider password, browser cookie, or usage-history database
```

The provider adapter boundary is the core design choice. Provider response shapes, periods, permissions, and stability vary too much for direct UI coupling.

## 2. Runtime and Tooling Baseline

Proposed baseline at implementation start:

- Current stable Expo SDK selected and pinned during Phase 2, not guessed in this planning document.
- Android package, Android App Links, and Play Store build profiles only; no iOS bundle, Universal Links, provisioning or App Store submission.
- TypeScript strict mode.
- Expo Router with typed routes and platform deep linking.
- Expo development builds and EAS Build; Expo Go is insufficient if SQLCipher or some native auth configuration is enabled.
- `expo-sqlite` for local relational data and migrations.
- `expo-secure-store` for small credentials and encryption keys.
- `expo-auth-session` / `expo-web-browser` for supported OAuth in the system authentication browser.
- `react-native-webview` for the gated, app-controlled website-session track; verify platform cookie behavior in a development build during Phase 1.
- `expo-notifications` for local reset/threshold reminders.
- TanStack Query for in-memory asynchronous orchestration and cache invalidation; SQLite remains the durable source.
- Zod at provider/network boundaries.
- Vitest/Jest-compatible unit runner, React Native Testing Library, and Maestro for critical mobile journeys.

Every dependency choice is finalized through a small architecture spike before broad implementation. Avoid adopting an ORM unless migration and query ergonomics demonstrate a concrete benefit over typed repository functions.

## 3. Proposed Project Structure

```text
app/
  _layout.tsx
  index.tsx
  onboarding.tsx
  (tabs)/
    _layout.tsx
    usage.tsx
    connectors.tsx
    settings.tsx
  provider/[providerId].tsx
  connect/[providerId].tsx
  legal/[document].tsx

src/
  components/
    ui/
    usage/
    connectors/
    settings/
  design/
    tokens.ts
    themes.ts
    typography.ts
  domain/
    providers.ts
    usage.ts
    errors.ts
  features/
    dashboard/
    connections/
    notifications/
    settings/
  providers/
    registry.ts
    claude/
    codex/
    command-code/
    opencode-go/
    github-copilot/
  storage/
    database.ts
    migrations/
    repositories/
    secure-vault.ts
  services/
    auth/
    network/
    notifications/
    diagnostics/
  testing/
    fixtures/
    factories/

broker/                       # optional deployable, if GitHub exchange needs it
  src/
    routes/
    providers/github.ts
    security/
```

## 4. Layer Responsibilities

### Presentation

- Screens render domain view models, never raw provider responses.
- UI reads cached SQLite state immediately, then requests refresh.
- Provider cards own visual state only, not network or credential logic.
- Theme and text-scale behavior are token-driven.

### Application

- `refreshConnection(connectionId, reason)` coordinates credential load, network policy, adapter fetch, validation, normalization, and transactional persistence for one account scope.
- `connectProvider(providerId)` chooses only capability-declared auth flows and creates a connection after identity validation.
- `disconnectConnection(connectionId)` revokes the selected account remotely when possible, deletes its secret, cancels its reminders, and optionally deletes its history.
- `evaluateThresholds(snapshot)` schedules/cancels local notifications idempotently.

### Domain

The domain models provider-native differences explicitly:

```ts
type ProviderId =
  | 'claude'
  | 'codex'
  | 'command-code'
  | 'opencode-go'
  | 'github-copilot'
  | 'gemini-cli';

type SupportTier = 'candidate-supported' | 'supported' | 'experimental' | 'blocked';
type UsageUnit = 'percent' | 'requests' | 'credits' | 'tokens' | 'currency';
type WindowKind = 'rolling' | 'daily' | 'weekly' | 'monthly' | 'billing';
type DecimalString = string; // canonical non-negative base-10 value

interface UsageWindow {
  externalKey: string;
  kind: WindowKind;
  label: string;
  used: DecimalString | null;
  limit: DecimalString | null;
  remaining: DecimalString | null;
  utilization: number | null;
  unit: UsageUnit;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  resetsAt: string | null;
  derivation: 'provider' | 'documented-rule' | 'manual';
}

interface UsageSnapshot {
  providerId: ProviderId;
  connectionId: string;
  fetchedAt: string;
  source: 'live' | 'manual';
  schemaVersion: number;
  windows: UsageWindow[];
}
```

Unknown values remain `null`; the domain never converts unknown into zero.

### Infrastructure

- HTTP client enforces HTTPS, timeouts, cancellation, rate-limit handling, and redacted logging.
- Provider parsers validate at runtime and fail closed on unknown critical schema changes.
- SQLite repositories use bound parameters and exclusive transactions for refresh writes.
- SecureStore contains credentials by opaque key; SQLite stores only a `credential_ref`.

## 5. Provider Adapter Contract

```ts
interface ProviderAdapter {
  readonly descriptor: ProviderDescriptor;
  connect(input: ConnectInput): Promise<ConnectionDraft>;
  validateCredential(credential: ProviderCredential): Promise<AccountIdentity>;
  fetchUsage(ctx: FetchUsageContext): Promise<NormalizedUsageResult>;
  refreshCredential?(credential: ProviderCredential): Promise<ProviderCredential>;
  revoke?(credential: ProviderCredential): Promise<void>;
  openFirstPartyUsage(): Promise<void>;
}

interface ProviderDescriptor {
  id: ProviderId;
  supportTier: SupportTier;
  authModes: Array<'oauth-pkce' | 'api-key' | 'web-session' | 'manual-import' | 'manual'>;
  capabilities: {
    liveUsage: boolean;
    remoteRevocation: boolean;
    resetRedemption: boolean;
    organizationScope: boolean;
  };
  minimumRefreshIntervalSeconds: number;
}
```

Blocked adapters implement manual reset reminders/first-party links or user-shared Gemini CLI stats but must set `liveUsage: false`. Web-session adapters use Android's WebView cookie store rather than treating a website session as `ProviderCredential` or storing a raw cookie in SQLite/SecureStore; the adapter contract must support session-backed access without serializing cookies.

`supportTier` is registry-owned and is not persisted in connection rows. A separate runtime `releaseEnabled` capability is derived from the app version, completed feasibility gates, and the signed capability manifest. This prevents stale database rows from promoting or downgrading a connector.

## 6. Data Flow

### 6.1 Startup

1. Resolve theme without waiting for database hydration.
2. Open database, set encryption key if enabled, run migrations.
3. Load provider connections and latest snapshots.
4. Render cached dashboard.
5. Refresh eligible providers with concurrency limited to two.

### 6.2 Refresh

1. Acquire a per-connection refresh mutex so personal and organization accounts refresh independently.
2. Check connection status, network state, backoff, and minimum interval.
3. Read credential from SecureStore.
4. Fetch with provider-specific timeout and headers.
5. Validate raw response with versioned schema.
6. Normalize without inventing absent values.
7. Write snapshot, windows, and refresh attempt in one exclusive transaction.
8. Evaluate notifications.
9. Invalidate the in-memory query.

### 6.3 OAuth

This produces a scoped OAuth token, **not** a website session or app-readable browser cookie. An OS-owned authentication tab is a distinct fallback, not the requested Claude/Codex/Copilot website-session flow.

1. Generate state, nonce where applicable, PKCE verifier/challenge, and provider-specific callback path.
2. Open external auth session.
3. Validate exact callback, state, issuer, and errors.
4. Exchange code directly only for public-client flows; otherwise use stateless broker.
5. Store resulting refresh/access token in SecureStore.
6. Persist only account metadata and credential reference to SQLite.

### 6.3a Embedded website-session feasibility track (Claude, Codex, GitHub Copilot)

1. Phase 1 prototypes a dedicated `react-native-webview` on Android for Claude, Codex and GitHub Copilot, starting on an allowlisted official HTTPS domain; authentication happens on the provider's page. Validate identity, website usage access, session persistence after restart, MFA/passkey behavior, expiry, logout, account switching, and provider-policy compatibility. This is **not delegated OAuth**.
2. For a provider that passes review, keep session cookies in the platform's WebView cookie store on device. Never write raw cookies/passwords to SQLite, SecureStore, logs, diagnostics, analytics, broker or notification payloads. Record only a local connection ID, non-secret account metadata, source, and last sync status in SQLite. Verify the platform's actual cookie sharing/isolation behavior before claiming per-provider or per-account isolation.
3. Use a provider-specific session bridge to read only the usage values needed, from a verified first-party usage surface. The endpoint/DOM method, request scope, schema stability and failure behavior must be documented per provider; no arbitrary URL execution or remote-configured JavaScript. If no reliable and acceptable source is found, leave live sync disabled.
4. Limit navigation to reviewed official login/usage domains and their verified identity-provider redirects; show the effective hostname, block unexpected schemes/hosts, prevent untrusted downloads and external intent launches, and treat any injected page bridge as a privileged, audited boundary.
5. On disconnect clear that provider's applicable Android WebView state and local usage data as requested; test collateral effects on other connections because cookie stores may be shared. If independent deletion is not possible, document and gate multi-account support.

### 6.3b Gemini CLI quota and import flow

Gemini CLI is a separate coding-agent adapter, **not** a `gemini.google.com` chat WebView. The official CLI displays model/session and quota information in `/stats model`; its quotas depend on Google account/Code Assist, Gemini API key, Workspace or Vertex authentication. Phase 1 checks whether a DevGauge-registered Android OAuth client may query a documented account-level CLI quota endpoint. If so, authorize in an OS-owned authentication tab and keep the scoped token in SecureStore. Without that contract, Phase 8 accepts only explicit user-shared, sanitized CLI stats, labeled with source and age; do not import CLI tokens/config or infer total account usage from one session. A Gemini API key's project usage is not equivalent to Google-account Gemini CLI quota.

The [AI Usage privacy policy](https://usage-4e75d.web.app/privacy-policy.html) is evidence of a shipped local WebView approach for Claude/GitHub, not proof of DevGauge's exact provider contracts. RFC 8252 continues to govern any actual OAuth app authorization: do not submit an OAuth authorization request from an embedded user-agent.

### 6.4 Disconnect

1. Confirm whether history should also be deleted.
2. Attempt remote revocation with bounded retry.
3. Delete local secret even when revocation endpoint is unavailable; disclose remote status.
4. Mark connection disconnected and cancel scheduled notifications.
5. Purge snapshots if requested.

## 7. Local-First and Broker Boundary

The mobile app does not need a DevGauge user account for v1. The broker exists only if a provider requires a confidential client secret or disallows direct native token exchange.

Broker rules:

- No cloud database.
- No browser sessions or provider passwords.
- No durable provider tokens unless vendor design requires server custody and the product scope is explicitly revised.
- The broker is stateless with respect to users and usage history, but OAuth requires a minimal TTL replay store. It retains only hashed transaction ID/state, PKCE challenge, exact redirect URI, provider, expiry, and consumed flag for at most five minutes.
- Strict provider allowlist; no user-controlled upstream URL.
- Mobile app receives the minimum token material permitted by provider contract.

If GitHub device flow plus required permissions can satisfy billing access without a confidential exchange, prefer it after a documented spike and remove the broker.

## 8. Sync and Caching Policy

- Foreground refresh when last successful fetch exceeds connector TTL.
- Manual refresh always available unless inside `Retry-After` or active request.
- No continuous background polling in v1.
- Utilization threshold notifications are evaluated only after startup, foreground, or manual refresh. Reset reminders may fire in the background because their timestamps are scheduled locally from previously fetched/manual data.
- Suggested default TTL: 5 minutes for supported live usage, 15 minutes for experimental providers, no polling for blocked/manual providers.
- Exponential backoff with jitter for transport/5xx failures; exact `Retry-After` for 429.
- Keep latest successful data separately from latest attempt/error.
- Cap history using per-provider retention setting, default 90 days.

## 9. Capability Manifest

Experimental provider endpoints can change between app releases. A signed capability manifest may disable only experimental network operations:

```json
{
  "version": 3,
  "environment": "production",
  "audience": "app.devgauge.mobile",
  "issuedAt": "2026-09-21T00:00:00Z",
  "expiresAt": "2026-10-21T00:00:00Z",
  "providers": {
    "command-code": { "enabled": false, "minimumAppVersion": "1.0.0" },
    "opencode-go": { "enabled": true, "schema": 2 }
  },
  "signature": "base64-signature"
}
```

- Fail closed after expiry for experimental requests, but keep cached data readable.
- Supported/blocked status cannot be silently upgraded by manifest.
- Signature public key is pinned in the app; manifest does not carry executable code or arbitrary URLs.
- Persist the highest accepted version and reject lower signed versions to prevent replay.
- Bind the signed payload to environment and app audience, include `issuedAt` and `expiresAt`, and allow at most five minutes of clock skew.

## 10. Navigation and Deep Links

- Typed Expo Router routes.
- Unique auth callback path per provider to prevent mix-up attacks.
- Only allowlisted routes accepted from notifications and deep links.
- Auth callbacks are single-use and bound to an in-memory/persisted short-lived transaction.
- Universal/App Links preferred; reverse-domain custom scheme is fallback.

## 11. Error Taxonomy

```ts
type ProviderErrorCode =
  | 'offline'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'schema_changed'
  | 'capability_disabled'
  | 'unsupported_account'
  | 'revocation_failed'
  | 'unknown';
```

- User messages remain actionable and non-sensitive.
- Diagnostics preserve error class, provider, request ID if safe, status, and timing.
- Response bodies are excluded by default.

## 12. Testing Architecture

- Domain tests: normalization, null behavior, percentages, dates, reset derivation.
- Contract tests: sanitized provider fixtures and schema-change cases.
- Repository tests: every migration from empty and prior versions, transactions, retention.
- Security tests: redirect mismatch, state replay, token redaction, malicious deep links.
- Component tests: all card states, Dynamic Type, both themes.
- E2E tests: first launch, GitHub connect test environment, API-key connect with mock server, offline refresh, disconnect/delete.
- Manual Android matrix: small/large phones, tablet, portrait/landscape, TalkBack, reduced motion.

## 13. Architecture Decision Records to Create During Delivery

1. Expo SDK and package manager pin.
2. SQLCipher vs non-sensitive plaintext cache with OS protection.
3. GitHub App browser PKCE vs device flow, user-token permission compatibility with billing endpoints, and broker requirement.
4. ORM/query layer choice.
5. Experimental capability manifest hosting and signing.
6. Crash reporting/analytics opt-in and redaction policy.

## 14. References

- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Router typed routes](https://docs.expo.dev/router/reference/typed-routes/)
- [RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252)
