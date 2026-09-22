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

## 4. Files Touched

- `src/design/{tokens,themes,typography,motion}.ts` (new)
- `src/components/ui/**` (new)
- `src/components/usage/provider-card.tsx` (new)
- `src/components/connectors/connector-card.tsx` (new)
- `src/testing/fixtures/providers.ts` (new)
- `app/(tabs)/_layout.tsx` and tab screens (new/update)

## 5. Acceptance Criteria / QA Checklist

- [ ] Three-tab hierarchy matches the supplied frame.
- [ ] Both themes cover every semantic token and component state.
- [ ] Normal text reaches 4.5:1 and meaningful non-text UI reaches 3:1 contrast.
- [ ] Touch targets meet 44pt iOS / 48dp Android minimums.
- [ ] Largest supported text does not hide values/actions.
- [ ] VoiceOver/TalkBack order and labels are verified.
- [ ] Reduced motion removes non-essential transitions.
- [ ] Small phone, large phone, tablet, portrait, and landscape layouts pass.

## 6. Open Questions

- Exact font weights and fallback strategy.
- Approved provider brand assets.
- Tablet one-column versus two-column provider layout.
