# Phase 8 — Deliver Claude/Codex Sessions and Gemini CLI Connector

Depends on: Phase 5

---

## 1. Goal

Implement local website-session experiences for Claude and Codex where the Phase 1 Android spike passes. Separately implement Gemini CLI quota tracking only if DevGauge can access an approved account quota source; otherwise provide an explicitly user-shared CLI stats/manual companion flow.

**Product gate:** The comparator documents local Claude WebView sessions and advertises Codex/Gemini tracking, but does not establish Gemini **CLI** integration. Validate Claude/Codex embedded flows on Android. Gemini CLI uses its own Google-account, API-key, Workspace or Vertex auth and distinct quotas; do not map consumer Gemini Apps data to it or reuse Gemini CLI's private credentials/client ID.

## 2. Scope

### In scope

- WebView-backed local-session adapters for providers passing Phase 1; blocked/manual adapters for those that do not.
- Gemini CLI: investigate DevGauge-owned registered OAuth and an authorized account quota source; if available, expose provider-native model/request quotas with the correct auth tier. Otherwise support user-provided `/stats model` figures, clearly labeled as CLI/session-derived and potentially incomplete/stale.
- First-party usage/help links opened in system browser.
- Manual reset-time entry and local reset reminders.
- Codex “View usage and resets” action.
- Clear partner-API waiting states and dormant future capability boundary.

### Out of scope

- Password/form-input interception or credential-file import.
- Off-device cookie transfer or cross-provider session reuse.
- Private endpoint scraping.
- Programmatic quota reset/redemption without an approved API.

## 3. Detailed Tasks / Design

1. Implement per-provider WebView descriptors only after Phase 1 validates Android login, session persistence, usage access and reviewed policy; retain `authModes: ['manual']` and `liveUsage: false` for failed/unverified providers.
1a. For Gemini CLI, test whether DevGauge can register its own Google OAuth client and use an authorized documented quota API for Code Assist/Gemini CLI. If not, test a user-initiated sanitized `/stats model` share/import format; label its coverage and timestamp and never infer whole-account remaining quota from one session. Do not copy Gemini CLI tokens from desktop, use its client ID, or equate Gemini Apps limits with Gemini CLI quotas.
2. Maintain a fixed allowlist of official destinations.
3. Explain unavailable automatic sync in plain language without blaming the user.
4. Build reset timestamp form with timezone confirmation, validation, edit, and delete.
5. Schedule/cancel generic local reminders idempotently.
6. Set connected only after validating signed-in usage access, not merely from visiting a page.
7. Require an app update/reviewed contract—not only a remote flag—to activate future live integration.

## 4. Files Touched

- `src/providers/claude/**` (new)
- `src/providers/codex/**` (new)
- `src/providers/gemini-cli/**` (new)
- `src/services/web-session/**` (new; only for Phase 1 validated providers)
- `src/components/connectors/blocked-provider-card.tsx` (new)
- `src/features/connections/manual-reset-form.tsx` (new)
- `src/services/links/provider-links.ts` (new)
- manual-flow fixtures and tests (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] Enabled embedded flows pass Android login, persistence, expiry, logout, host allowlist and data-minimization checks.
- [ ] Gemini CLI card uses CLI/Code Assist quota semantics only; no Gemini Apps chat limits appear.
- [ ] Live sync requires an approved DevGauge-owned authorization and quota contract; imported `/stats model` is user-shared, timestamped and not presented as account-wide live usage.
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
- Whether Google offers DevGauge-owned account quota access for Gemini CLI; the CLI's own `/stats model` alone does not prove a phone-sync API.
- Confirm whether explicit user-shared `/stats model` output has a stable, sanitizable export shape or needs a manual-entry screen; never retain raw CLI transcript output.
