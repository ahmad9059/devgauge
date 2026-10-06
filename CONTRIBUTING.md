# Contributing to DevGauge

Thank you for contributing to DevGauge. This guide covers bug reports, development setup, and pull requests. All participants are expected to follow the [code of conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- Report reproducible application or provider integration problems.
- Improve documentation and setup instructions.
- Fix usage parsing, refresh behavior, or local storage issues.
- Improve accessibility, responsive layout, and Android usability.
- Add focused tests for meaningful edge cases.

Discuss substantial features, new providers, or architecture changes in an issue before starting a large implementation.

## Reporting bugs

Use the [issue tracker](https://github.com/ahmad9059/devgauge/issues) for ordinary bugs. Include:

1. A short description and expected behavior.
2. Steps to reproduce the issue.
3. Android version, device model, and application version or commit.
4. The affected provider and connection method, if relevant.
5. Whether the issue occurs on Wi-Fi, mobile data, foreground refresh, or background refresh.
6. Sanitized screenshots or relevant error messages.

Remove account identifiers, email addresses, cookies, tokens, passwords, and authorization codes from all attachments. Do not share raw provider response bodies that contain account data.

For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development setup

Use Node.js 24 LTS, npm, Android Studio, an Android SDK, and a compatible Java runtime. Android builds target ARM64, so use an ARM64 device or emulator.

```sh
git clone https://github.com/ahmad9059/devgauge.git
cd devgauge
npm ci
cp .env.example .env
npm run android
```

Configure optional provider-specific values in your local `.env` only when needed. `EXPO_PUBLIC_` values are bundled into the mobile application. Do not place confidential server secrets in them.

Read the [README](README.md#development) for project structure and build instructions.

## Making changes

1. Create a branch for a focused change.
2. Follow the surrounding TypeScript, React Native, naming, and formatting conventions.
3. Reuse shared components, design tokens, and storage services.
4. Add or update tests when the change introduces meaningful behavior or fixes a regression.
5. Update documentation when user-facing behavior or setup requirements change.
6. Run the validation commands before opening a pull request.

### Provider integration expectations

- Use first-party provider and identity endpoints with explicit origin restrictions.
- Keep credentials in secure storage and out of logs, snapshots, and diagnostics.
- Preserve the last successful snapshot when refresh fails.
- Treat missing quota values as unknown, not zero.
- Distinguish quota used from quota remaining and retain reset information.
- Respect cancellation, retry limits, rate limits, and refresh deadlines.
- Use sanitized fixtures for parsing tests rather than real account captures.

### Interface expectations

Use the existing design system and preserve both light and dark themes. Check text scaling, smaller Android layouts, readable labels, and accessible touch targets. Verify changes on a device or ARM64 emulator when they affect native rendering or interaction.

## Validation

```sh
npm run check
npm run format:check
```

For an Android build check:

```sh
npm run android:preview-apk
```

The preview APK is created at `artifacts/devgauge-preview-phone.apk`. Native module, background task, WebView, and notification changes require relevant Android verification in addition to unit tests. Report what was verified and any remaining limitations in the pull request.

## Pull requests

Include:

- A clear summary of the change and its motivation.
- Links to related issues.
- Validation commands and results.
- Screenshots for visual changes.
- Notes on provider compatibility, migrations, or configuration changes.

Keep unrelated refactors out of a focused pull request. Do not commit `.env` files, signing keys, generated Android builds, APKs, logs, or private account data. The repository's ignore rules identify common local-only files.

Reviewers may request changes before merging. Respond constructively and keep discussion focused on the implementation.

## Licensing

By submitting a contribution, you agree to license your contribution under the project's [MIT License](LICENSE). Only contribute material you have the right to share. Preserve required third-party notices and identify the source and license of any new assets or dependencies.
