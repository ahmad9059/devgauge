# ADR-0004: Hosting And Deployment (Fly.io + Neon + Managed Redis)

Status: Accepted

## Context
Connector workers need long-running subprocesses (Codex App Server, Copilot SDK/CLI runtime), which rules out short-lived serverless functions. Owner sign-off locked the hosting direction during Phase 1.

## Decision
- **Fly.io** for the API and connector workers (containers, private networking, per-region deploys).
- **Neon Postgres** for the database (ADR-0003).
- **Managed Redis** compatible with BullMQ (final vendor recorded in Phase 2 infra).
- Separate staging and production accounts/networks with no credential or data crossover.
- Region/subprocessor choices are locked to the approved launch jurisdictions (ADR-0010).

## Consequences
- Containers must be reproducible and signed (CI builds + scans).
- Codex/Copilot child processes run inside the worker sandbox (see connector-worker `sandbox.ts`).
- Rollback is container-image and database-migration based, rehearsed in Phase 10.