-- DevGauge initial schema (Phase 4).
-- Forward-only migrations; new changes are additive migrations, never edits.
-- Ownership is enforced at the repository layer plus owner-scoped indexes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_lower text not null,
  display_name text,
  locale text not null default 'en',
  timezone text not null default 'UTC',
  lifecycle_status text not null default 'active', -- active | deleting | deleted
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_idx on users (email_lower);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token_hash text not null,
  device_installation_id uuid,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create unique index if not exists sessions_token_hash_idx on sessions (token_hash);
create index if not exists sessions_user_id_idx on sessions (user_id);

create table if not exists device_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  platform text,
  app_version text,
  push_token_hash text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists device_installations_user_id_idx on device_installations (user_id);

-- ---------------------------------------------------------------------------
-- Provider connections and secrets
-- ---------------------------------------------------------------------------

create table if not exists provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  provider text not null,
  plan text,
  state text not null default 'disconnected', -- disconnected|connecting|connected|degraded|reauth_required|revoking|failed
  refresh_state text not null default 'idle', -- idle|queued|running|succeeded|transient_failed|permanent_failed|contract_failed
  adapter_version text,
  last_verified_at timestamptz,
  last_error_code text,
  last_error_message text,
  last_error_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint provider_connections_user_provider_unique unique (user_id, provider)
);

create index if not exists provider_connections_user_id_idx on provider_connections (user_id);

create table if not exists credential_envelopes (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references provider_connections (id) on delete cascade,
  credential_type text not null,
  ciphertext bytea not null,
  wrapped_data_key bytea not null,
  key_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provider_profile_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  connection_id uuid not null references provider_connections (id) on delete cascade,
  object_key text not null,
  digest text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_profile_artifacts_connection_id_idx on provider_profile_artifacts (connection_id);

create table if not exists oauth_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  provider text not null,
  state_hash text not null,
  pkce_verifier_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists oauth_transactions_state_hash_idx on oauth_transactions (state_hash);

create table if not exists companion_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  device_label text,
  credential_hash text not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists companion_devices_credential_hash_idx on companion_devices (credential_hash);

-- ---------------------------------------------------------------------------
-- Usage snapshots
-- ---------------------------------------------------------------------------

create table if not exists usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  connection_id uuid not null references provider_connections (id) on delete cascade,
  provider text not null,
  plan text,
  content_hash text not null,
  source text not null,
  adapter_version text,
  fetched_at timestamptz not null,
  captured_at timestamptz,
  stale boolean not null default false,
  response_status int,
  created_at timestamptz not null default now()
);

create index if not exists usage_snapshots_user_created_idx on usage_snapshots (user_id, created_at desc);
create index if not exists usage_snapshots_connection_id_idx on usage_snapshots (connection_id);

create table if not exists usage_windows (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references usage_snapshots (id) on delete cascade,
  window_id text not null,
  label text not null,
  used_percent numeric,
  remaining_percent numeric,
  used numeric,
  limit_value numeric,
  unit text,
  window_seconds int,
  resets_at timestamptz,
  state text not null default 'unknown'
);

create index if not exists usage_windows_snapshot_id_idx on usage_windows (snapshot_id);

create table if not exists usage_activity_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  connection_id uuid not null references provider_connections (id) on delete cascade,
  provider text not null,
  activity_date date not null,
  tokens bigint not null,
  source text,
  constraint usage_activity_daily_conn_date_unique unique (connection_id, activity_date)
);

create table if not exists latest_provider_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  connection_id uuid not null references provider_connections (id) on delete cascade,
  provider text not null,
  snapshot_id uuid not null references usage_snapshots (id) on delete cascade,
  updated_at timestamptz not null default now(),
  constraint latest_provider_usage_user_provider_unique unique (user_id, provider)
);

-- ---------------------------------------------------------------------------
-- Alerts (created now, evaluated in Phase 9)
-- ---------------------------------------------------------------------------

create table if not exists alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  provider text,
  window_id text,
  kind text not null, -- threshold|limited|reset|stale|reauth
  threshold numeric,
  enabled boolean not null default false,
  quiet_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alert_rules_user_id_idx on alert_rules (user_id);

create table if not exists alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  rule_id uuid references alert_rules (id) on delete set null,
  provider text,
  window_id text,
  cycle_key text,
  channel text not null default 'local',
  status text not null default 'pending',
  delivered_at timestamptz,
  constraint alert_deliveries_cycle_unique unique (rule_id, cycle_key)
);

-- ---------------------------------------------------------------------------
-- Audit + deletion ledger
-- ---------------------------------------------------------------------------

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete set null,
  actor text,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_user_id_idx on audit_events (user_id);
create index if not exists audit_events_created_at_idx on audit_events (created_at desc);

-- Append-only pseudonymous tombstone outside normal backups; retention job
-- purges rows older than 30 days.
create table if not exists deletion_ledger (
  id uuid primary key default gen_random_uuid(),
  subject_kind text not null, -- user | credential | connection
  subject_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create index if not exists deletion_ledger_subject_hash_idx on deletion_ledger (subject_hash);
create index if not exists deletion_ledger_expires_idx on deletion_ledger (expires_at);