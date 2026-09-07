# ADR-0004: Hosting And Deployment (Hetzner VPS + Neon + Upstash + Cloudflare R2)

Status: Accepted (revised from Fly.io)

## Context
Connector workers need long-running subprocesses (Codex App Server, Copilot SDK/CLI runtime), which rules out short-lived serverless functions. The owner already owns a **Hetzner VPS (2 vCPU / 4 GB)** and wants to avoid additional hosting spend. Fly.io is therefore replaced.

## Decision
- **Hetzner VPS (2 vCPU / 4 GB, owned)** runs the Fastify API, the BullMQ connector worker (Codex/Copilot runtimes), and a lightweight reverse proxy. All services run as containers (Docker Compose) on a single box.
- **Neon Postgres** for the database (ADR-0003) — not self-hosted, to keep managed branches/PITR.
- **Upstash Redis** for the queue/locks (ADR-0003) — not self-hosted.
- **Cloudflare R2** for object storage: encrypted Codex profile artifacts and exports (ADR-0007).
- **Domain:** `devgauge.devshub.xyz` now; own domain later.
- **Exposure:** reverse proxy with Let's Encrypt TLS, or a Cloudflare Tunnel so the VPS exposes **no public inbound ports** at all. SSH key-only access; `ufw`; unattended security updates.
- **Disposable host:** the VPS is stateless cattle. Database lives on Neon, files on R2, so a failed box is recovered by re-provisioning and redeploying containers.
- **Region:** Hetzner EU datacenter satisfies the EU/EEA residency portion of ADR-0010.

## Consequences
- Only already-owned/paid compute; new recurring spend is ~$0 beyond domain/store fees.
- Credentials (encrypted at rest) live on the VPS; hardening is a Phase 10 deliverable.
- Rollback is container-image and database-migration based, rehearsed in Phase 10.