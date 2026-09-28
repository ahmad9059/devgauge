# Phase 8 Execution Evidence — Claude/Codex Sessions and Gemini CLI Connector

> Status: **Manual/blocked experiences, Gemini CLI user-shared import, reminder scheduling, and the dormant partner boundary delivered and tested. No live sync is enabled because the Phase 1 Android web-session tests are still pending and no DevGauge-owned Gemini CLI quota contract exists.** Evidence date: 2026-09-28.

## Product gate (unchanged)

No signed-in Android web-session test has passed for Claude, Codex, or GitHub, and Google has not provided an approved account-quota source for Gemini CLI. DevGauge therefore ships **manual/blocked** experiences and keeps every live path disabled. This is the plan's permitted outcome; the Gemini CLI card never uses Gemini Apps chat limits.

## Implemented

- Allowlisted links: `src/services/links/provider-links.ts` — a fixed set of https first-party destinations with `isAllowlistedLink`/`requireProviderLink`. No user- or provider-controlled URL is ever opened.
- Manual/blocked adapters: `src/providers/claude/adapter.ts`, `src/providers/codex/adapter.ts`, `src/providers/gemini-cli/adapter.ts` — `supportTier: blocked`, `liveUsage: false`, `authModes: ['manual']`, no `fetchUsage`.
- Gemini CLI user-shared import: `src/providers/gemini-cli/{schema,normalize,import}.ts` — validates a sanitized `/stats model` shape with required `coverage` and `capturedAt`, persists it as a **manual** snapshot (`isPartial` for session coverage) with `cli_stats_imports` metadata, and never infers account-wide quota.
- Manual reset reminders: `src/features/connections/manual-reset.ts` + `src/services/notifications/scheduler.ts` — future-time validation with explicit timezone confirmation, idempotent scheduling via a stable native identifier, and deletion that cancels the schedule.
- Dormant partner boundary: `src/services/capabilities/partner.ts` — activation requires a reviewed contract **and** a supporting app version; a manifest flag alone can never enable it.
- Web-session policy: `src/services/web-session/policy.ts` — per-provider gates, all false, so no web-session adapter is created.
- Copy and UI: `src/features/connections/manual-flows.ts` (`View usage and resets`, plain-language explanations, `User-provided` label), `src/components/connectors/blocked-provider-card.tsx`, and `src/features/connections/manual-reset-form.tsx`.
- Storage: `saveManualImport` in the usage repository persists a manual snapshot, its windows, and CLI coverage metadata atomically.

## Verified locally

- `npm run check` passes: TypeScript, ESLint, **261** unit checks across 55 files, and three build-profile config checks.
- Phase 8 adds **25 tests**: link allowlisting, web-session gates, partner activation, reminder scheduler idempotency, manual-reset validation/save/delete, manual flow copy (Codex CTA), and Gemini CLI import (manual/partial labeling, reported quota, malformed input), plus the blocked-adapter invariants.

## Acceptance criteria status

- [x] Enabled embedded flows pass Android checks. **Not applicable** — no web-session flow is enabled.
- [x] Gemini CLI card uses CLI/Code Assist quota semantics only; no Gemini Apps chat limits appear.
- [x] Live sync requires an approved DevGauge-owned authorization/quota contract; imported `/stats model` is user-shared, timestamped, and not presented as account-wide live usage.
- [x] First-party links are fixed, allowlisted, and tested.
- [x] Browser return does not create a connected account (opening a page never changes state).
- [x] Codex CTA cannot be read as "DevGauge resets quota".
- [x] Manual data is visibly labeled and removable.
- [x] Reminder deletion cancels the native schedule.
- [x] Partner capability cannot activate through manifest alone.

## Out of scope (unchanged)

Password/form interception, credential-file import, off-device cookie transfer, private endpoint scraping, and programmatic quota reset without an approved API.

## Open questions carried forward

- Final user-facing explanation wording and the current official Claude destination.
- One-time vs recurring manual reset reminders (v1 uses one-time).
- Whether Google will offer a DevGauge-owned Gemini CLI quota contract.
