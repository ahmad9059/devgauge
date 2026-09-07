# ADR-0007: Object Storage (Cloudflare R2)

Status: Accepted (revised from generic S3-compatible)

## Context
Encrypted Codex profile artifacts, exports, and future retained data need durable object storage reachable from the Hetzner VPS.

## Decision
- Use **Cloudflare R2** (S3-compatible) for object storage: free tier (10 GB, free egress), fits the MVP cost target.
- Local MinIO remains the development stand-in; production swaps to R2 with no code change (S3 API).
- Buckets are private and per-environment; staging and production never share credentials or data.
- Codex profile artifacts are stored encrypted and referenced by digest/version metadata (ADR-0006).

## Consequences
- Deletion of an object and its envelope is the source of truth for profile destruction.
- Object lifecycle policy enforces the 14-day backup / 30-day tombstone windows.