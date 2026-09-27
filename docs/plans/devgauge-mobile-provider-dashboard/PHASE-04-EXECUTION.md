# Phase 4 Execution Evidence — Encrypted Local Persistence

> Status: **Implemented and verified; local checks pass and SQLCipher is proven on an Android emulator.** Evidence date: 2026-09-28.

## Implemented

- Driver boundary: `src/storage/sqlite-driver.ts` defines a small async SQL surface; `src/storage/expo-driver.ts` adapts `expo-sqlite` (app) and `src/testing/storage/node-driver.ts` adapts Node's built-in `node:sqlite` (tests), so migrations and repositories run against real SQLite in CI without a device.
- Database core: `src/storage/database.ts` (opening/closing, `PRAGMA foreign_keys`/`journal_mode=WAL`/`busy_timeout`, and an exclusive-transaction mutex that serializes writes). `src/storage/app-database.ts` applies the SQLCipher key before any query and handles key-loss recovery.
- Migrations: `src/storage/migrations/0001-initial-schema.ts` (the full `DATABASE.md` §4 schema) plus `src/storage/migrations/index.ts` (sequential, immutable, transactional runner that sets `PRAGMA user_version`).
- SQLCipher key lifecycle: `src/storage/database-key.ts` (random 32-byte key, hex validation, `PRAGMA key` construction), stored through `src/storage/secret-store.ts` / `src/storage/secure-store-backend.ts` (Android Keystore-backed SecureStore).
- Credential vault: `src/storage/secure-vault.ts` (opaque `provider.<id>.connection.<id>.<suffix>` refs, versioned records, fail-closed parsing). SQLite stores only `credential_ref`.
- Repositories: `connections`, `usage` (snapshots + windows + attempts + Gemini CLI import metadata + retention), `settings` (validated known keys, unknown keys preserved), `notifications` (rules + schedules), `manual-reset`.
- Lifecycle services: `src/services/local-data.ts` (`disconnectConnection`, `deleteAllLocalData` across DB, SecureStore, and a notification-canceller boundary).
- Diagnostics: `src/services/diagnostics/export.ts` builds a redacted view (never raw tables) and scrubs credential-shaped strings and identifiers.
- Domain: `src/domain/providers.ts` is now the single canonical closed `ProviderId` registry; fixtures and storage import it.
- Dev-only tool: `app/diagnostics/storage.tsx` (gated by `diagnosticsEnabled`) runs a live storage self-test.

## Verified locally

- `npm run check` passes: TypeScript, ESLint, **111** unit checks across 22 files, and three build-profile config checks.
- Phase 4 adds **54 tests across 11 files**: migration ordering/idempotency/prior-version upgrade/rollback, pragma configuration, transaction commit/rollback/nesting/concurrency serialization, connection uniqueness + cascade + bound-parameter injection, atomic refresh writes, retained latest snapshot + retention pruning, null-preservation, settings validation and unknown-key survival, credential-ref/record validation and fail-closed vault, SQLCipher key lifecycle, sortable ids, key-loss detection, redacted diagnostics, and disconnect/delete-all.
- `npx expo install --check` reports compatible dependencies; `npx expo-doctor` remains green.

## Emulator evidence (2026-09-28)

Device: `Pixel_8_API_35`. APK `artifacts/devgauge-phase1-preview.apk`, SHA-256 `2d90a6f1129eda52ba9a517e89aba63fda7d959728bb7c7aecdb58d8e010cd26`, produced with `scripts/build-test-apk.sh` (SQLCipher enabled). The dev-only **Local storage self-test** reported:

- `PASS Open encrypted DB + migrate` — `user_version 1 · 6–22 ms`.
- `PASS SQLCipher compiled in` — `4.7.0 community`.
- `PASS Repository write/read/delete` — snapshot with one window round-tripped.
- `PASS Keyless open is rejected` — `file is not a database`.

Reinstall/restore behavior:

- **Update in place** (`adb install -r`): key and database persist; self-test passes.
- **Clean uninstall + reinstall**: app data and SecureStore are removed; a new key and fresh database are created and the self-test passes (safe recovery).
- **Backup**: `expo-secure-store` writes `android:fullBackupContent`/`dataExtractionRules` that exclude SecureStore ciphertext, so a restored database cannot be decrypted without its device key. That is the documented destructive-reset path (`src/storage/recovery.ts`), which `openAppDatabase` now performs instead of crashing.

Build-size measurement: **98.0 MiB → 122.3 MiB (+24.3 MiB, ~25%)**. See `docs/decisions/0003-sqlcipher.md`.

## Acceptance criteria status

- [x] Fresh and prior-version fixtures migrate transactionally.
- [x] Failed migration preserves the prior usable database.
- [x] SQLCipher DB cannot open without its key when enabled (emulator).
- [x] Dynamic values use bound parameters.
- [x] Seeded fake secrets never appear in DB or diagnostics export.
- [x] Concurrent connection writes do not interleave.
- [x] Disconnect/delete behavior removes expected DB, SecureStore, and notification state.
- [x] Android reinstall tested on the emulator (update + clean); backup excludes SecureStore and key-loss recovery is implemented and unit-tested. Cross-device restore on physical hardware remains for owner QA.

## Out of scope (unchanged)

Provider network calls, cloud/account sync, and background polling. No production connector uses the repositories yet; Phase 5 wires the refresh engine.

## Open questions carried forward

- Whether an optional biometric lock ships in v1 or later.
- Whether settings persistence surfaces theme/text-scale preferences through the existing `ThemeProvider` in Phase 9.
