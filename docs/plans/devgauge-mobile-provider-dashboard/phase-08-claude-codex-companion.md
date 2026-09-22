# Phase 8 — Deliver Claude and Codex Safe Companion Flows

Depends on: Phase 5

---

## 1. Goal

Provide useful Claude and Codex experiences without claiming unsupported synchronization, collecting sessions, or implying that DevGauge can force vendor quota resets.

## 2. Scope

### In scope

- Blocked/manual provider adapters with live usage disabled.
- First-party usage/help links opened in system browser.
- Manual reset-time entry and local reset reminders.
- Codex “View usage and resets” action.
- Clear partner-API waiting states and dormant future capability boundary.

### Out of scope

- Embedded WebView login.
- Cookie/session capture or credential-file import.
- Private endpoint scraping.
- Programmatic quota reset/redemption without an approved API.

## 3. Detailed Tasks / Design

1. Implement `claude` and `codex` descriptors with `authModes: ['manual']` and `liveUsage: false`.
2. Maintain a fixed allowlist of official destinations.
3. Explain unavailable automatic sync in plain language without blaming the user.
4. Build reset timestamp form with timezone confirmation, validation, edit, and delete.
5. Schedule/cancel generic local reminders idempotently.
6. Never set connection status to connected from a browser visit.
7. Require an app update/reviewed contract—not only a remote flag—to activate future live integration.

## 4. Files Touched

- `src/providers/claude/**` (new)
- `src/providers/codex/**` (new)
- `src/components/connectors/blocked-provider-card.tsx` (new)
- `src/features/connections/manual-reset-form.tsx` (new)
- `src/services/links/provider-links.ts` (new)
- manual-flow fixtures and tests (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] No prohibited auth/session code exists.
- [ ] First-party links are fixed, allowlisted, and tested.
- [ ] Browser return does not create a connected account.
- [ ] Codex CTA cannot be read as “DevGauge resets quota.”
- [ ] Manual data is visibly labeled and removable.
- [ ] Reminder deletion cancels the native schedule.
- [ ] Partner capability cannot activate through manifest alone.

## 6. Open Questions

- Final user-facing explanation text.
- Official Claude destination current at implementation time.
- One-time versus recurring manual reset reminders; one-time is recommended.
