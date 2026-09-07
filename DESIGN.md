# DevGauge — Reset Horizon Design System

> Documented from the built Phase 3 Android shell. Source of truth for the visual
> language: tokens in `apps/mobile/src/theme`, components in
> `apps/mobile/src/components`, screens in `apps/mobile/src/features`.

## 1. World

**Reset Horizon** is an Operate interface: a black, instrument-like surface where
the next reset event and the most constrained allowance lead the hierarchy. The
Epic/Vercel standard is treated as craft principles — oversized white data on
near-black steps, quiet separators, sparse status color — applied with Material 3
Android conventions, not a literal transplant.

- **Dark-first.** True black canvas, stepped charcoal surfaces, white primary data,
  tabular numerals, restrained status color. Light is separately authored from the
  same semantic roles (no inversion).
- **Three destinations only.** Usage, Connectors, Settings. Provider history and
  connection setup are stack routes.
- **Graphs are content.** Every connected provider stage carries a real trend chart;
  charts never become decoration.

## 2. Tokens

Defined in `apps/mobile/src/theme/tokens.ts`; consumed only through
`useTheme()` — raw hex never appears in screen components.

| Token | Dark | Light |
|---|---|---|
| `bg` | `#000000` | `#FFFFFF` |
| `surface` | `#0B0B0D` | `#F4F4F5` |
| `surfaceRaised` | `#151518` | `#FFFFFF` |
| `surfaceSunken` | `#080809` | `#ECECEE` |
| `border` / `borderStrong` | `#1F1F23` / `#2E2E34` | `#E4E4E7` / `#D4D4D8` |
| `text` / `textSecondary` / `textMuted` | `#FFFFFF` / `#A1A1AA` / `#71717A` | `#18181B` / `#52525B` / `#71717A` |
| `accent` / `onAccent` | `#FFFFFF` / `#000000` | `#000000` / `#FFFFFF` |
| `focus` | `#3B82F6` | `#2563EB` |
| `available` / `warning` / `danger` | `#22C55E` / `#F59E0B` / `#EF4444` | `#16A34A` / `#D97706` / `#DC2626` |

Provider identity colors: Claude `#D97757`, Codex `#10A37F`, OpenCode Go `#A855F7`,
Copilot `#8957E5`.

Spacing is a 4/8 rhythm (`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`);
radii are `sm 8 · md 12 · lg 16 · xl 24 · pill 999`. Elevation is expressed with
borders and surface steps, not shadows.

Type scale: display 44 · titleLarge 24 · title 17 · body 15 · label 13 · caption 12.
Data figures use `fontVariant: ["tabular-nums"]`. The in-app text-size control
multiplies the scale on top of system font scaling and never disables it.

## 3. Components (`apps/mobile/src/components`)

- **Surface** — raised/flat/sunken container with border + radius.
- **AppText** — variant/tone-aware text; `tabular` for data.
- **Skeleton** — pulse placeholder; freezes under reduced motion.
- **StatusPill** — icon + text status (never color-only).
- **SegmentedControl** — Material segmented buttons (radio semantics).
- **Sparkline** — SVG line + area chart with end-point marker and accessibility label.
- **ProviderMark** — branded monogram in provider color (official marks later).
- **Button** — primary/ghost/accent/danger, 48dp touch target, loading/disabled states.
- **ListRow** — Material grouped-settings row.
- **EmptyState** — title/body/action for empty and error states.

## 4. Screens

- **Usage** — four stacked provider stages in fixed order (Claude, Codex, OpenCode,
  Copilot). Each: mark + plan + freshness, an oversized most-actionable value,
  a trend chart, compact window rows, and a connect CTA when disconnected.
- **Connectors** — four matching stages with connection status, method, data-access
  statement, last-verified, and a Connect/Manage action.
- **Settings** — grouped sections: Appearance (System/Dark/Light + text size),
  Notifications, Security & sessions, Privacy & data, Support, Legal.
- **Provider detail** — range selector (24h/7d/30d), large chart, every window with
  exact values and absolute reset, Codex activity metrics, refresh/disconnect.
- **Connect flow** — intro/privacy → provider-specific action (API key, device code,
  GitHub, companion pairing) → verifying → success.

## 5. Behavior & Accessibility

- Dark/Light/System resolved live via `useTheme`; changes apply without restart.
- Android Material 3 conventions: window insets, 48dp touch targets, tab bar,
  predictive/gesture back, top app bars.
- Screen-reader labels on every meaningful element; charts expose a text summary;
  status is never communicated by color alone.
- Motion is opacity/transform only, respects `reduce-motion`, and skeleton pulses
  stop under reduced motion.

## 6. Anti-patterns rejected

- No generic KPI-card grid, no average/aggregate "AI score".
- No neon glows, gradient borders, glassmorphism, or decorative chart chrome.
- No fourth tab for History or Alerts (nested routes only).
- Light theme is not a color inversion.
- Disconnected/error providers keep their place; data is never replaced by empty panels.