-- Phase 9 history, alert evaluation, preferences, and retention support.
create index if not exists usage_snapshots_history_idx
  on usage_snapshots (user_id, provider, fetched_at desc, id desc);
create unique index if not exists usage_windows_snapshot_window_unique_idx
  on usage_windows (snapshot_id, window_id);

alter table alert_rules
  add column if not exists hysteresis numeric not null default 5,
  add column if not exists critical boolean not null default false,
  add column if not exists preview_mode text not null default 'generic';

create table if not exists alert_rule_state (
  rule_id uuid not null references alert_rules (id) on delete cascade,
  connection_id uuid not null references provider_connections (id) on delete cascade,
  window_id text not null,
  cycle_key text not null,
  armed boolean not null default true,
  last_observed_value numeric,
  last_snapshot_id uuid references usage_snapshots (id) on delete set null,
  last_fired_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (rule_id, connection_id, window_id)
);

create table if not exists alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  rule_id uuid references alert_rules (id) on delete set null,
  connection_id uuid references provider_connections (id) on delete cascade,
  provider text,
  window_id text,
  kind text not null,
  severity text not null,
  title text not null,
  body text not null,
  cycle_key text not null,
  dedupe_key text not null unique,
  occurred_at timestamptz not null default now(),
  deliver_after timestamptz not null default now(),
  acknowledged_at timestamptz
);
create index if not exists alert_events_user_time_idx on alert_events (user_id, occurred_at desc);

create table if not exists usage_window_rollups_daily (
  user_id uuid not null references users (id) on delete cascade,
  connection_id uuid not null references provider_connections (id) on delete cascade,
  provider text not null,
  window_id text not null,
  label text not null,
  rollup_date date not null,
  sample_count int not null,
  min_used_percent numeric,
  max_used_percent numeric,
  last_used_percent numeric,
  last_remaining_percent numeric,
  last_used numeric,
  last_limit_value numeric,
  last_unit text,
  last_resets_at timestamptz,
  last_state text not null,
  last_source text not null,
  last_snapshot_id uuid,
  primary key (connection_id, window_id, rollup_date)
);
create index if not exists usage_rollups_history_idx
  on usage_window_rollups_daily (user_id, provider, window_id, rollup_date desc);

create table if not exists user_preferences (
  user_id uuid primary key references users (id) on delete cascade,
  analytics_enabled boolean not null default false,
  notification_preview text not null default 'generic',
  quiet_hours jsonb,
  updated_at timestamptz not null default now()
);
