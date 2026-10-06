# DevGauge marketing pipeline

Six portrait assets use genuine Android screenshots with clearly labeled sample data. Maestro captures the application; Remotion adds the headline, branding, and presentation. The screenshot itself is never recreated in HTML.

## Outputs

- `output/playstore/01-dashboard.png`
- `output/playstore/02-providers.png`
- `output/playstore/03-limits.png`
- `output/playstore/04-alerts.png`
- `output/playstore/05-privacy.png`
- `output/playstore/06-settings.png`
- `output/github/preview.png`
- `output/contact-sheet.png`

Portrait images are 1080 by 1920. The GitHub preview is 1600 by 900. Optional video rendering adds `output/github/demo.mp4` and `output/github/demo.gif`.

## Setup

Install the root and marketing dependencies:

```sh
npm ci
npm ci --prefix marketing
```

Install [Maestro](https://docs.maestro.dev/get-started/installing-maestro), ImageMagick, and optional FFmpeg. A Java runtime compatible with Maestro and Android build tools must be available. Remotion downloads its headless browser when first rendering.

## Capture real screens

Connect an ARM64 Android device, leave it unlocked, and run from the repository root:

```sh
npm run screenshots:build
npm run screenshots:capture
```

Set `ANDROID_SERIAL` when multiple devices are connected. `MAESTRO_BIN` can override the Maestro executable path. Set `JAVA_HOME` if Maestro cannot find a compatible runtime.

The dedicated build uses `app.devgauge.marketing`, separate from the release and ordinary preview packages. It seeds illustrative quotas and notification rules into its own encrypted database, freezes the view-model reference clock for the capture session, and disables automated provider requests and notification scheduling. Every seeded plan is labeled `sample data`. Marketing mode is rejected by production configuration and is only enabled at runtime for the dedicated preview package.

The capture command resets only the marketing package's app data, temporarily sets a 1080 by 1920 display, disables animations, and normalizes the status bar where supported. Original display size, density, font scale, animation settings, and status-bar demo settings are restored in a `finally` block.

Maestro flows: `.maestro/store-screenshots/capture.yaml` and `dashboard-all-providers.yaml`. The first flow uses 256 dpi for detailed screens; the dashboard flow uses a genuine 168 dpi Android viewport to fit all six complete provider cards and their quota windows. It asserts that every provider and the final reset countdown are visible. Sanitized captures and their provenance manifest live in `public/captures/`. Keep them in version control so GitHub can render without a connected Android device. Regenerate them when the application UI changes.

## Render assets

```sh
npm run screenshots:render
```

For the optional 18-second video and GIF:

```sh
npm --prefix marketing run render -- --video
```

For a full local build, capture, and render:

```sh
npm run marketing
```

Copy is configured in `remotion/design.ts`. Layouts live in `remotion/StoreScreenshot.tsx` and `remotion/GithubPreview.tsx`. Local Geist fonts are copied from the application dependency into generated public assets, and the existing DevGauge logo is reused.

## GitHub Actions

Run the **Marketing assets** workflow manually to render the checked-in captures and download the output artifact. The workflow does not simulate provider usage through an account or operate a connected phone. Fresh captures remain a deliberate local step.

## Asset review

The Settings tab uses a dedicated `settings.yaml` Maestro flow at 288 dpi, showing appearance, text sizing, privacy, and data controls. The contact sheet and published galleries form a three-column, two-row grid.

Review `output/contact-sheet.png` and the full-size files. Confirm that captures show the correct screens, percentages have complete denominators, reset information and sample-data labels are legible, images retain their aspect ratio, and headlines do not overlap screenshots.

Remotion has its own licensing terms. Review [Remotion licensing](https://www.remotion.dev/license) for the organization running the rendering workflow; the repository's MIT license does not replace dependency terms.
