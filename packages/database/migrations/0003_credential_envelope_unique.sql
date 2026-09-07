-- Enforce one credential envelope per connection (used by upsert on conflict).
create unique index if not exists credential_envelopes_connection_id_idx
  on credential_envelopes (connection_id);