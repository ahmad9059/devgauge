# Phase 9 - Complete History, Alerts, And Product Experience

Depends on: Phases 5-8 provider connectors; Phase 3 design system; Phase 4 usage core

---

## 1. Goal

Unify four working connectors into a coherent daily-use product: fast current capacity, honest freshness, history and provider-specific activity, server-evaluated alerts, push deep links, polished connection management, offline recovery, diagnostics, privacy controls, and all non-happy states.

## 2. Scope

### In Scope

- Final Usage, Connectors, Settings, provider-detail/history, connection setup, devices, privacy, and diagnostics behavior.
- Historical query/rollup pipeline, accessible trends, reset events, provider-specific metric sections, and data export/delete.
- Threshold, limited, reset, stale, and reauthentication alerts with quiet hours, dedupe, test notification, and deep links.
- Push token lifecycle, delivery receipts, foreground behavior, offline cache, background/foreground freshness coordination, localization readiness, and product analytics with privacy constraints.

### Out Of Scope

- Team sharing, aggregate organization billing, social features, leaderboards, usage predictions, AI recommendations, or gamified streak pressure.
- Mobile-scheduled provider polling as a reliability dependency.
- Unsupported metrics inferred from provider percentages.

## 3. Detailed Tasks And Design

### 3.1 Usage Read Model

- Build `GET /v1/usage` from `latest_provider_usage` so response latency does not depend on live provider calls.
- Include response revision, server time, provider connection/health, latest good snapshot, current refresh status/error, source, and freshness policy.
- Foreground manual refresh enqueues only stale/eligible connections, coalesces duplicate requests, returns job status, and updates via bounded polling/revalidation.
- Use server-provided time offset for countdown accuracy; freeze/reset countdowns cleanly as reset passes and await the next confirmed provider snapshot.
- Preserve stable user order and derive an attention strip from the nearest limited/high-usage/stale event without hiding normal providers.

### 3.2 Historical Data

- Query by provider, window ID, and time range with cursor pagination and explicit sampling resolution.
- Keep high-resolution samples for 90 days and daily min/max/last rollups through month 13; document deletion boundary.
- Represent reset discontinuities and missing/stale intervals explicitly rather than drawing a continuous misleading line.
- Show line/area trends only for sufficient points, direct labels, exact tap values, event markers, a text insight, and an accessible list/table alternative.
- Export normalized data as CSV/JSON with provider/source/schema/time-zone metadata and no credentials/raw provider payloads.

### 3.3 Alert Engine

- Rules: consumed threshold crossed, remaining threshold crossed, provider limited, reset approaching, reset observed, data stale, reauthentication required, and companion outdated/offline.
- Use threshold hysteresis and reset-cycle keys so a 90% rule fires once per provider/window cycle unless the user explicitly resets it.
- Evaluate alerts server-side after committed snapshots; notification delivery is an idempotent job with retry and receipt reconciliation.
- Default alert templates avoid exposing account/plan details on lock screens; users can choose generic or detailed previews.
- Quiet hours use the user's IANA time zone, handle DST, and permit critical connection alerts to be independently enabled.

### 3.4 Push Notifications

- Request notification permission only after explaining value and after the user creates/enables an alert, not on first launch.
- Register Android channels before token retrieval; store project-bound push tokens per installation, rotate on change, and remove dead tokens from receipts.
- Notification data contains an allowlisted internal route and entity IDs; route validation prevents arbitrary deep links.
- Cold-start and foreground notification responses route to the exact provider/window/alert detail and preserve auth gating.
- Provide test notification, denied-permission guidance, quiet-hours preview, and per-provider controls.

### 3.5 Complete Mobile Routes

- **Usage tab:** exactly four stacked provider stages in the established Claude/Codex/OpenCode/Copilot order, modern graphs, current windows, refresh progress, partial failure, and disconnected entry to Connectors.
- **Connectors tab:** exactly four matching provider stages with connection method/status, connect/continue/reconnect action, last verification, setup entry, Claude companion-device management, and secondary disconnect management.
- **Settings tab:** System/Dark/Light, bounded app text-size control, notification/alert settings, quiet hours, app sessions, data retention/export/delete, security, legal/privacy, support, diagnostics, runtime versions, and a secondary link to Claude companion management.
- **Provider detail/history:** every available current value, activity/history range selection, chart plus accessible records, reset/stale annotations, export, provenance/freshness, connection health, refresh, reconnect, and disconnect.
- **Alert settings/detail:** rule list, creation/edit flow, quiet hours, preview/test, delivery history, disabled/permission states; this is nested under Settings/Notifications and never becomes a fourth tab.
- **Diagnostics:** redacted request/correlation IDs, last status classes, freshness, adapter versions, companion health, and exportable support bundle with a preview.

### 3.6 Offline And Background Behavior

- Load user-partitioned cached normalized data instantly and label its age; foreground revalidation never blanks it.
- Use network awareness to suppress doomed refresh requests and offer a deliberate retry when connectivity returns.
- Server jobs remain authoritative for provider polling and alerts. Expo background tasks may refresh DevGauge's own cache opportunistically but cannot be required for correctness because OS scheduling is delayed/restricted.
- Persist registered task configuration safely, handle iOS expiration, and test Android terminated-app behavior where supported.

### 3.7 Product Analytics And Privacy

- Track coarse events such as connection step completion/error category, screen performance, alert creation/delivery/open, and refresh outcome.
- Never record provider usage values, plan/account identifiers, API keys/tokens/codes, companion input, file/repository data, or full error bodies in product analytics.
- Provide analytics consent/opt-out appropriate to the selected jurisdictions and ensure disabling analytics does not disable operational security logs.

### 3.8 Accessibility And Localization Readiness

- Format dates, durations, numbers, and pluralization through locale-aware utilities; externalize all user-facing strings.
- Announce refresh/status changes as complete contextual phrases without moving focus.
- Charts have equivalent records and summaries; colors, line styles, labels, icons, and text jointly communicate state.
- Validate right-to-left mirroring readiness, long translated strings, 24-hour time, non-Latin numerals where platform-supported, and time-zone/DST behavior.

## 4. Files Touched

- `apps/api/src/routes/usage.ts`
- `apps/api/src/routes/history.ts` (new)
- `apps/api/src/routes/alerts.ts` (new)
- `apps/api/src/routes/devices.ts` (new)
- `apps/api/src/routes/data-rights.ts` (new)
- `apps/api/src/services/history-service.ts` (new)
- `apps/api/src/services/alert-service.ts` (new)
- `apps/connector-worker/src/jobs/evaluate-alerts.ts` (new)
- `apps/connector-worker/src/jobs/send-push.ts` (new)
- `apps/connector-worker/src/jobs/rollup-retention.ts` (new)
- `apps/mobile/app/(tabs)/usage.tsx`
- `apps/mobile/app/(tabs)/connectors.tsx`
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/app/provider/[providerId].tsx`
- `apps/mobile/app/alert/**` (new)
- `apps/mobile/app/settings/**` (new)
- `apps/mobile/src/features/history/**` (new)
- `apps/mobile/src/features/alerts/**` (new)
- `apps/mobile/src/features/notifications/**` (new)
- `apps/mobile/src/features/diagnostics/**` (new)
- `apps/mobile/src/localization/**` (new)
- `packages/contracts/src/alerts.ts` (new)
- `packages/contracts/src/history.ts` (new)
- `packages/ui/src/components/charts/**` (new)
- `docs/privacy/data-inventory.md` (new)

## 5. Acceptance Criteria And QA Checklist

- [ ] Cached all-provider usage API meets the p95 latency target under agreed launch load.
- [ ] Compact navigation exposes exactly Usage, Connectors, and Settings; history and alerts remain nested routes.
- [ ] Usage and Connectors render all four provider stages in the shared stable order, including disconnected/degraded states.
- [ ] System/Dark/Light and app text-size settings persist, follow OS accessibility scaling, and preserve graph/status contrast.
- [ ] A provider outage affects only that provider's health; all last-known-good and unaffected provider values remain visible.
- [ ] History preserves unknown window IDs, reset discontinuities, missing intervals, source, and correct sampling labels.
- [ ] Charts and accessible record alternatives communicate the same values and trend without color-only distinctions.
- [ ] Threshold rules fire once per reset cycle, honor hysteresis/quiet hours/DST, and do not duplicate under job retries.
- [ ] Notification permission is contextual; denial has a recovery path; dead tokens are removed from delivery receipts.
- [ ] Notification taps work from foreground, background, and cold start and cannot navigate to arbitrary routes.
- [ ] Lock-screen previews follow the selected privacy level and never contain secrets or raw usage payloads.
- [ ] Offline launch, slow network, reconnect, app resume, expired session, partial refresh, provider kill switch, and companion offline states pass.
- [ ] Export/delete flows contain only the documented user data and complete within the published policy.
- [ ] Product analytics schema rejects provider values and sensitive fields by construction.
- [ ] All strings are externalized; long text, RTL readiness, locale numbers/time, and DST tests pass.
- [ ] VoiceOver/TalkBack, largest text, reduced motion, increased contrast, keyboard/IME, phone/tablet, and landscape checks pass for every core journey.

## 6. Open Questions

- Which launch languages beyond the source language are required for V1?
- Which alert thresholds should be offered as opt-in presets without creating notification fatigue?
- Should detailed lock-screen usage values default off for privacy?
- Is normalized history retained after provider disconnect, or only until the user chooses delete history?
