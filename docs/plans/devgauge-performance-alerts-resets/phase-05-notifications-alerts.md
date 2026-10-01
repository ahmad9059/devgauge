# Phase 5 — Deliver Working Threshold Alerts and Reset Reminders

Depends on: 3, 4

## 1. Goal

Connect existing notification building blocks to persisted settings and committed live usage. Evidence: A15–A20; thresholds.ts:41, manual-reset.ts:73, expo-scheduler.ts:13.

## 2. Scope

In scope: tasks below. Other phase responsibilities and production publishing are outside this phase.

## 3. Detailed Tasks / Design

Implement actionable settings with provider/account/window threshold presets and custom thresholds, reset lead times, quiet hours and notification permission status. Fix candidates to include providerId/window cycle identity; match only selected scopes, handle unknown utilization and persist per-rule/connection/window/cycle delivery state. Evaluate after successful snapshot commits and startup reconciliation; define behavior for enabling a rule already above threshold. Create Android notification channel before permission request where required by installed SDK; foreground handler and cold/warm tap routing with safe allowlisted route data. Add a reconciler comparing desired schedules/database/native schedules: cancel changed/deleted/disconnected windows; recover pending/failed operations without duplicate notifications. Persist denial/pending/error states rather than pretending enabled means delivered. Use provider-reported hourly/rolling/weekly/billing reset instants, not fixed recurring calendar guesses. Include next-reset timeline per provider, edit/delete manual fallback reminders, before-reset/at-reset choices, timezone changes and quiet hours. Generic lock-screen copy by default with opt-in provider/window detail. Known scheduled resets may notify while app closed; thresholds for unseen remote consumption cannot be guaranteed without a future background transport.

### Separate commit slices

- `fix(alerts): scope thresholds by provider window and cycle`
- `feat(notifications): add permission channels and tap routing`
- `feat(settings): persist actionable threshold and reset rules`
- `feat(notifications): reconcile provider reset schedules`
- `fix(reminders): recover native scheduling and permission failures`

## 4. Files Touched

app/(tabs)/settings.tsx; app/provider/[providerId].tsx; app/_layout.tsx; src/services/notifications/thresholds.ts; scheduler.ts; expo-scheduler.ts; permissions.ts; reconciler.ts (new); src/storage/repositories/notifications.ts; src/features/connections/manual-reset.ts; manual-reset-form.tsx; src/services/local-data.ts

## 5. Acceptance Criteria / QA Checklist

- [x] Provider A rule never alerts on provider B; one alert per configured cycle, new cycle can alert again.
- [ ] Permission grant/deny/revoke and Android foreground/background/killed-app delivery tested.
- [ ] Duplicate sync/startup never duplicates schedules; changed reset cancels old notification.
- [ ] Quiet hours/timezone/DST/past/unknown reset cases handled; tap opens correct provider.
- [ ] Disconnect/data deletion cancels related reminders; failures visible and retryable.

## 6. Open Questions

Use SDK-documented scheduling behavior; exact timing under Android power restrictions requires real-device evidence.
