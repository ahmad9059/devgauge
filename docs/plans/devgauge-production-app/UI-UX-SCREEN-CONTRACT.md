# DevGauge UI/UX Screen Contract

> Status: **Planning reference.** This document transcribes the two conversation-only image references into a durable implementation contract. It does not claim those images are licensed repository assets and does not replace the rendered `DESIGN.md` that Phase 3 must produce.

## 1. Non-Negotiable Information Architecture

DevGauge has exactly three top-level mobile destinations:

| Tab | Job | Default Content Order |
|---|---|---|
| Usage | Understand provider capacity, reset timing, freshness, and trends | Claude Code, Codex, OpenCode Go, GitHub Copilot |
| Connectors | Connect, verify, repair, and disconnect providers | Claude Code, Codex, OpenCode Go, GitHub Copilot |
| Settings | Control appearance, text size, notifications, privacy, security, legal, and support | Preferences, Notifications, Privacy/Security, Legal/Support |

The bottom navigation remains visible on all three top-level screens and uses a label plus a native-platform icon. Provider details, history, connector setup, diagnostics, and legal pages are stack routes or focused sheets, not new tabs.

## 2. Visual Quality Bar

The Epic Games reference contributes craft principles, not game imagery or a layout to copy literally:

- Near-black full-screen field with clear tonal layers rather than outlined white wireframe boxes.
- Oversized primary number or status per section, with supporting copy substantially quieter.
- Confident use of negative space, large section rhythm, and full-width visual moments.
- Sharp official marks, large touch targets, restrained corner radii, and precise alignment.
- Data graphs treated as primary content, with smooth but meaningful transitions and high-quality selected states.
- Sparse high-chroma color for active navigation, provider identity, alert emphasis, and graph focus; not colored decoration on every surface.

DevGauge must not borrow Epic logos, characters, game art, invented screenshots, or proprietary assets. Its visual content is its real provider data, official provider marks, timelines, reset events, and connection states.

## 3. Usage Screen

### 3.1 Frame

- Safe-area-aware header with `Usage`, all-provider refresh, and last successful synchronization.
- One vertical scroll containing four provider stages.
- Persistent three-item bottom navigation with Usage selected.
- No global usage average, “AI score,” carousel, two-column KPI grid, or floating add button.

### 3.2 Provider Stage Anatomy

Each stage uses the same semantic anchors while allowing provider-specific data depth:

1. Official mark/name, plan when returned, connection/freshness text.
2. Oversized most-actionable capacity value with an explicit unit and consumed/remaining label.
3. One trend graph using real historical samples or an honest insufficient-history state.
4. Compact list of every current quota window with used, remaining, reset, and state.
5. Source/provenance and last success/error disclosure.
6. Clear tap target opening the provider detail/history route.

The prominent value is chosen by an explainable rule, such as the finite window with the lowest remaining percentage. The label always names its provider window so prominence never becomes ambiguity.

### 3.3 Graph Language

- Use line or restrained area charts for time-series consumption.
- Use white/neutral lines by default and one provider/status accent for the selected series or event.
- Add direct values, reset markers, stale gaps, and limited/anomaly symbols; do not communicate through hue alone.
- Use subtle grid/ticks only when they improve exact reading. Avoid 3D, bevels, gauge speedometers, decorative donuts, random waves, and dense legends below the fold.
- Touch reveals exact time/value with an expanded hit region. Every graph has a visible records/list alternative and concise trend summary.
- Graph animation interpolates data updates without blocking input and becomes crossfade/instant under reduced motion.

### 3.4 Disconnected And Failure States

- A disconnected provider keeps its stage in the sequence with a concise explanation and `Connect in Connectors` action.
- A transient failure keeps the latest graph/value, marks its age, and offers retry.
- Reauthentication, companion offline, entitlement missing, provider limited, and contract drift have different text and recovery actions.

## 4. Connectors Screen

### 4.1 Frame

- Safe-area-aware `Connectors` header with a concise privacy/security entry point.
- Four stacked provider stages in the same order as Usage.
- Persistent three-item bottom navigation with Connectors selected.

### 4.2 Provider Stage Anatomy

- Official provider mark/name and connection status.
- One-sentence connection mechanism: Claude companion, Codex device code, OpenCode API key, or GitHub OAuth.
- Exact data-access statement and last verified time when connected.
- One primary action appropriate to state: Connect, Continue, Verify, Reconnect, or Open companion setup.
- Connected management and destructive Disconnect remain secondary and spatially separated.

The screen mirrors Usage's rhythm but not its graph content. This makes the two operational modes feel related without turning connection management into another analytics feed.

## 5. Settings Screen

Use platform-native grouped settings rows with clear section headings:

| Section | Controls |
|---|---|
| Appearance | System/Dark/Light, app text size while preserving OS scaling, reduced-motion status link |
| Notifications | Permission state, threshold/reset/stale/reauth rules, quiet hours, lock-screen detail, test notification |
| Security And Sessions | App sessions, session revoke actions, and a secondary link to Claude companion management in Connectors |
| Privacy And Data | Analytics choice, retention explanation, export, delete usage history, delete account |
| Support | Diagnostics preview/export, provider status, help/contact, app/adapter/companion versions |
| Legal | Privacy policy, terms, open-source licenses, provider acknowledgements |

Settings has no promotional panels, data graphs, oversized hero art, or custom toggles that fight native platform behavior.

## 6. Detail And Setup Routes

- Provider detail owns full history ranges, all current windows, provider-specific metrics, exact records, source/freshness, health, and reconnect/disconnect.
- Connection setup owns explanation/privacy, provider-specific action, verification, first sync, success, cancel, and recovery.
- The three top-level tabs do not disappear because another feature needs discoverability; deep routes retain predictable back behavior.

## 7. Theme And Type

- Dark is the authored signature theme: true/near black canvas, stepped charcoal surfaces, white primary data, and measured secondary contrast.
- Light is separately authored from semantic tokens rather than produced by color inversion.
- System follows the OS preference. Theme changes update without a restart and preserve chart legibility and provider marks.
- Platform system type carries controls and prose. Tabular platform-monospace figures carry percentages, counts, durations, and reset times.
- App text-size controls multiply OS text scaling within tested bounds and cannot disable or undercut Dynamic Type/font scale.

## 8. Responsive And Native Behavior

- Small phones show one stage per page flow with predictable vertical scanning.
- Large phones increase whitespace, not information density for its own sake.
- Tablets may use a master/detail split inside Usage or Connectors while retaining the same three destinations.
- Test landscape, Android multi-window/split-screen, continuous resize, and supported foldable hinge/posture states.
- **Android only:** preserve window insets, Material 3 controls, predictive/gesture back, TalkBack, font scaling, and adaptive bottom-bar/navigation-rail behavior. No iOS conventions are targeted.

## 9. Finish Rejection List

Reject the build if any item is true:

- A fourth top-level tab appears for History or Alerts.
- Provider panels collapse into small interchangeable KPI cards.
- Graphs are decorative, unlabeled, inaccessible, fabricated, or continuous across missing/stale periods.
- Dark mode relies on unreadable gray-on-gray text or glows to create hierarchy.
- Light mode is a mechanical inversion with broken marks/status contrast.
- Settings uses custom novelty controls where native controls are clearer.
- Disconnected/error providers vanish and destroy the user's spatial model.
- Touch targets, large text, split view, foldable posture, reduced motion, or native back behavior fail.
