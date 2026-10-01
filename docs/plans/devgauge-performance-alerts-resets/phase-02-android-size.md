# Phase 2 — Reduce Android Artifact Size

Depends on: 1

## 1. Goal

Fix dominant packaging/native overhead using durable Expo configuration. Evidence: Phase 1 A01–A03; scripts/build-progress.mjs:74 regenerates native files.

## 2. Scope

In scope: tasks below. Other phase responsibilities and production publishing are outside this phase.

## 3. Detailed Tasks / Design

Measure APK/AAB/download/installed sizes with ABI/library/DEX breakdowns. Add SDK-compatible expo-build-properties (or verified equivalent) to app.config.ts for R8 and resource shrinking. Make compact arm64 preview and emulator profiles reproducible, while retaining appropriate production ABI support via AAB splits. Audit release inclusion of expo-dev-client/diagnostics through dependency and artifact analysis; remove only proven unused release components, preserving development workflows. Check JS/fonts/images second. Keep SQLCipher/Hermes. Do not enable JS bundle compression without testing startup tradeoff. Add a repeatable size-report script and thresholds. Verify clean prebuild retains settings.

### Separate commit slices

- `build(android): enable reproducible release shrinking`
- `build(android): split compact phone and emulator artifacts`
- `perf(android): remove measured unused release payload`
- `chore(perf): add artifact size reports and budgets`

## 4. Files Touched

app.config.ts; eas.json; package.json/package-lock.json; scripts/build-test-apk.sh; scripts/build-progress.mjs; scripts/report-android-size.mjs (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] Compare same-ABI before/after and universal vs compact clearly; pursue >=50% compact APK reduction.
- [ ] Clean prebuild and release builds succeed; encrypted DB, WebView login, font/icon rendering and notifications work.
- [ ] Record final bytes/checksum, installed size and architecture compatibility; no secrets/debug diagnostics in production.

## 6. Open Questions

Exact size floor and release-only dependency removal depend on artifact measurements. No signed production upload is required.
