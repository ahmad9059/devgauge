# ADR-0003: Database And Queue (Neon Postgres + Redis/BullMQ)

Status: Accepted

## Context
The product persists normalized usage snapshots/history and needs reliable background refreshes with at-least-once delivery, per-connection locking, and idempotency.

## Decision
- **Neon Postgres** (serverless Postgres) for relational persistence; branch-based previews and point-in-time restore support migrations and deletion drills.
- **Redis** for the BullMQ refresh queue, distributed locks, and idempotency keys.
- BullMQ for job scheduling with per-connection concurrency locks, retries with jitter, and circuit-breaker hooks.
- Worker processes never expose a public listener.

## Consequences
- History scale is bounded by the retention policy (ADR-0010); migrations are forward-only with expand/migrate/contract.
- Restores must be reconciled against the external deletion ledger (ADR-0006).
- Redis/Postgres credentials never reach provider child-process environments.