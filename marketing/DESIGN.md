# DevGauge marketing visual system

## Authority

The user approved six restrained black/off-white layouts showing real usage, connectors, details, alerts, privacy, and the Settings tab. Product truth is in `../PRODUCT.md`; composition requirements are in `DESIGN-CONTRACT.md`. The existing Android interface and supplied DevGauge logo are the visual authority.

## Durable choices

- Portrait assets: 1080 by 1920, native captures at the same aspect ratio.
- Palette: near-black `#080909`, off-white `#f1f1ed`, and readable neutral supporting text.
- Type: locally bundled Geist, 76-pixel semibold portrait headlines, 28-pixel supporting copy, and 21-pixel footers.
- Hierarchy: modest brand lockup, one two-line capability headline, genuine application capture, and small provenance footer.
- Capture presentation: 780 by 1386.67 image area, 20-pixel corner radius, and an offset soft shadow. No fabricated device frame or recreated app components.
- The app remains dark in every capture; the surrounding presentation alternates dark and light.
- Marketing data is explicitly labeled in both account names and presentation footers.
- GitHub preview: 1600 by 900, headline on the left and genuine dashboard/detail captures on the right.

## Implementation

Remotion compositions are in `remotion/`. `render.mjs` creates the six portraits, a landscape preview, and a three-by-two contact sheet. Maestro flows operate the isolated Android marketing package. Capture dimensions and device display preferences are controlled and restored by `../scripts/capture-store-assets.mjs`.

## Finish review

The dashboard is captured at 168 dpi in the real Android application so all six complete provider cards fit in one screen. Maestro asserts every provider, Antigravity's final weekly percentage, and its reset countdown are visible. Other screens retain their 256 dpi capture density.

The real device capture passed all Maestro navigation assertions for the five screens. The final provider capture shows all six provider names. Full-size dashboard, connectors, and alert portraits plus the contact sheet and GitHub preview were visually inspected. Quota denominators, reset countdowns, sample-data labels, and alert rules are readable; compositions retain screenshot aspect ratios and do not overlap headline copy.

The native screens preserve their real scroll viewport: long lists continue below the bottom navigation, and controls not in that viewport are not composited into the screenshots. The phone's OEM did not apply the standard status-bar demo clock, so the genuine native status bar is retained.

The optional skill detector could not run because its bundled detector was missing. The verdict is based on rendered-file inspection, dimensions, application checks, marketing type checks, and the successful Maestro capture run.

## Verdict

Ready for delivery as a six-image marketing set. The Settings-tab portrait was captured on the real device and visually reviewed for readable appearance, text-size, privacy, and local-data controls. Optional video/GIF generation is implemented but is not part of this static-image delivery.
