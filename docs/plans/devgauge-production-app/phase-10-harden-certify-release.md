# Phase 10 - Harden, Certify, And Release

Depends on: Phases 2-9 feature complete in staging

---

## 1. Goal

Prove that DevGauge is safe, reliable, accessible, performant, operable, and store-ready under real failure conditions. Close critical findings, exercise rollback and recovery, stage the release through internal/beta cohorts, and launch only when objective release gates pass.

## 2. Scope

### In Scope

- Security threat-model closure, external review, privacy/compliance evidence, supply-chain hardening, penetration and authorization testing.
- Load, soak, chaos, provider-failure, queue, database, restore, key-rotation, deletion, and mobile performance testing.
- Full native visual/accessibility finish gate and supported-device matrix.
- Observability dashboards, SLOs, alerts, incident/provider runbooks, status communication, on-call readiness, and support workflow.
- Production infrastructure, release signing, EAS/store builds, staged rollout, rollback, and post-launch monitoring.

### Out Of Scope

- Net-new product features, team workspaces, billing, public web application, provider mutations, widgets, or speculative metrics.
- Waiving critical/high security or data-loss findings to meet a date.

## 3. Detailed Tasks And Design

### 3.1 Threat Model And Security Verification

- Update data-flow diagrams and STRIDE-style threats for mobile session, OAuth callbacks, OpenCode key ingestion, Copilot/Codex runtimes, profile artifact storage, Claude pairing/ingest, queue jobs, push delivery, exports, and account deletion.
- Run automated SAST, dependency/container scans, SBOM policy, secret scan, infrastructure policy checks, API DAST, and mobile binary review.
- Commission an independent penetration/security review focused on broken object authorization, OAuth/account linking, replay, SSRF/redirects, command/process injection, filesystem traversal, worker escape, credential/profile exfiltration, companion minimization, and deletion gaps.
- Exercise KMS data-key rewrap, provider credential rotation, OAuth revocation, companion revocation, session revocation, and emergency provider kill switches.
- Block release on any open critical/high finding or unexplained sensitive-data telemetry sample.

### 3.2 Reliability And Failure Testing

- Load test cached reads, history, OAuth transactions, pairing, manual refresh fan-out, queue throughput, alert evaluation, and push delivery at launch estimate plus agreed safety factor.
- Soak workers with repeated process start/stop and profile restore/save to detect memory, file descriptor, subprocess, temporary-file, and queue-lock leaks.
- Inject provider 401/403/429/5xx, latency, malformed 2xx, DNS/TLS failure, schema drift, process crash, queue delay, Redis failover, database failover, object-storage outage, KMS throttling, and push outage.
- Verify last-known-good behavior, circuit breakers, no retry storms, provider isolation, user-facing incident copy, and clean recovery.
- Restore database/object artifacts into a quarantined environment, reconcile the external deletion ledger before network enablement, prove deleted subjects cannot reappear, and verify RPO/RTO plus approved-key decryption boundaries.

### 3.3 Performance And Mobile Quality

- Set measurable budgets for cold/warm startup, time to cached usage, API p95, list/chart frame time, memory, battery/network usage, mobile bundle size, and crash-free sessions.
- Profile low/mid-range Android hardware and supported iPhones on real devices; eliminate main-thread stalls and unnecessary background work.
- Validate screen skeleton geometry, image/icon loading, chart point aggregation, long histories, four providers with maximum observed windows, and rapid navigation/refresh interruption.
- Confirm no development/mock endpoints, source maps with secrets, debug menus, verbose logs, or test credentials exist in release builds.

### 3.4 Accessibility And Visual Finish Review

- Re-run the complete Reset Horizon state catalogue on iOS and Android phones plus supported tablet/expanded, split/multi-window, continuous-resize, and foldable posture classes in Dark and Light.
- Capture native simulator/emulator evidence for all required routes and material states; hardware checks cover gestures, haptics, performance, notification behavior, and system integration.
- Audit VoiceOver, TalkBack, switch/keyboard access where applicable, large text/font scale, in-app text-size choices, both themes, bold/increased contrast, reduced motion, color filters, landscape, safe areas, IME, continuous resize, hinge occlusion, and predictive/edge back.
- Conduct a task-based UX check: connect each provider, interpret nearest constraint, inspect history, create/test an alert, recover a stale/reauth state, revoke companion, disconnect, export, and delete.
- Fix all objective clipping, overlap, hidden actions, incorrect hierarchy, low contrast, touch-target, stale ambiguity, and generic-template regressions before final recapture.

### 3.5 Observability And Operations

- Dashboards: API SLI, queue latency/depth, provider success/latency/status class, contract drift, stale-user population, OAuth/pairing completion, App Server/SDK process health, push receipts, companion versions, database/Redis/object/KMS health, mobile crashes/performance.
- Alerts use symptom/SLO thresholds with runbook links and provider-aware suppression; no alerts are based on individual usage values.
- Publish internal/external provider status messaging that distinguishes DevGauge failure from provider outage/degradation.
- Exercise incident roles, credential exposure procedure, key compromise rotation, provider disable, bad mobile/companion release rollback, data deletion request, and support-bundle handling.
- Define on-call ownership and escalation before public registration opens.

### 3.6 Privacy, Legal, And Store Readiness

- Reconcile code-level data inventory with privacy policy, terms, retention/deletion statements, analytics consent, subprocess/provider disclosures, and app-store data safety/privacy forms.
- Verify operational backups expire within 14 days, pseudonymous deletion tombstones expire after 30 days, and any jurisdiction-approved legal-hold exception is isolated, authorized, and disclosed.
- Verify official provider marks and names follow current brand guidelines and do not imply endorsement.
- Prepare support URL, privacy URL, account deletion path, export path, reviewer test account/process, and provider-specific reviewer notes.
- Complete iOS privacy manifests/entitlements and Android permissions/data-safety declarations; remove unnecessary capabilities.
- Run license attribution and distribution-rights review for mobile, server, companion, provider binaries/SDKs, icons, and fonts.

### 3.7 Production Deployment And Rollout

- Promote the Phase 2 staging blueprint into a separate production account with private networks, managed database/Redis, KMS, object storage, WAF/rate limits, backups, secrets, dashboards, and least-privilege identities through reviewed infrastructure-as-code; verify no staging identity/key/data crosses the boundary.
- Use signed immutable container and companion artifacts; pin mobile runtime versions and configure EAS channels so native/runtime-incompatible changes cannot ship as unsafe OTA updates.
- Rehearse database expand/migrate/contract, service rollback, provider binary rollback, companion rollback, mobile OTA rollback, and feature/connector kill switches.
- Roll out through staff, internal devices, closed beta, percentage production cohorts, and general availability. Advance only after a defined observation window and SLO/security checks.
- Monitor launch with a named incident lead and daily provider-contract review for the first week.

## 4. Files Touched

- `infra/**`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-*.yml` (new)
- `.github/workflows/release-companion.yml`
- `apps/mobile/eas.json` (new)
- `apps/mobile/app.json`
- `apps/mobile/src/telemetry/**`
- `apps/api/src/telemetry/**`
- `apps/connector-worker/src/telemetry/**`
- `apps/claude-companion/src/telemetry/**`
- `tests/e2e/mobile/**` (new)
- `tests/e2e/api/**` (new)
- `tests/load/**` (new)
- `tests/chaos/**` (new)
- `tests/security/**` (new)
- `docs/security/threat-model.md` (new)
- `docs/security/review-findings.md` (new, sanitized)
- `docs/operations/slo.md` (new)
- `docs/operations/release-checklist.md` (new)
- `docs/operations/incident-response.md` (new)
- `docs/runbooks/**`
- `docs/privacy/**`
- `docs/legal/**` (new)
- `docs/release/**` (new)
- `DESIGN.md` (update only if the final accepted system changed)

## 5. Acceptance Criteria And QA Checklist

- [ ] All Phase 2-9 acceptance criteria are traceable to passing evidence or an explicitly rejected release candidate.
- [ ] No open critical/high security findings; independent review scope and remediation evidence are recorded.
- [ ] Cross-user authorization, OAuth replay/account-linking, process injection, path traversal, SSRF/redirect, credential logging, and companion exfiltration tests pass.
- [ ] KMS rotation, provider/companion revocation, disconnect deletion, account deletion, backup restore, and emergency kill-switch drills pass.
- [ ] A restore taken before account deletion is reconciled against the external deletion ledger and cannot serve resurrected user data or credentials.
- [ ] Backup and deletion-ledger expiration jobs meet the approved 35/90-day policy and produce non-sensitive compliance evidence.
- [ ] API availability and cached read latency meet the master plan SLO under launch load plus safety factor.
- [ ] Queue/worker soak shows no unbounded memory, subprocess, descriptor, temporary-file, lock, or duplicate-delivery growth.
- [ ] Provider failures and infrastructure failovers do not cause cross-provider loss, retry storms, or false fresh state.
- [ ] Crash-free session, startup, cached-data time, frame-time, memory, battery/network, and bundle budgets pass on real low/mid-range devices.
- [ ] Core journey E2E tests pass on supported iOS and Android versions, including background/cold-start notification routes.
- [ ] VoiceOver, TalkBack, large text, in-app text sizing, Dark/Light/System, increased contrast, reduced motion, color filters, orientation, safe areas, split/multi-window, continuous resize, foldable posture, and native back behavior pass.
- [ ] Final native screenshots contain no clipping, overlap, hidden controls, starter assets, low-contrast text, or generic KPI-card fallback.
- [ ] Compact navigation contains only Usage, Connectors, and Settings, and both stacked provider screens match the approved screen contract.
- [ ] Privacy policy, data inventory, store declarations, permissions, telemetry schema, retention, export, and deletion behavior agree.
- [ ] Provider trademarks/licenses, dependency licenses, SBOMs, signatures, and checksums pass legal/supply-chain review.
- [ ] On-call dashboards, alerts, provider status communication, incident runbooks, rollback paths, and support process are exercised.
- [ ] Staged beta meets SLOs and has no release-blocking user feedback before general availability.

## 6. Open Questions

- What launch cohort size, observation duration, and rollback thresholds are approved?
- Which external security assessor and mobile device lab will be used?
- What RPO/RTO and support response commitments will be published?
- Which subset of the already approved launch jurisdictions enters the first rollout cohort?
