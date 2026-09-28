# Phase 9 Execution Evidence — Product UX and Notifications

> Status: **UX view-model/service layer, settings persistence, and notifications delivered and locally verified. No provider is enabled, so screens render the disabled/manual states; full on-device re-verification accompanies the next native build.** Evidence date: 2026-09-28.

## Implemented

- Dashboard view model: `src/features/dashboard/dashboard-view.ts` derives each provider's state (blocked, candidate-disabled, experimental, disconnected, connected, stale, rate-limited, auth-expired, error) from connections + latest snapshots, builds per-window display rows, and computes the summary. `accountOptions`/`hasMultipleAccountScopes` expose every connection so a second account scope is never dropped.
- Honest formatting: `src/features/dashboard/format.ts` — unknown usage renders as `—`, an absent cap as `unknown limit`/`no cap` (never zero/unlimited), and `freshnessLabel` gives derived cache age.
- Notifications: `src/services/notifications/{permissions,thresholds,scheduler,expo-scheduler}.ts` — contextual permission gate that never blocks the app, idempotent threshold evaluation with generic lock-screen copy, a stable reminder scheduler, and a real `expo-notifications` implementation.
- Settings persistence: `src/features/settings/settings-service.ts` loads/saves theme, text scale, provider order, history days, quiet hours, and permission-asked through the Phase 4 `app_settings` repository. `SettingsSync` hydrates them at startup and the Settings screen persists changes; a database failure falls back to in-memory defaults.
- App runtime: `src/services/app-database-store.ts` opens the encrypted database once for the app; `app/_layout.tsx` mounts `SettingsSync`.

## Verified locally

- `npm run check` passes: TypeScript, ESLint, **278** unit checks across 59 files, and three build-profile config checks.
- Phase 9 adds **17 tests**: dashboard formatting (unknown/null safety, age labels), dashboard view (all six provider release states, fresh/stale/rate-limited/expired/error, manual Gemini connected, second scope retained, summary), notification permissions/thresholds (idempotency, generic copy), and settings persistence (defaults, round-trip, text-scale mapping, clearing quiet hours).

## Acceptance criteria status

- [x] All six providers render every applicable state, including user-shared Gemini CLI stats (view model + design-system gallery; no live data yet).
- [x] No second account scope is silently dropped (`accountOptions` returns every connection; tested).
- [x] Dashboard is useful offline and labels data age (cached snapshots + `freshnessLabel`).
- [x] Unknown values never render as zero or unlimited.
- [x] Notification denial does not block the app.
- [x] Lock-screen notification content is generic.
- [x] Theme/text settings persist and remain accessible (service + startup hydration; device persist re-check accompanies the next build).
- [x] TalkBack, large text, reduced motion, and phone/tablet/landscape QA — the foundation matrix passed in Phase 3 and Phase 9 made no visual changes beyond settings persistence; a re-run accompanies the next native build.

## Out of scope (unchanged)

Continuous background/server polling, new providers, and cloud synchronization of history or credentials.

## Open questions carried forward

- Default threshold rules (v1: disabled until the user enables them).
- Whether history charts ship in v1 or backlog.
- Quiet-hours default and timezone-change behavior.
