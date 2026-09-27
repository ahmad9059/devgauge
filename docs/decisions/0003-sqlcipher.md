# ADR 0003: SQLCipher for the local usage database

Status: accepted (Phase 4)

Date: 2026-09-28

## Context

Usage history and account metadata can reveal work patterns (DATABASE.md §2). The
database is local-only with no DevGauge account, so the only at-rest protection
is the OS sandbox plus optional application encryption.

## Decision

- Enable SQLCipher in the Android build via the `expo-sqlite` plugin
  (`useSQLCipher: true`) and store the SQLCipher key in Android Keystore-backed
  `expo-secure-store`.
- Generate a random 32-byte key (64 lowercase hex) on first run and apply it
  with `PRAGMA key` immediately after opening, before any other statement.
- Store only opaque `credential_ref` values in SQLite; tokens/keys stay in
  SecureStore.
- On key loss (for example an Android restore that restores the database without
  the Keystore key), treat the cache as unrecoverable and perform a documented
  destructive local reset: delete the database file, drop the stale key, and
  recreate a fresh database. Provider reconnection repopulates data.

## Measurements (Pixel 8 API 35 emulator, 2026-09-28)

- SQLCipher is compiled in: `PRAGMA cipher_version` = `4.7.0 community`.
- Opening + migrating the encrypted database: 6–22 ms on a cold start.
- Keyless open is rejected with `file is not a database`, proving the file is
  encrypted at rest.
- APK size: 98.0 MiB before SQLCipher → **122.3 MiB** with SQLCipher and the
  storage modules (**+24.3 MiB, ~+25%**).

## Consequences

- SQLCipher requires development/native builds; Expo Go cannot run this app.
- Key loss is unrecoverable by design; recovery is a local reset plus provider
  reconnection. The app must never silently downgrade to plaintext.
- Android backup excludes SecureStore ciphertext (expo-secure-store config
  plugin), so a restored database cannot be decrypted without its device key —
  which is exactly the reset path above.
- Encrypted-database unlock adds a small, bounded startup cost that scales with
  database size, not account count.

## Sources

- [Expo SQLite SQLCipher](https://docs.expo.dev/versions/latest/sdk/sqlite/#sqlcipher)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [SQLCipher](https://www.zetetic.net/sqlcipher/)
