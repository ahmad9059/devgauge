# ADR-0002: API Framework (Fastify + Zod + OpenAPI)

Status: Accepted

## Context
The API must validate every upstream provider payload, expose a stable client contract, and stay lightweight enough to run many instances on the Hetzner VPS.

## Decision
- Fastify 5 as the HTTP framework (typed, plugin-oriented, first-class request IDs and logging).
- Zod for all network/process boundaries in `@devgauge/contracts`.
- OpenAPI generated from the same Zod schemas (`zod-openapi`) and served by `@fastify/swagger` in non-production environments.
- Global error handler returns a single `ErrorEnvelope` with stable error codes and `requestId`.
- Security headers (helmet), CORS allowlist, 1 MB body limit, structured redacted logging, `N`/`N-1` API compatibility metadata.

## Consequences
- Contract and documentation cannot drift from runtime validation.
- Provider payload drift is detected at the boundary, not mid-application.
- Deterministic OpenAPI snapshot can be checked for drift in CI.