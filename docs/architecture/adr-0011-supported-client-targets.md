# ADR-0011: Supported Client Targets

Status: Accepted (revised: Android-only)

## Context
The product is now Android-only and open source. Distribution is F-Droid and Google Play; there is no iOS support.

## Decision
- **Mobile:** Android only — Google Play + **F-Droid**. No iOS, no Apple Developer Program.
- **Android versions:** current plus two previous majors; adaptive bottom bar / navigation rail; Material Design conventions.
- **Companion (Phase 8):** the Claude desktop companion (macOS first; Linux/Windows finalized in Phase 8) — the only on-device companion. Codex/Copilot run server-side on the Hetzner VPS.
- **Push:** F-Droid builds must not require Google Play Services (no FCM dependency). Notifications use local notifications via WorkManager, with **UnifiedPush (ntfy)** as the optional real-push path (see ADR-0012).
- In-app text-size controls multiply, never disable, Android font scaling.

## Consequences
- Accessibility/layout verification targets Android phones and tablets only (Phases 3 and 10).
- No Apple-specific compliance work (no iOS privacy manifests, no App Store review).