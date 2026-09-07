-- Magic-link one-time codes for self-hosted email sign-in.
create table if not exists magic_link_codes (
  id uuid primary key default gen_random_uuid(),
  email_lower text not null,
  code_hash text not null,
  user_id uuid references users (id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists magic_link_codes_email_created_idx on magic_link_codes (email_lower, created_at desc);