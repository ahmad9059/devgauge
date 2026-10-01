# Phase 8 — Verify Final App and Report Evidence

Depends on: 2–7

## 1. Goal

Prove performance, delivery and reversibility on the final artifacts; identify external blockers honestly.

## 2. Scope

In scope: tasks below. Other phase responsibilities and production publishing are outside this phase.

## 3. Detailed Tasks / Design

Run typecheck/lint/test/config/format and installed Expo dependency compatibility checks; audit production dependencies with current advisory data. Fix lint warnings separately. Rebuild compact phone APK, emulator artifact and production AAB when package/signing inputs are available; do not publish. Re-run the same Phase 1 device/network trials, report p50/p95/size/RAM deltas and target misses. Execute notification thresholds/cycles/tap/permissions/quiet-hours/restart/deletion matrix and provider-reset eligibility/confirmation/idempotency/account tests. Test SQLCipher persistence/recovery after shrinking and forward migration with existing data. Check auth-expired/offline/rate-limit/schema/stale/partial states and local-data cleanup. Make meaningful new regressions for discovered defects, not tests that merely mirror implementation. Write QA-REPORT.md and COMPLETION-REPORT.md with phase status, commit hashes, measurement tables, remaining external checks, and undo instructions/dependency order. Reverting migrations or consumed account reset credits requires separate handling; never promise code revert undoes external actions.

### Separate commit slices

- `chore(quality): resolve baseline lint warnings`
- `test(app): cover integrated sync notifications and reset regressions`
- `docs(qa): record final device performance and delivery results`
- `docs(release): publish completion and commit undo map`

## 4. Files Touched

Existing relevant tests; docs/release/mobile-qa-matrix.md; docs/plans/devgauge-performance-alerts-resets/QA-REPORT.md (new); COMPLETION-REPORT.md (new); EXECUTION-LOG.md (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] All code gates pass; final artifact tested on phone and emulator including accessibility.
- [ ] Size/sync measurements reproducible with commit/device/network/architecture/sample count recorded.
- [ ] Each concern has separate scoped commit; report exact hashes and safe reverse-dependency undo order.
- [ ] Unverified live reset transport/device QA clearly marked blocked or not run; no synthetic pass.

## 6. Open Questions

Access to signed-in eligible accounts, physical phone, production package and signing is external. Complete available work and list missing evidence precisely.
