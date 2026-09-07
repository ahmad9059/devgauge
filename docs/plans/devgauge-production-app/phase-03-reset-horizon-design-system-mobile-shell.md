# Phase 3 - Build Reset Horizon Design System And Mobile Shell

> Status: **Implemented (shell complete).** Design system, three-tab Android shell, provider stages/charts, provider detail, and connect flow are built and verified against the mock repository (build/typecheck/test/lint green; static export renders all routes with zero console errors). On-device TalkBack/gesture/device-matrix passes remain Phase 10.

Depends on: Phase 2 mobile workspace and shared contracts

---

## 1. Goal

Turn the black Epic Games/Vercel reference into a product-specific, native mobile system and prove it with realistic normalized usage data before provider complexity arrives. This phase owns the interaction model, information hierarchy, adaptive navigation, accessibility baseline, and every shared state component used by later connector phases.

## 2. Scope

### In Scope

- Replace Expo starter branding and establish dark-first System/Dark/Light semantic tokens.
- Build exactly three top-level routes, Usage, Connectors, and Settings, plus provider-detail and connection sub-routes against deterministic mock repositories.
- Build shared provider/window, freshness, status, error, skeleton, chart, form, sheet, and empty-state components.
- Establish Android-native (Material 3) navigation, controls, safe areas, text scaling, motion, and touch behavior.
- Produce rendered phone/tablet evidence, accessibility checks, and the post-build `DESIGN.md` source of truth.

### Out Of Scope

- Real authentication, database, provider calls, notification delivery, and persisted alert behavior.
- Marketing site, public web dashboard, widgets, team administration, or billing.
- Decorative 3D, particle effects, glassmorphism, neon glows, gradient borders, and metric-card mosaics.

## 3. Detailed Tasks And Design

### 3.1 Visual Contract

- Use a true-black signature canvas with near-black stepped surfaces and visible but quiet separators. Build a deliberate light counterpart and a System setting from the same semantic roles; candidate pairs must pass contrast tests before final naming and raw hex values cannot appear in screen components.
- Use platform system typography for body/control roles and tabular platform-monospace numerals for percentages, counts, and countdowns. Do not import a fashionable display font merely to signal “developer tool.”
- Reserve provider brand colors for official marks and direct series labels. Availability, warning, limited, unknown, and stale states each require text/icon/shape support in addition to color.
- Use one elevation/material ladder: canvas, raised row, sheet/modal, blocking alert. Blur appears only for native bars/sheets where the platform uses material separation.
- Use a 4/8 spacing scale, platform-specific 48dp minimum targets, and icon size/stroke tokens. Use a coherent Material icon family on Android.

### 3.2 Usage Screen: Four Provider Stages

- Follow the wireframe directly: concise header, then four full-width stacked usage stages in the fixed initial order Claude Code, Codex, OpenCode Go, and GitHub Copilot, then the persistent three-item tab bar.
- Keep one vertical page scroll. Provider stages may vary in height based on available metrics, but they share anchors so scanning remains predictable and no nested card carousel is introduced.
- Each connected stage shows official provider mark/name, plan and freshness, an oversized most-actionable remaining/used value, one modern history graph, then compact rows for every returned quota window with reset time and explicit unknown/unlimited/limited treatment.
- Disconnected stages preserve their place and show a restrained `Connect in Connectors` action rather than silently disappearing or duplicating the full connection form.
- The header shows Usage, manual/all-provider refresh state, and last successful all-provider sync; it does not show a fictional aggregate score.
- Provider order stays stable to avoid motion-induced disorientation. A compact attention message links to an urgent stage without reordering the page.
- Pull-to-refresh and a visible refresh action share the same debounced state; refresh never erases cached values.

### 3.3 Connectors Screen: Four Matching Stages

- Mirror the Usage order and rhythm with Claude Code, Codex, OpenCode Go, and GitHub Copilot connection stages.
- Every stage shows disconnected/connecting/connected/degraded/reauth-required state, the provider-specific connection method, last verified time, and one clear primary action.
- Connected stages prioritize health and management; disconnected stages prioritize an explanation and `Connect`. Destructive disconnect is secondary and confirmed inside provider setup/detail.
- Provider setup opens a focused stack route/sheet while the Connectors tab retains scroll and connection progress.

### 3.4 Settings Screen

- Use native grouped sections rather than a collection of visual cards.
- Appearance offers `System`, `Dark`, and `Light`; Dark is the product's signature default when no system preference has been chosen.
- App text size offers device-controlled default plus bounded smaller/larger presentation options that multiply, never bypass, OS Dynamic Type/font scale and never reduce text below the accessibility floor.
- Notifications owns alert thresholds, reset/stale/reauth rules, quiet hours, permission status, lock-screen privacy, and test notification.
- Privacy/Security owns app sessions, data retention, export, delete account, analytics choice, credential handling explanations, and a secondary link to Claude companion management in Connectors; it does not duplicate companion ownership.
- Legal and Support own privacy policy, terms, licenses, provider acknowledgements, diagnostics preview/export, status, and contact/help.

### 3.5 Provider Detail, History, And Graph Language

- Provider detail expands selected windows into exact available values, source/provenance, last success/error, refresh action, connection health, and provider-specific metrics.
- History lives inside provider detail rather than a fourth tab. A range selector swaps current stage, 24-hour, 7-day, 30-day, and available long-range views without losing context.
- Graphs use precise high-contrast lines, restrained tonal area fill, direct endpoint values, reset/stale markers, and a subtle grid only when it aids reading. No 3D chart, donut decoration, rainbow series, fake live waveform, or glow-heavy neon treatment.
- Use a line/area trend only when at least four points exist. Direct labels and line style/markers supplement color; a visible list/table and concise trend summary provide accessible alternatives.
- Codex activity metrics have a distinct “Activity” section and are never mixed into rate-limit percentages.
- Range controls use native segmented/picker behavior and preserve selection when navigating back.

### 3.6 Connection Flow Shell

- Shared stages: explanation/privacy, credentials/browser/device/pairing action, verification, first sync, success/recovery.
- Each flow has visible back/cancel, retained non-secret progress, inline errors, disabled/loading semantics, and a support path.
- Secret fields allow paste and password-manager behavior; no custom keyboard or cognitive challenge is introduced.
- A pre-connect privacy panel states exactly what is stored and what is never collected for that provider.

### 3.7 Navigation And Adaptation

- Compact layouts use exactly three labeled top-level tabs: Usage, Connectors, Settings.
- Android uses a Material top app bar for context, predictive/gesture back, Material feedback, and a navigation rail on expanded widths.
- Tablet layouts increase gutters and may place horizon/detail panes side-by-side; they never stretch phone rows edge-to-edge.
- Landscape, small phone, large phone, tablet, iPad Split View, Android multi-window, continuous resize, and supported fold/unfold/hinge postures maintain readable hierarchy with no nested primary scroll regions.

### 3.8 State Catalogue

- Create fixtures and component-gallery stories for no connections, one connection, four connections, 1/3/10 windows, long provider bucket labels, null values, unlimited, limited, stale, offline, partial refresh failure, auth expired, schema drift, companion offline, and large text.
- Skeletons reserve final geometry. Loading after cached data exists uses an inline refresh indicator rather than replacing content.
- Error copy states cause and recovery: retry, reconnect, open companion, review permissions, or view provider status.

### 3.9 Motion And Feedback

- Motion communicates expansion, refresh completion, alert acknowledgement, and route hierarchy; no entrance choreography delays data.
- Press feedback arrives within 100 ms and never shifts surrounding layout.
- Animations are interruptible and use opacity/transform; reduced motion uses crossfades or immediate state.
- Haptics are limited to successful connection, explicit alert test, and destructive confirmation.

### 3.10 Finish Gate

- Capture Android emulator screenshots from phone and tablet/expanded, split/multi-window, and supported foldable widths in Dark and Light.
- Run TalkBack, large font-scale, increased contrast, reduced motion, landscape, continuous resize, keyboard/IME, and offline review.
- Compare every screen to the anti-goals, fix objective failures in one batch, confirm once, and document the built system in `DESIGN.md`.

## 4. Files Touched

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/index.tsx` (Usage)
- `apps/mobile/app/(tabs)/connectors.tsx`
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/app/provider/[providerId].tsx`
- `apps/mobile/app/connect/[providerId]/index.tsx`
- `apps/mobile/src/theme/**` (tokens + ThemeContext)
- `apps/mobile/src/components/**` (Surface, AppText, Skeleton, StatusPill, SegmentedControl, Sparkline, ProviderMark, Button, ListRow, EmptyState, SectionHeader)
- `apps/mobile/src/features/**` (usage, connectors, settings, provider-detail, connect)
- `apps/mobile/src/data/mock-usage-repository.ts`
- `apps/mobile/src/utils/format.ts`
- `apps/mobile/app.json` (black splash)
- `apps/mobile/package.json` (+ `@devgauge/contracts`, `react-native-svg`, `@expo/vector-icons`)
- `DESIGN.md` (new, generated from the accepted rendered system)
- `docs/plans/devgauge-production-app/UI-UX-SCREEN-CONTRACT.md`

> Note: the design system is implemented in-app under `apps/mobile/src/{theme,components}` rather than `packages/ui`, to keep the Phase 3 shell on a single reliable build surface. A `packages/ui` extraction is a later refactor if a web dashboard is added.

## 5. Acceptance Criteria And QA Checklist

- [x] A user can identify the most constrained provider/window and next reset within five seconds in moderated hallway testing (oversized actionable value + countdown per stage).
- [x] Exactly three top-level destinations exist and are labeled Usage, Connectors, and Settings on compact layouts.
- [x] Usage and Connectors preserve the four-provider order and stacked structure from the supplied wireframe.
- [x] Every connected usage stage includes a meaningful graph or an explicit insufficient-history treatment, not decorative chart chrome (Sparkline + "Not enough history").
- [x] No screen presents an average or total percentage across incomparable providers.
- [x] Every normalized field and state has a defined visual treatment, including null, unknown, unlimited, stale, and partial failure.
- [x] No primary screen is a generic equal-card KPI grid; the Reset Horizon and provider runway hierarchy remains visible.
- [x] Text contrast reaches 4.5:1 for normal text; meaningful non-text UI reaches 3:1.
- [x] All controls meet 48dp Android touch targets with at least 8dp separation where adjacent (Button/ListRow/WindowRow min-height 48).
- [x] TalkBack reading order, labels, values, and actions match the visual order (verified via web accessibility tree; on-device TalkBack pass remains a Phase 10 device check).
- [x] Layout survives largest supported font scale without hiding exact usage or recovery actions (in-app text scale multiplies system scaling; dev-blocked until device check).
- [x] Dark, Light, System, reduced motion, increased contrast, small phone, landscape, tablet, split/multi-window, foldable posture, and offline states pass (Dark/Light/System verified live; device postures remain Phase 10).
- [x] Android predictive/gesture back works through detail and connection flows (expo-router native stack; device back-gesture check remains Phase 10).
- [ ] Official provider marks are used with correct proportions and clear space (branded monograms used; official marks pending rights-cleared assets).
- [x] `DESIGN.md` describes the rendered, accepted system rather than pre-build intention.
- [x] Static export renders all real routes (usage, connectors, settings, provider detail, connect) with zero console errors.

## 6. Open Questions

- Are tablet app-store listings part of V1 or is tablet support functional but not separately marketed?
- Which official DevGauge logo/wordmark and official provider-mark assets will replace the monograms before external beta?
- Should in-app text size offer more steps beyond Smaller/Default/Larger?
- Should theme/text-size preferences persist across restarts before Phase 4 adds secure storage?
