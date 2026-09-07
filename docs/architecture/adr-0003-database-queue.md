# ADR-0003: Database And Queue (Neon Postgres + Upstash Redis + BullMQ)

Status: Accepted (revised)

## Context
The product persists normalized usage snapshots/history and needs reliable background refreshes with at-least-once delivery, per-connection locking, and idempotency. Owner locked Neon for the database and Upstash for the queue Redis.

## Decision
- **Neon Postgres** (serverless Postgres) for relational persistence; branch-based previews and point-in-time restore support migrations and deletion drills. Free tier for MVP.
- **Upstash Redis** for the BullMQ refresh queue, distributed locks, and idempotency keys (serverless, free tier; no Redis to run/operate).
- **BullMQ** for job scheduling with per-connection concurrency locks, retries with jitter, and circuit-breaker hooks. The worker process runs on the Hetzner VPS (ADR-0004) and never exposes a public listener.
- **Upstash QStash** (optional) as the serverless scheduler/cron for refresh dispatch and alert evaluation, in addition to the worker loop.

## Consequences
- History scale is bounded by the retention policy (ADR-0010); migrations are forward-only with expand/migrate/contract.
- Restores must be reconciled against the external deletion ledger (ADR-0006).
- Postgres/Redis credentials never reach provider child-process environments (sandbox scrubbed env).
- No self-managed Redis or queue infra is required — one less service to operate on the VPS.