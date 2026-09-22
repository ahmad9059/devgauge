# Phase 4 — Implement Encrypted Local Persistence

Depends on: Phase 2; may run in parallel with Phase 3

---

## 1. Goal

Create migration-safe local persistence with strict separation between ordinary application data and provider credentials.

## 2. Scope

### In scope

- Expo SQLite database initialization and forward-only migrations.
- SQLCipher go/no-go spike and key lifecycle.
- SecureStore credential vault.
- Connection, usage, refresh, settings, manual-reset, and notification repositories.
- Retention, redacted diagnostics export, and complete local deletion.

### Out of scope

- Provider network calls.
- Cloud database or account sync.
- Background usage polling.

## 3. Detailed Tasks / Design

1. Implement the schema in `DATABASE.md`, including canonical account keys and decimal-string quantities.
2. Apply SQLCipher key before any query when enabled; configure WAL, foreign keys, and busy timeout.
3. Run immutable sequential migrations inside exclusive transactions.
4. Store only opaque `credential_ref` values in SQLite; keep token/key records in SecureStore.
5. Implement connection-scoped latest/history queries and explicit dashboard account selection.
6. Add 90-day default history retention and preserve the latest successful snapshot.
7. Implement disconnect/delete-all across DB, SecureStore, and scheduled notifications.
8. Ensure diagnostics exports redact identifiers and never expose secrets.

## 4. Files Touched

- `src/storage/database.ts` (new)
- `src/storage/migrations/0001-initial-schema.ts` (new)
- `src/storage/repositories/*.ts` (new)
- `src/storage/secure-vault.ts` (new)
- `src/services/diagnostics/export.ts` (new)
- migration/database/security fixtures and tests (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] Fresh and prior-version fixtures migrate transactionally.
- [ ] Failed migration preserves the prior usable database.
- [ ] SQLCipher DB cannot open without its key when enabled.
- [ ] Dynamic values use bound parameters.
- [ ] Seeded fake secrets never appear in DB or diagnostics export.
- [ ] Concurrent connection writes do not interleave.
- [ ] Disconnect/delete behavior removes expected DB, SecureStore, and notification state.
- [ ] iOS reinstall and Android backup behaviors are manually tested.

## 6. Open Questions

- SQLCipher approval after build-size/startup measurements.
- Biometric lock in v1 versus post-v1.
- Final history retention default.
