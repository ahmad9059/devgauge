# ADR-0011: Supported Client Targets

Status: Accepted

## Context
Mobile and desktop-companion release matrices constrain test, accessibility, and store-compliance effort.

## Decision
- **Mobile:** iOS and Android phones first (V1); tablet layouts supported; public web app deferred.
- **iOS:** current plus previous major OS supported, per store policies.
- **Android:** current plus two previous majors; adaptive bottom bar / navigation rail.
- **Companion (Phase 8):** macOS first; Linux and Windows are open decisions finalized during Phase 8 scoping.
- In-app text-size controls multiply, never disable, OS Dynamic Type/font scaling (Phase 3 contract).

## Consequences
- Accessibility and layout verification run against the supported device/OS matrix in Phases 3 and 10.
- Companion packaging (signed/notarized) is scoped to the finalized OS list.