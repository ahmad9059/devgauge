# Phase 9 — Complete Product UX and Notifications

Depends on: Phases 3-8; vendor approval is not required for disabled connector shells

---

## 1. Goal

Integrate all provider states into the complete Usage, Connectors, and Settings experience, including honest freshness, offline behavior, appearance controls, notifications, privacy, and deletion.

## 2. Scope

### In scope

- Dashboard summary, ordering, account selection, provider cards, refresh, and detail views.
- Connector grouping by available/candidate/experimental/blocked status.
- Theme, text scale, notifications, privacy, support, diagnostics, and data controls.
- Foreground-evaluated threshold notifications and locally scheduled reset reminders.
- Loading, empty, stale, partial, offline, auth-expired, rate-limited, disabled, and error states.
- Accessibility and responsive polish using foundation components.

### Out of scope

- Continuous background/server polling.
- New providers.
- Cloud synchronization of history or credentials.

## 3. Detailed Tasks / Design

1. Render cached snapshots immediately and layer live refresh state without clearing good data.
2. Require explicit account selection when a provider has multiple connections.
3. Show persisted source plus derived cached/stale age.
4. Present only provider windows/units that actually exist.
5. Request notification permission contextually after enabling a rule.
6. Evaluate utilization thresholds after startup/foreground/manual refresh only.
7. Schedule reset reminders from provider/manual timestamps with quiet-hour handling.
8. Implement disconnect, delete provider data, clear cache, and delete-all confirmations.
9. Provide redacted diagnostics preview before share.

## 4. Files Touched

- `src/features/dashboard/**` (new/update)
- `src/components/usage/**` (new/update)
- `src/components/connectors/**` (new/update)
- `src/components/settings/**` (new)
- `src/services/notifications/**` (new)
- `app/(tabs)/**`, provider detail, connect, legal, and diagnostics routes (update)
- component/accessibility/E2E tests (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] All five providers render every applicable state.
- [ ] No second account scope is silently dropped.
- [ ] Dashboard is useful offline and labels data age.
- [ ] Unknown values never render as zero or unlimited.
- [ ] Notification denial does not block the app.
- [ ] Lock-screen notification content is generic.
- [ ] Theme/text settings persist and remain accessible.
- [ ] VoiceOver/TalkBack, large text, reduced motion, phone/tablet, and landscape QA pass.

## 6. Open Questions

- Default threshold rules; recommended default is disabled.
- Whether history charts are v1 or backlog.
- Quiet-hours default and timezone-change behavior.
