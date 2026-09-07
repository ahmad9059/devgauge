# ADR-0007: Object Storage (S3-Compatible)

Status: Accepted

## Context
Codex profile artifacts and future exported/retained data need durable, encrypted object storage reachable from Fly.io workers.

## Decision
- Use S3-compatible object storage (local MinIO for development; the production provider is selected under ADR-0010's residency constraints).
- Buckets are private and per-environment; staging and production never share credentials or data.
- Codex profile artifacts are stored encrypted and referenced by digest/version metadata (ADR-0006).

## Consequences
- Deletion of an object and its envelope is the source of truth for profile destruction.
- Object lifecycle policy enforces the 14-day backup / 30-day tombstone windows.