# ADR-0006: Credential Encryption And Deletion (Envelope Encryption + Ledger)

Status: Accepted

## Context
Provider credentials (OpenCode API key, GitHub tokens, Codex profiles, companion device credentials) must be encrypted at rest, rotatable, and irrecoverably deleted on disconnect/account deletion.

## Decision
- KMS envelope encryption: a per-credential/per-profile data key, wrapped by a KMS master key; only ciphertext is persisted.
- Decryption happens only inside the connector job scope; plaintext is zeroed and temporary files removed in `finally` cleanup.
- Data-key rewrap supports rotation without exposing plaintext to operators.
- **Deletion ledger:** an append-only, pseudonymous tombstone stored outside restorable application backups prevents a restored backup from resurrecting deleted subjects. Backups expire within 14 days; tombstones expire after 30 days.
- Provider child processes never receive API/database/Redis/KMS credentials (scrubbed env).

## Consequences
- Every restore is quarantined and reconciled against the deletion ledger before serving traffic.
- Disconnect/account deletion destroys ciphertext, profile artifacts, caches, and jobs, then writes a non-secret audit event.