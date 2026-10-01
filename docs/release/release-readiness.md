# Release readiness

Reviewed 2026-10-01. The performance/alerts/reset goal is in progress. Earlier claims that the app makes no provider requests are obsolete.

## Runtime behavior

| Provider | Mounted transport | Remaining release evidence |
|---|---|---|
| Claude / Codex | First-party WebView session usage capture | Signed-in Android/account matrix, provider policy/cookie review |
| GitHub Copilot | First-party WebView session usage capture | Signed-in matrix and minimum permission review; separate OAuth adapter gates remain |
| Command Code / OpenCode Go | First-party WebView session capture | Vendor contract/policy review; experimental partner API remains gated |
| Antigravity (`gemini-cli` storage ID) | Account-bound Google OAuth quota transport | Signed-in warm/cold quota and account-level contract validation |

`src/providers/registry.ts` exposes the mounted transport modes separately from legacy adapter capabilities. Adapter `liveUsage: false` does not disable the already mounted WebView/OAuth paths. Earned-reset UI was removed at the owner’s request; no direct earned-reset transport is enabled. [Verified reset contracts](../plans/devgauge-performance-alerts-resets/RESET-CONTRACTS.md) explain the gap.

## Implemented safeguards

- Encrypted SQLCipher storage and SecureStore vault; forward migrations and atomic snapshot/connection writes.
- Shared bounded refresh coordination with deadlines, persisted cooldowns and changed-connection guards.
- Explicit unit normalization and reset instants; unknown amounts/reset times stay unknown.
- Persisted notification rules, native operation journal, contextual permission requests, owned schedule reconciliation and allowlisted taps.
- Provider disconnect invalidates late writes before cleanup. Delete-all cancels owned reminders before deleting data/key; failure can be retried.
- Global WebView cookies are preserved to avoid signing out unrelated accounts. Provider-specific cookie deletion is unproved; the UI discloses remaining browser sign-in. Remote revocation is not universally supported.

## Verification and open work

Current aggregate checks and artifact evidence live in [EXECUTION-LOG.md](../plans/devgauge-performance-alerts-resets/EXECUTION-LOG.md) and [BASELINE.md](../plans/devgauge-performance-alerts-resets/BASELINE.md). Unit tests do not prove real account reset consumption, OS notification delivery or physical-device accessibility.

Required before production: owner-approved package/callback/legal/store configuration; provider feasibility and policy evidence; live account transport trials; final release artifacts and native startup/storage/notification tests; physical phone/TalkBack QA; complete privacy/Data Safety and beta review. A production AAB cannot be labeled final before the application ID is supplied.

Dependency review currently reports 14 moderate, zero high/critical production findings in transitive Expo tooling/router dependencies. Expo dependency compatibility and Doctor passed. Audit-proposed SDK downgrades have not been applied; advisory dispositions and final recheck remain open.

**Production: NO-GO.** Internal APKs are verification artifacts, not a completed release or proof that every provider contract is approved.
