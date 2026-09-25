# DevGauge Local Database Plan

> No database implementation existed when planning began (`README.md:1`), and none has been added; this document defines the proposed local schema and migration contract.

## 1. Storage Boundary

### SQLite stores

- Provider connection metadata without secrets.
- Normalized usage snapshots and windows.
- Refresh attempt history and sanitized errors.
- User preferences, provider ordering, threshold rules, and notification schedule metadata.
- Manual reset entries.

### SecureStore stores

- OAuth access/refresh tokens where local persistence is required.
- User-entered API keys.
- SQLCipher key if SQLCipher is approved.
- Short-lived auth transaction material only when app restart recovery is required.

### Never stored in SQLite or SecureStore

- Provider passwords.
- Browser cookies/session jars (a gated provider website session persists only in Android WebView's app-local cookie store).
- Claude or Codex credential files.
- OAuth authorization codes after exchange.
- Raw HTTP headers.
- Unredacted provider responses containing secrets.

## 2. Encryption Decision

Recommended default: enable SQLCipher because usage history can reveal work patterns and subscription/account metadata.

Tradeoffs:

- `expo-sqlite` SQLCipher requires native prebuild/development builds and is unavailable in Expo Go.
- The key must be generated randomly and stored in SecureStore, then applied immediately after opening with `PRAGMA key`.
- Key loss means the local cache is unrecoverable; recovery is destructive local reset and provider reconnection.
- Tokens remain in SecureStore even when the database is encrypted.

If the team rejects SQLCipher, reduce stored identity and history, document plaintext-at-rest risk, and rely only on application sandbox/device encryption.

## 3. Database Configuration

On every open:

1. Open database.
2. Apply SQLCipher key when enabled.
3. Enable `PRAGMA foreign_keys = ON`.
4. Enable `PRAGMA journal_mode = WAL`.
5. Set a bounded `busy_timeout`.
6. Read `PRAGMA user_version` and run sequential migrations in an exclusive transaction.

All user/provider-derived values use bound parameters or tagged prepared queries. `execAsync` is reserved for static migration SQL.

## 4. Proposed Schema V1

```sql
CREATE TABLE provider_connections (
  id TEXT PRIMARY KEY NOT NULL,
  provider_id TEXT NOT NULL CHECK (provider_id IN (
    'claude', 'codex', 'command-code', 'opencode-go', 'github-copilot', 'gemini-cli'
  )),
  account_scope TEXT NOT NULL DEFAULT 'personal'
    CHECK (account_scope IN ('personal', 'organization', 'workspace')),
  external_account_id TEXT,
  canonical_account_key TEXT NOT NULL,
  display_name TEXT,
  account_hint TEXT,
  auth_mode TEXT NOT NULL
    CHECK (auth_mode IN ('oauth-pkce', 'api-key', 'web-session', 'manual-import', 'manual')),
  credential_ref TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('disconnected', 'connected', 'expired', 'disabled', 'error')),
  connected_at TEXT,
  disconnected_at TEXT,
  last_success_at TEXT,
  last_attempt_at TEXT,
  next_allowed_refresh_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider_id, account_scope, canonical_account_key)
);

CREATE TABLE usage_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  connection_id TEXT NOT NULL REFERENCES provider_connections(id) ON DELETE CASCADE,
  fetched_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('live', 'manual')),
  provider_schema_version INTEGER NOT NULL DEFAULT 1,
  is_partial INTEGER NOT NULL DEFAULT 0 CHECK (is_partial IN (0, 1)),
  response_fingerprint TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE usage_windows (
  id TEXT PRIMARY KEY NOT NULL,
  snapshot_id TEXT NOT NULL REFERENCES usage_snapshots(id) ON DELETE CASCADE,
  external_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('rolling', 'daily', 'weekly', 'monthly', 'billing')),
  label TEXT NOT NULL,
  used_decimal TEXT,
  limit_decimal TEXT,
  remaining_decimal TEXT,
  utilization REAL CHECK (utilization IS NULL OR utilization >= 0),
  unit TEXT NOT NULL CHECK (unit IN ('percent', 'requests', 'credits', 'tokens', 'currency')),
  currency_code TEXT,
  period_starts_at TEXT,
  period_ends_at TEXT,
  resets_at TEXT,
  derivation TEXT NOT NULL CHECK (derivation IN ('provider', 'documented-rule', 'manual')),
  UNIQUE(snapshot_id, external_key)
);

CREATE TABLE refresh_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  connection_id TEXT NOT NULL REFERENCES provider_connections(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN ('startup', 'foreground', 'manual', 'retry')),
  outcome TEXT NOT NULL CHECK (outcome IN ('running', 'success', 'failure', 'cancelled', 'skipped')),
  http_status INTEGER,
  error_code TEXT,
  retry_after_at TEXT,
  request_id TEXT,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  safe_detail TEXT
);

CREATE TABLE notification_rules (
  id TEXT PRIMARY KEY NOT NULL,
  provider_id TEXT CHECK (provider_id IS NULL OR provider_id IN (
    'claude', 'codex', 'command-code', 'opencode-go', 'github-copilot', 'gemini-cli'
  )),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('threshold', 'reset-reminder')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  threshold REAL CHECK (threshold IS NULL OR (threshold > 0 AND threshold <= 1)),
  lead_minutes INTEGER CHECK (lead_minutes IS NULL OR lead_minutes >= 0),
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE scheduled_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  rule_id TEXT NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,
  connection_id TEXT REFERENCES provider_connections(id) ON DELETE CASCADE,
  window_external_key TEXT,
  native_identifier TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'delivered', 'cancelled', 'superseded')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE manual_reset_entries (
  id TEXT PRIMARY KEY NOT NULL,
  provider_id TEXT NOT NULL CHECK (provider_id IN ('claude', 'codex')),
  label TEXT NOT NULL,
  resets_at TEXT NOT NULL,
  source_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE cli_stats_imports (
  snapshot_id TEXT PRIMARY KEY NOT NULL REFERENCES usage_snapshots(id) ON DELETE CASCADE,
  cli_version TEXT,
  captured_at TEXT NOT NULL,
  coverage TEXT NOT NULL CHECK (coverage IN ('session', 'reported-quota')),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_snapshots_connection_fetched
  ON usage_snapshots(connection_id, fetched_at DESC);
CREATE INDEX idx_windows_snapshot ON usage_windows(snapshot_id);
CREATE INDEX idx_attempts_connection_started
  ON refresh_attempts(connection_id, started_at DESC);
CREATE INDEX idx_scheduled_status_time
  ON scheduled_notifications(status, scheduled_for);
```

## 5. Schema Rules

- IDs are UUIDv7 or another sortable collision-resistant ID generated locally.
- Timestamps are UTC ISO-8601 strings with millisecond precision.
- Provider identifiers are closed enums for the five-product scope. Support tier is registry-owned and deliberately not persisted.
- Quantities use canonical non-negative base-10 decimal strings (`used_decimal`, `limit_decimal`, `remaining_decimal`) and runtime decimal arithmetic, avoiding SQLite `REAL` rounding for currency and large counters. Currency values also carry an ISO currency code; currencies are never silently converted.
- Utilization is an uncapped ratio where `1` means 100%; values above `1` remain persisted for honest over-cap reporting, while only the visual bar is clamped.
- `used_decimal`, `limit_decimal`, `remaining_decimal`, and reset timestamps are nullable. Unknown is not zero; derivation requires documented decimal arithmetic with compatible units.
- `canonical_account_key` uses a stable provider/account identifier when known. Before identity resolution, only one reserved pending key per provider/scope may exist; validation replaces it transactionally to prevent duplicate null-identity rows.
- `response_fingerprint` is a non-secret hash used for deduplication; raw payload retention is off by default.
- Account hints should be minimally identifying, such as masked email or login, and removable independently.

## 6. Settings Contract

Known setting keys:

```ts
type AppSettingKey =
  | 'appearance.theme'              // system | light | dark
  | 'appearance.textScale'          // system | compact | comfortable | large
  | 'dashboard.providerOrder'       // ProviderId[]
  | 'dashboard.accountSelection'    // provider -> connectionId(s)/aggregation mode
  | 'dashboard.historyDays'         // default 90
  | 'notifications.permissionAsked'
  | 'notifications.quietHours'
  | 'privacy.diagnosticsConsent'
  | 'capabilities.lastKnownManifest';
```

Values are runtime-validated before use. Unknown keys survive migrations so older binaries do not destroy newer settings during rollback testing.

## 7. Credential Reference Design

SQLite example:

```text
credential_ref = "provider.github-copilot.connection.<uuid>.refresh-token"
```

SecureStore record:

```json
{
  "version": 1,
  "kind": "oauth",
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": "...",
  "grantedPermissions": ["provider-defined-minimum"]
}
```

Rules:

- Keep records small; SecureStore can reject large payloads.
- Use asynchronous SecureStore APIs.
- Use Android Keystore-backed SecureStore for tokens, API keys and the SQLCipher key; do not serialize WebView cookies into it.
- Optional biometric protection requires recovery for biometric enrollment changes.
- Explicit disconnect deletes the SecureStore item and applicable Android WebView cookies; verify effects on other sessions in a shared cookie store.
- Android backup excludes SecureStore ciphertext.

## 8. Migration Strategy

Migration files are immutable and sequential:

```text
src/storage/migrations/
  0001-initial-schema.ts
  0002-example-future-change.ts
```

Each migration:

1. Checks exact source version.
2. Runs in an exclusive transaction.
3. Uses only static SQL for DDL.
4. Updates `PRAGMA user_version` after successful changes.
5. Has forward migration tests from an empty database and a fixture of the previous version.
6. Never depends on generated IDs copied from another environment.

Rollback policy: app binaries do not run destructive down migrations on user devices. A failed migration leaves the prior version intact. Recovery export/reset is a deliberate user-facing action.

## 9. Snapshot Retention and Compaction

- Keep the latest successful snapshot indefinitely while a connection exists.
- Default detailed history: 90 days, configurable downward.
- Delete orphaned failed attempts after 30 days.
- Deduplicate identical provider responses by fingerprint and time bucket when safe.
- Run retention after successful writes, not on critical startup path.
- `Disconnect and delete history` cascades snapshots, attempts, and schedules, then securely deletes credentials.

## 10. Repository Interfaces

```ts
interface ConnectionRepository {
  list(): Promise<ProviderConnection[]>;
  get(id: string): Promise<ProviderConnection | null>;
  upsert(connection: ProviderConnection): Promise<void>;
  markDisconnected(id: string, at: string): Promise<void>;
  delete(id: string): Promise<void>;
}

interface UsageRepository {
  latestByConnection(): Promise<Map<string, UsageSnapshot>>;
  latestForDashboard(selection: DashboardAccountSelection): Promise<UsageSnapshot[]>;
  history(connectionId: string, range: DateRange): Promise<UsageSnapshot[]>;
  saveRefresh(result: RefreshPersistenceInput): Promise<void>;
  prune(retention: RetentionPolicy): Promise<void>;
}
```

`saveRefresh` writes attempt completion, snapshot, windows, and connection freshness atomically.

`DashboardAccountSelection` is runtime-validated and explicitly chooses one connection or an allowed provider-specific aggregation. The dashboard never silently drops a second personal/organization/workspace connection.

## 11. Database Acceptance Criteria

- Empty install migrates to latest schema exactly once.
- Every prior fixture migrates without data loss.
- Foreign keys and cascade behavior are tested.
- Interrupted migration leaves a recoverable prior database.
- Concurrent refresh writes do not interleave provider windows.
- Unknown limits remain null through persistence and rendering.
- No token, API key, cookie, auth code, or raw authorization header appears in an exported database.
- SQL injection tests demonstrate all dynamic values are bound.
- Local data deletion removes database, notifications, and SecureStore entries with a clear result report.

## 12. References

- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SQLite SQLCipher](https://docs.expo.dev/versions/latest/sdk/sqlite/#sqlcipher)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
