# Phase 10 — Security Hardening, QA, Privacy, and Release

Depends on: Phase 9

---

## 1. Goal

Prove the final application is secure, policy-compliant, accessible, performant, operable, and honest about every connector before beta/store release.

## 2. Scope

### In scope

- Final threat model and security review.
- OAuth, deep-link, redaction, migration, deletion, retention, and manifest tests.
- Dependency/license/supply-chain review.
- Startup, refresh, storage, and rendering performance profiling.
- Privacy policy, terms, licenses, support, store privacy/Data Safety, manifests, and reviewer notes.
- Brand/trademark asset review.
- Beta distribution, device/accessibility matrix, crash triage, and connector go/no-go.
- Provider incident/kill-switch operational runbook.

### Out of scope

- Enabling a connector that failed its release gate.
- Adding provider six or cloud account synchronization.
- Treating attempted vendor outreach as completed integration.

## 3. Detailed Tasks / Design

1. Reconcile actual code/network/SDK data flows against `SECURITY.md` and store disclosures.
2. Seed fake secrets and scan logs, SQLite, exports, crash payloads, and analytics paths.
3. Test OAuth wrong/replayed state, PKCE mismatch, wrong callback/provider, expiry, and revocation failures.
4. Test malicious deep links/notifications and capability manifest tamper/replay.
5. Migrate every historical DB fixture and exercise key-loss recovery.
6. Profile agreed startup and refresh budgets on representative devices.
7. Complete accessibility and responsive manual matrix.
8. Verify provider sources/contracts again on release date.
9. Record final per-provider status: enabled, blocked external dependency, or intentionally deferred.
10. Prepare incident rollback and user communication paths.

## 4. Files Touched

- `docs/operations/provider-incident-runbook.md` (new)
- `docs/release/privacy-data-inventory.md` (new)
- `docs/release/mobile-qa-matrix.md` (new)
- privacy policy/terms/support/licenses content (new)
- store metadata, privacy manifests, and native production config (new/update)
- final security, E2E, performance, migration, and accessibility tests (new/update)

## 5. Acceptance Criteria / QA Checklist

- [ ] Every release blocker in `SECURITY.md` is cleared or the affected connector is disabled.
- [ ] No high-confidence credential exposure remains.
- [ ] Provider contracts and permissions are current and linked.
- [ ] Experimental kill switches are owner-tested.
- [ ] Privacy/Data Safety disclosures match actual behavior.
- [ ] Brand/legal review is complete.
- [ ] Crash-free beta, performance, accessibility, and device thresholds are approved.
- [ ] Manual QA evidence exists; AI-only verification is insufficient.
- [ ] Final status distinguishes done, externally blocked, and deferred-not-verified work.

## 6. Open Questions

- App Store/Play release owner and legal reviewer.
- Beta cohort and numeric go/no thresholds.
- Approved crash-reporting SDK, if any, after privacy inventory.
