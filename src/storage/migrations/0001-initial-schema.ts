import type { Migration } from './types';

// Schema v1. Immutable: never edit after release; add a new migration instead.
// Mirrors DATABASE.md §4. All DDL is static text executed via `exec`.
export const migration0001: Migration = {
  version: 1,
  name: 'initial-schema',
  sql: `
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
`,
};
