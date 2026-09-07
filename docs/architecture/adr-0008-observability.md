# ADR-0008: Observability (Structured Logs + OpenTelemetry)

Status: Accepted

## Context
Reliability work needs correlation IDs, provider-contract drift visibility, and redaction guarantees across logs, traces, and metrics.

## Decision
- pino structured logging with serialization-time redaction (`LOG_REDACT_PATHS`).
- Every request/job carries a correlation ID propagated through API and worker.
- OpenTelemetry-compatible export planned for metrics/traces in Phase 10; dashboards surface API SLI, queue latency/depth, provider status class, contract drift, and process health — never individual usage values.

## Consequences
- Log/analytics/crash redaction is enforced at the serializer boundary and proven by canary-secret tests.
- Operational alerts are symptom/SLO based, not per-user.