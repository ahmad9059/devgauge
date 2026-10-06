# GitHub Release Guide

## Release identity

| Property             | Value                    |
| -------------------- | ------------------------ |
| Version              | 1.0.0                    |
| Git tag              | v1.0.0                   |
| Android package      | app.devgauge             |
| Android version code | 1                        |
| Native architecture  | arm64-v8a                |
| Release asset        | devgauge-1.0.0-arm64.apk |

The version in `package.json` is the source for the Expo application version and local artifact name. Keep the root version in `package-lock.json` synchronized. Increase Android `versionCode` in `app.config.ts` for subsequent published updates.

## Build and validate

```sh
npm ci
npm run check
npm run format:check
npm run android:release-apk
```

Optional Antigravity OAuth client configuration must be present in the ignored local `.env` before bundling. `EXPO_PUBLIC_` configuration is embedded in the APK and is not confidential.

The release command sets `APP_VARIANT=production`, uses `app.devgauge` by default, disables diagnostic access, and signs the APK with the persistent local release key. It creates:

```text
artifacts/devgauge-1.0.0-arm64.apk
artifacts/devgauge-1.0.0-arm64.apk.sha256
artifacts/android-build-release.log
```

## Signing-key preservation

The first local release build creates `.release/devgauge-release.keystore` and `.release/signing.json`. Both files are private, ignored by Git, and required for subsequent local release builds.

Back up the complete `.release/` directory to secure storage. Losing the signing key prevents publishing compatible in-place APK updates. Do not upload the directory, credentials, environment files, or build logs as release assets.

The build reuses the existing key and refuses to silently replace a keystore whose credentials are missing. If key generation fails on its first run, retain the saved credentials and investigate the error before creating a new key.

EAS builds manage signing separately. If using EAS for a future release, import the official release key rather than allowing a different key to be generated for the same package.

## Verify the artifact

Run checksum verification from the artifacts directory:

```sh
cd artifacts
sha256sum -c devgauge-1.0.0-arm64.apk.sha256
```

Use Android SDK tools to verify the APK signature and manifest:

```sh
apksigner verify --verbose --print-certs artifacts/devgauge-1.0.0-arm64.apk
aapt dump badging artifacts/devgauge-1.0.0-arm64.apk
```

Run the SDK-tool commands from the repository root, with the SDK build-tools directory on `PATH`. Confirm package `app.devgauge`, version `1.0.0`, version code `1`, and native architecture `arm64-v8a`. The signer must be the release key rather than the Android debug key.

## Device verification

Install the signed APK on an ARM64 Android device:

```sh
adb install -r artifacts/devgauge-1.0.0-arm64.apk
```

Check startup, empty state, navigation, provider connection, refresh, provider details, alerts, appearance, and data controls. Confirm Settings displays DevGauge 1.0.0 and has no Diagnostics entry. Development and preview data are separate from the release package.

## Publish on GitHub

Commit the release source and documentation before tagging. The tag must identify the exact source used to build the assets.

Create a GitHub release using tag `v1.0.0` and title `DevGauge 1.0.0`. Use [CHANGELOG.md](../../CHANGELOG.md) as the basis for release notes. Attach only:

- `devgauge-1.0.0-arm64.apk`
- `devgauge-1.0.0-arm64.apk.sha256`

If using GitHub CLI after the release commit is pushed:

```sh
gh release create v1.0.0 \
  artifacts/devgauge-1.0.0-arm64.apk \
  artifacts/devgauge-1.0.0-arm64.apk.sha256 \
  --target "$(git rev-parse HEAD)" \
  --title "DevGauge 1.0.0" \
  --notes-file docs/release/v1.0.0.md \
  --draft
```

Review the draft, verify the asset names and installation instructions, then publish it as a regular release.
