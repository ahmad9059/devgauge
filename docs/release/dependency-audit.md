# Dependency Audit Policy

CI audits npm production dependency trees and fails on unreviewed high or critical advisories. This includes Node.js build tooling installed transitively through Expo and React Native, even though that tooling is not shipped as executable Node.js code in the Android application.

## Reviewed tooling exceptions

Two advisories have no patched npm version as of October 6, 2026:

| Package    | Advisory                                                                 | Exposure in DevGauge                                                                                                                | Review deadline  |
| ---------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| braces     | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | Metro file matching during builds; patterns are repository-controlled, not provider input                                           | November 6, 2026 |
| node-forge | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Expo Node.js certificate tooling; not Android release signing or provider OAuth. Expo Updates certificate signing is not configured | November 6, 2026 |

These are scoped exceptions, not claims that the dependencies are fixed. Keep build inputs trusted and do not expose the development server to untrusted clients. Reassess if file-matching inputs or certificate verification features change.

`scripts/audit-exceptions.json` records the exact package, advisory URL, affected range, reason, and expiration. An expired exception, changed advisory range, new high/critical advisory, or invalid audit response fails the check. Moderate findings remain visible, consistent with the previous high-severity threshold.

The fixable `source-map-js` advisory was resolved by updating the lockfile to version 1.2.2. The audit does not downgrade Expo or skip the dependency check.

## Validation

```sh
npm run audit:policy-test
npm run audit:deps
```

Replace exceptions with patched dependencies when upstream fixes become available. Verify Expo compatibility, tests, production bundle export, and the release build after dependency changes.
