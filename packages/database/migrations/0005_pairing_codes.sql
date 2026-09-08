-- Short-lived, single-use companion pairing codes (hashed, never stored plaintext).
create table if not exists pairing_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists pairing_codes_code_hash_idx on pairing_codes (code_hash);