# ADR-0010: Launch Jurisdictions And Data Residency

Status: Accepted

## Context
Owner sign-off locked the initial launch scope. Jurisdiction determines region, subprocessors, consent, retention, export, and deletion obligations.

## Decision
- Initial launch jurisdictions: **US and EU/EEA**.
- Region, backup location, telemetry, auth provider, object storage, and other subprocessor choices must be compatible with these jurisdictions.
- Consent/opt-out, data export, and deletion SLA behavior target GDPR-compatible behavior from day one.
- Retention: 13 months history (90-day high-resolution), encrypted backups expire within 14 days, deletion tombstones expire after 30 days. Legal holds require a separately documented, authorized exception.

## Consequences
- Phase 2 infrastructure choices are gated on this decision (ADR-0004, ADR-0005, ADR-0007).
- A future global rollout is a separate compliance phase.