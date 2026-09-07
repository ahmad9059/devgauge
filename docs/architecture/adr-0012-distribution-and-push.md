# ADR-0012: Distribution And Push (F-Droid + Play, No Google Play Services)

Status: Accepted

## Context
F-Droid builds run on de-Googled devices where Google Play Services (and therefore FCM push) is unavailable. Open-source distribution also favours self-hostable, tracker-free components.

## Decision
- **Stores:** Google Play first, then **F-Droid**. Reproducible/source builds where practical; no proprietary trackers or crash SDKs in the F-Droid build.
- **Push:** default notifications are **local** — the Android app refreshes via WorkManager and evaluates alert thresholds from its cached data, showing notifications through `NotificationManager`. No FCM dependency in the F-Droid variant.
- **Optional real push:** **UnifiedPush** via a user-provided distributor (e.g., ntfy) so users who want server-originated alerts get them without Google services.
- **Server push (future):** if a server-side alert evaluator is added, it dispatches through ntfy/UnifiedPush or WorkManager polling — never FCM-only.

## Consequences
- Alert delivery works on fully de-Googled devices.
- Notification permission is requested contextually; denied permission still falls back to in-app alert badges.
- Store privacy declarations reflect local-first notification behavior.