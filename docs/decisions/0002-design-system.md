# ADR 0002: Token-driven dark/light design system

Status: accepted for Phase 3 (brand assets and persisted preferences pending)

Date: 2026-09-25

## Decision

- All visual values live in framework-free token modules under `src/design/` so they can be unit-tested without a renderer and reused by every screen.
- Light and dark are independently designed themes with role-based color names (`background`, `surface`, `textPrimary`, `accent`, `progressTrack`, …), not an inverted palette. Six status tones (`neutral`, `accent`, `info`, `success`, `warning`, `danger`) back chips, banners, and connector sections.
- Typography uses IBM Plex Sans for UI and JetBrains Mono for reset times, percentages, and technical metadata, both under the SIL Open Font License. Fonts load at runtime through `expo-font` with an automatic system-font fallback; a missing font can never crash a screen.
- One vector icon family (Material Design Icons via `@expo/vector-icons`). Navigation and status never use emoji.
- Accessibility is enforced as tests, not convention: `themes.test.ts` asserts WCAG contrast (text ≥ 4.5:1 on every surface, control borders/focus/progress fill ≥ 3:1, button label/fill ≥ 4.5:1) and snapshots both themes; `tokens.test.ts` asserts the 48dp touch-target minimum and spacing/radii ranges.
- Status is never color-only: chips pair an icon with a label, progress bars print unit values, and connector groups use headings plus plain-language facts.
- Reduced motion collapses every non-instant transition to zero and disables Sheet/Skeleton animation.
- Providers use neutral monograms until official brand assets are approved.
- Responsive layout is token-driven: `src/design/responsive.ts` derives a device class from the shortest window side and caps scrollable content at 840dp on wide windows, so tablets and landscape phones keep readable line lengths while portrait phones are unchanged. `ScreenScroll` applies the cap centrally.

## Consequences

- Theme and text-size preferences currently live in memory in `ThemeProvider`; persisting them belongs to the Phase 4/9 settings work.
- Adding a new color role requires updating both themes and the tests; snapshots make drift visible in review.
- Custom fonts add asset weight to the bundle; the fallback path keeps the app usable if loading fails.
- The design-system gallery at `app/diagnostics/design-system.tsx` is development/internal-preview only and is reachable from the production-gated diagnostics entry.
- v1 keeps a single centered provider column on tablets; a two-column provider grid remains a product decision (see the Phase 3 open questions).

## Sources

- [WCAG 2.2 contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Android touch target guidance](https://support.google.com/accessibility/android/answer/7101858)
- [IBM Plex (OFL)](https://github.com/IBM/plex/blob/master/LICENSE.txt)
- [JetBrains Mono (OFL)](https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt)
