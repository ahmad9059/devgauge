# Mobile QA Matrix

> Historical foundation checks plus current performance/alerts verification.
> Historical “passed” labels below do not certify the current release candidate.
> Current screenshots are in gitignored `artifacts/`; detailed evidence and limits
> are in `docs/plans/devgauge-performance-alerts-resets/NATIVE-QA-LOG.md`.
> Physical-device and TalkBack verification remain required.

## 1. Devices and configurations

| Device | Resolution | Density | Class | Orientation |
|---|---|---|---|---|
| Pixel 8 AVD (API 35) | 1080×2400 | 420 | phone (~412×914dp) | portrait + landscape |
| Medium Tablet AVD (API 35) | 2560×1600 | 320 | tablet (1280×800dp) | portrait + landscape |
| Display override | 640×1280 @320 | 320 | small phone (~320dp) | portrait |
| Display override | 1560×3120 @480 | 480 | large phone (~520dp) | portrait |

## 2. Historical Phase 3 foundation (not reverified in full)

- Three-tab hierarchy (Usage/Connectors/Settings) renders with safe-area tabs.
- Light and dark themes both render; contrast and 48dp targets are test-enforced.
- Landscape and tablet content is capped (840dp) and centered; no clipped content.
- Largest system text (font scale 1.5) keeps all values and actions visible.
- TalkBack focus lands on each card with the correct grouped label; the
  accessibility tree confirms reading order and labels.
- Reduced motion collapses non-essential transitions (test-enforced).

## 3. Historical Phase 4 storage (schema 1 evidence)

- Storage self-test: encrypted DB opens and migrates (`user_version 1`),
  `PRAGMA cipher_version` = `4.7.0 community`, repository round-trip, and keyless
  open rejected (`file is not a database`).
- Update-in-place reinstall preserves the key/DB; clean uninstall + reinstall
  recreates both safely.

## 4. Historical Phase 6/8 connector states

- GitHub/Command Code/OpenCode Go remain unsupported. The old manual-only
  Claude/Codex/Gemini description is superseded: Claude/Codex website sessions
  and Gemini CLI Antigravity OAuth transports are mounted. See README.md and
  release-readiness.md for current capability limits.
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

## 7. Current performance/alerts candidate checks

- Release shrinking: existing Pixel sample database and font assets reopened after update; forward schema 4 reminder creation worked. Sample usage is explicitly diagnostic, not live-account evidence.
- Native background reminder and warm provider tap passed on `fb86422`; Android delivered within its inexact scheduling window. The process was retained, so that trial did not verify cold delivery.
- `42535d2`: notifications at 375.7 dp, 150% system font, portrait/landscape and reduced system animation settings. Removed row text clamps after observing ellipsis; rebuilt full permission title wraps.
- Tablet 1280×800 dp: notification screen inspected in light on `42535d2` and dark on `c8c20cd`; no clipped text or overlap observed on those screens. This does not close the full UI/accessibility matrix.
- Current automated gates: 82 files / 412 tests, typecheck, zero-warning lint, config and format passed after `c8c20cd`. No full TalkBack, physical-phone, signed-in latency, direct credit consumption, production AAB or power-restriction pass is claimed.
