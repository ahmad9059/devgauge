# Mobile QA Matrix

> Consolidated manual/emulator evidence. Device QA is required by the plan;
> AI-only verification is not sufficient. Raw screenshots live outside the repo
> (`/tmp/opencode/qa`) and are not committed.

## 1. Devices and configurations

| Device | Resolution | Density | Class | Orientation |
|---|---|---|---|---|
| Pixel 8 AVD (API 35) | 1080×2400 | 420 | phone (~412×914dp) | portrait + landscape |
| Medium Tablet AVD (API 35) | 2560×1600 | 320 | tablet (1280×800dp) | portrait + landscape |
| Display override | 640×1280 @320 | 320 | small phone (~320dp) | portrait |
| Display override | 1560×3120 @480 | 480 | large phone (~520dp) | portrait |

## 2. Phase 3 foundation (passed)

- Three-tab hierarchy (Usage/Connectors/Settings) renders with safe-area tabs.
- Light and dark themes both render; contrast and 48dp targets are test-enforced.
- Landscape and tablet content is capped (840dp) and centered; no clipped content.
- Largest system text (font scale 1.5) keeps all values and actions visible.
- TalkBack focus lands on each card with the correct grouped label; the
  accessibility tree confirms reading order and labels.
- Reduced motion collapses non-essential transitions (test-enforced).

## 3. Phase 4 storage (passed)

- Storage self-test: encrypted DB opens and migrates (`user_version 1`),
  `PRAGMA cipher_version` = `4.7.0 community`, repository round-trip, and keyless
  open rejected (`file is not a database`).
- Update-in-place reinstall preserves the key/DB; clean uninstall + reinstall
  recreates both safely.

## 4. Phase 6/8 connector states (logic verified; not enabled)

- GitHub/Command Code/OpenCode Go release-disabled cards; Claude/Codex/Gemini CLI
  manual cards with allowlisted links.
- No connector makes a network request while disabled (engine tests).
- Gemini CLI user-shared import is stored and labeled manual/partial.

## 5. Phase 9 UX (logic verified; device re-check with the release build)

- Dashboard view model covers every provider state and labels data age.
- Unknown values never render as zero/unlimited (format tests).
- Theme/text settings persist through the encrypted settings repository.
- Notification permission denial does not block the app; copy is generic.

## 6. Outstanding manual checks (owner/device)

- Repeat the accessibility and large-text matrix against the final release build.
- Confirm notification scheduling/quiet-hours behavior on a physical device.
- Capture a signed release build's merged-manifest permissions for Data Safety.
