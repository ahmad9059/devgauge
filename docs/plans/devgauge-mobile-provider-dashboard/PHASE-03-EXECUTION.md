# Phase 3 Execution Evidence — Dark/Light Design System and Navigation

> Status: **Implemented and verified on phone/tablet emulators; the checklist is complete.** Evidence date: 2026-09-27.

## Implemented

- Semantic tokens: `src/design/tokens.ts` (4/8-point spacing, 16/24/32 section tiers, radii, 48dp touch targets, type scale, motion durations, breakpoints) and `src/design/motion.ts` (reduced-motion collapse).
- Independent light and dark themes: `src/design/themes.ts` defines every color role, six status tones, font sets, plus `resolveTheme` and WCAG helpers. Both palettes are hand-tuned, not inverted.
- Typography: `src/design/typography.ts` resolves 13 presets, maps weights to IBM Plex Sans / JetBrains Mono families, and scales with the in-app text size.
- Theme provider: `src/design/theme-provider.tsx` loads bundled fonts with a system-font fallback, follows system light/dark, exposes a manual override, exposes four text-scale presets, and tracks reduced motion.
- Responsive layout: `src/design/responsive.ts` (pure `resolveLayout` from the breakpoint tokens) and `src/design/use-responsive-layout.ts` (window-binding hook). `src/components/ui/screen.tsx` centers scrollable content at `wideContentMaxWidth` (840dp) so tablets and landscape phones keep readable line lengths; portrait phones are unchanged.
- UI primitives: `src/components/ui/` — Screen, ScreenScroll, Stack, Header, SectionTitle, Card, CardDivider, Button, IconButton, ProgressBar, StatusChip, ListRow, RowDivider, Sheet, Skeleton, EmptyState, ErrorState, Notice, Monogram, Icon. One vector icon family (Material Design Icons); no emoji navigation.
- Provider/connector cards: `src/components/usage/provider-card.tsx`, `src/components/connectors/connector-card.tsx`.
- Domain and data: `src/domain/provider-status.ts` (status descriptors, tiers, connector groups), `src/testing/fixtures/providers.ts` (six providers + one fixture per UI state + connector metadata), `src/utils/format.ts`.
- Screens rebuilt on the system: Usage (summary rail + six cards), Connectors (four grouped sections), Settings (Appearance with working theme and text-size sheets, Notifications, Privacy, Data confirmation sheet, Help/About), provider detail, connect (permissions sheet), onboarding, support, legal, auth callback, diagnostics, and a diagnostics **design-system gallery** covering every state and both themes.
- Root layout wraps the theme provider and themes the native stack and status bar; bottom tabs are safe-area aware with labels and vector icons.

## Verified locally

- `npm run check` passes: TypeScript, ESLint, **56** unit checks across 11 files, and three build-profile config checks.
- New tests: theme snapshots (both themes), a contrast contract suite, token/scale tests, typography mapping, motion/reduced-motion, responsive layout breakpoints, usage formatting, provider-status grouping, and fixture integrity covering all nine UI states.
- Contrast is asserted, not just eyeballed: body/secondary/muted text ≥ 4.5:1 on every surface in both themes, semantic roles ≥ 4.5:1 on the background, status-chip content ≥ 4.5:1, control borders/focus/progress fill ≥ 3:1, and button label/fill pairs ≥ 4.5:1.
- Non-color status: chips pair an icon with a label; progress bars always print unit values; connector groups use headings plus facts.
- `npx expo export --platform android` bundles with the new fonts/icons, and `npx expo-doctor` reports 21/21 checks passing.
- The internal preview APK is rebuilt through `scripts/build-test-apk.sh` for gallery/theme checks on the emulator.

## Emulator QA evidence (2026-09-27)

`scripts/run-phase3-qa.sh` installs the internal preview APK (`app.devgauge.preview`) and captures the screenshots and accessibility tree below. Raw artifacts stay in `/tmp/opencode/qa` and are not committed (no account identifiers are present; the fixtures are static).

- Devices: `Pixel_8_API_35` (1080×2400 @ 420dpi ≈ 412×914dp phone) and a `medium_tablet` AVD (2560×1600 @ 320dpi = 1280×800dp tablet). Small-phone (~320dp) and large-phone (~520dp) widths were exercised with `wm size`/`wm density` overrides.
- Light and dark themes both render on device (dark via `cmd uimode night yes`), matching the asserted palettes.
- Landscape phone and tablet content is capped and centered; portrait phones and tablets show no clipped or hidden content.
- Largest supported text: at system `font_scale 1.5`, all progress values (`42% / 100%`, `71% / 100%`), status chips, and tab labels remain visible and unclipped.
- TalkBack: `com.google.android.marvin.talkback` was enabled; accessibility focus landed on each provider card with the expected grouped label (for example `Codex, Plus, Sign in again, updated 2d ago`), and the `uiautomator` tree confirmed reading order and labels (`Refresh all providers`, `Status: Connected`, …) across Usage, Connectors, and Settings.

## Acceptance criteria status

- [x] Three-tab hierarchy (Usage, Connectors, Settings) with safe-area tabs, labels, and vector icons.
- [x] Both themes cover every semantic token and component state (enforced by snapshot + palette tests).
- [x] Normal text reaches 4.5:1 and meaningful non-text UI reaches 3:1 (enforced by tests).
- [x] Touch targets meet the 48dp Android minimum (enforced by token test; buttons/rows/tab items sized accordingly).
- [x] Largest supported text verified on device without hiding values/actions.
- [x] TalkBack order and labels verified on Android.
- [x] Reduced motion removes non-essential transitions (motion tokens collapse to zero; Sheet/Skeleton respect it).
- [x] Small phone, large phone, tablet, portrait, and landscape layouts pass on device/emulator.

## Out of scope (unchanged)

Live usage fetching, authentication, database-backed settings, and official provider brand assets. Fonts (IBM Plex Sans, JetBrains Mono) are OFL-licensed; the licensing review is recorded for release. Provider marks remain neutral monograms.

## Open questions carried forward

- Approved provider brand assets.
- Tablet one-column versus two-column provider layout (v1 keeps a single centered column).
- Whether the text-scale presets become persisted settings in Phase 4/9.
