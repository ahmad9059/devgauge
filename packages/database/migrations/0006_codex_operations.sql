-- Codex device-login, encrypted profile artifact, and reset-credit operations.
drop index if exists credential_envelopes_connection_id_idx;
create unique index if not exists credential_envelopes_connection_type_idx
  on credential_envelopes (connection_id, credential_type);

alter table provider_profile_artifacts
  add column if not exists wrapped_data_key bytea,
  add column if not exists previous_object_key text,
  add column if not exists key_version int not null default 1,
  add column if not exists artifact_version int not null default 1,
  add column if not exists size_bytes bigint not null default 0,
  add column if not exists status text not null default 'ready';

create unique index if not exists provider_profile_artifacts_connection_unique_idx
  on provider_profile_artifacts (connection_id);

alter table usage_snapshots
  add column if not exists activity_summary jsonb,
  add column if not exists provider_metadata jsonb;

create table if not exists codex_login_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  connection_id uuid not null references provider_connections (id) on delete cascade,
  status text not null default 'queued',
  login_id_hash text,
  verification_url text,
  user_code_ciphertext bytea,
  user_code_wrapped_data_key bytea,
  user_code_key_version int,
  job_id text,
  plan_type text,
  error_code text,
  expires_at timestamptz not null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint codex_login_attempt_status_check check (
    status in ('queued', 'code_ready', 'connected', 'failed', 'cancelled', 'expired')
  )
);

create index if not exists codex_login_attempts_owner_idx
  on codex_login_attempts (user_id, id);
create unique index if not exists codex_login_attempts_active_connection_idx
  on codex_login_attempts (connection_id)
  where status in ('queued', 'code_ready');

create table if not exists codex_reset_credit_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  connection_id uuid not null references provider_connections (id) on delete cascade,
  idempotency_key uuid not null,
  credit_id text,
  confirmed_at timestamptz not null,
  status text not null default 'queued',
  outcome text,
  job_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint codex_reset_credit_status_check check (status in ('queued', 'running', 'completed', 'failed')),
  constraint codex_reset_credit_outcome_check check (
    outcome is null or outcome in ('reset', 'alreadyRedeemed', 'nothingToReset', 'noCredit')
  ),
  constraint codex_reset_credit_idempotency_unique unique (connection_id, idempotency_key)
);

create index if not exists codex_reset_credit_attempts_owner_idx
  on codex_reset_credit_attempts (user_id, created_at desc);
