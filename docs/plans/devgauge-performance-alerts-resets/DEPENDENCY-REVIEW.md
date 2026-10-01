# Dependency review

Reviewed 2026-10-01. `expo install --check` reports the installed SDK 57 dependencies up to date; Expo Doctor passed 21/21 checks. Production npm audit reports **14 moderate, 0 high, 0 critical** findings, including transitive propagation from two underlying advisories. This is not a clean audit. No audit-driven SDK downgrade or unverified major override was applied.

## URI decoder — unresolved runtime dependency

Installed path: expo-router 57.0.24 → query-string 7.1.3 → decode-uri-component 0.2.2. Malformed percent-encoded input can cause excessive CPU work. The reviewed advisory identifies 0.5.0 as patched and recommends input limits as a workaround. [Advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).

A direct override is incompatible with the inspected dependency contract: query-string imports the decoder using CommonJS `require(...)` and calls that value as a function (`node_modules/query-string/index.js:3`), while 0.5.0 is an ESM-only default export. [Patched package metadata](https://github.com/SamVerschueren/decode-uri-component/blob/v0.5.0/package.json). No claim is made that existing application route validation protects every framework parser call. Resolve through a compatible upstream router/query-string upgrade, or a separately verified mitigation before public distribution; never use audit's proposed Expo/Router downgrade as an automatic fix.

## UUID — transitive toolchain finding

Installed affected path includes expo-splash-screen 57.0.9 → @expo/config-plugins 57.0.9 → xcode 3.0.1 → uuid 7.0.3. The advisory concerns external-buffer bounds in v3/v5/v6 APIs; v4 is explicitly distinguished, and 11.1.1 is one patched release. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

The inspected xcode call generates a v4 string with no external buffer (`node_modules/xcode/lib/pbxProject.js:90`). DevGauge's runtime uses Expo Crypto for UUID generation. This lowers the relevance of the reported affected API to the observed Android path; it does not erase the audit finding. Track a compatible Expo/config-plugins/xcode upgrade and recheck prebuild before changing a transitive major version.

## Build payload review

The compact same-ABI comparison retains Hermes and the identical compressed arm64 native payload (27,994,696 bytes) while R8 reduces compressed DEX from 15,667,991 to 6,446,089 bytes. Required WebView, SQLCipher, notifications, fonts and routing remain. Shrinker usage/mapping files show development launcher/menu code partly removed and release stubs retained by Expo module registration. No forced module exclusion was introduced without proving it preserves development builds and native registration. Final source candidates and hashes are in BASELINE.md; release-only payload measurements are distinct from runtime RAM.

## Remaining gate

Production remains NO-GO. Re-run compatibility, Doctor, production audit and native release checks after dependency changes. Keep the URI-decoder issue visible; zero high/critical findings alone do not close this review. Audit JSON and command logs are under `/tmp/devgauge-production-audit.json`, `/tmp/devgauge-expo-compatibility.log`, and `/tmp/devgauge-expo-doctor.log`.
