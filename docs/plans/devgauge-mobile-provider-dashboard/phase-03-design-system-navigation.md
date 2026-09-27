# Phase 3 — Build Dark/Light Design System and Navigation

Depends on: Phase 2

---

## 1. Goal

Turn the supplied layout and dark visual reference into a coherent, accessible design system and polished three-tab shell that can represent all provider states.

## 2. Scope

### In scope

- Semantic light/dark tokens, typography, spacing, radii, elevation, icons, and motion.
- Usage, Connectors, and Settings navigation shell.
- Reusable native UI primitives and static provider fixtures.
- Phone/tablet/landscape layouts.
- Dynamic Type, screen-reader, contrast, touch-target, and reduced-motion behavior.

### Out of scope

- Live usage fetching or authentication.
- Database-backed settings.
- Provider trademarks/assets not yet approved.

## 3. Detailed Tasks / Design

1. Define near-black/charcoal dark surfaces and independently designed warm off-white light surfaces.
2. Use IBM Plex Sans for UI and JetBrains Mono selectively for technical data, pending licensing review.
3. Build `Screen`, `Header`, `Card`, `Button`, `ProgressBar`, `StatusChip`, `ListRow`, `Sheet`, `Skeleton`, `EmptyState`, and `ErrorState`.
4. Implement safe-area-aware bottom tabs with visible labels and one vector icon family.
5. Build static cards for candidate-disabled, disconnected, connected, experimental, blocked, stale, rate-limited, auth-expired, and error states.
6. Use compact bullet/progress bars with exact text values; never encode status by color alone.
7. Add token/component snapshot tests for both themes.
8. Define responsive phone/tablet and landscape behavior from the shared breakpoint tokens.

## 4. Files Touched

- `src/design/{tokens,themes,typography,motion}.ts` (new; `theme-provider.tsx` added)
- `src/design/responsive.ts` and `src/design/use-responsive-layout.ts` (new; pure breakpoint math plus the window-binding hook)
- `src/components/ui/**` (new; `screen.tsx` applies the responsive content cap)
- `src/components/usage/provider-card.tsx` (new)
- `src/components/connectors/connector-card.tsx` (new)
- `src/testing/fixtures/providers.ts` (new)
- `src/domain/provider-status.ts`, `src/utils/format.ts` (new)
- `app/(tabs)/_layout.tsx` and tab screens (updated)
- `app/diagnostics/design-system.tsx` (new internal gallery)

## 5. Acceptance Criteria / QA Checklist

- [x] Three-tab hierarchy matches the supplied frame.
- [x] Both themes cover every semantic token and component state.
- [x] Normal text reaches 4.5:1 and meaningful non-text UI reaches 3:1 contrast.
- [x] Touch targets meet 48dp Android minimums.
- [x] Largest supported text does not hide values/actions (verified on the Pixel 8 and Medium Tablet emulators at system font scale 1.5).
- [x] TalkBack order and labels are verified on Android (accessibility focus and tree on the Medium Tablet emulator).
- [x] Reduced motion removes non-essential transitions.
- [x] Small phone, large phone, tablet, portrait, and landscape layouts pass on device/emulator.

## 6. Open Questions

- Exact font weights and fallback strategy.
- Approved provider brand assets.
- Tablet one-column versus two-column provider layout.
