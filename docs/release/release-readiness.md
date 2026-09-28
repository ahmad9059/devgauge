# Release Readiness and Final Status

> Final per-provider status and the mapping of every `SECURITY.md` §14 release
> blocker. Reviewed 2026-09-28. This is a preview build; no connector is enabled.

## 1. Release blockers (SECURITY.md §14)

| Blocker | Status | Basis |
|---|---|---|
| Embedded website-session integration without feasibility/policy/cookie/deletion review | **Cleared** — none enabled | Web-session gates all false; `src/services/web-session/policy.ts` |
| Provider secret in SQLite/logs/analytics | **Cleared** | `src/security/release-security.test.ts` |
| Gemini CLI live sync via borrowed credentials / unknown routes / Gemini Apps limits | **Cleared** — no live sync | Manual user-shared import only |
| Claude/Codex auto sync without a documented review | **Cleared** — manual only | `src/providers/{claude,codex}/adapter.ts` |
| Command Code/OpenCode Go enabled without vendor permission | **Cleared** — disabled | Vendor contract gate; `liveUsage: false` |
| Missing remote/local credential deletion path | **Cleared** (local deletion verified; remote revocation provider-dependent) | `src/services/local-data.ts` |
| OAuth state/PKCE/redirect validation failure | **Cleared** | `src/services/auth/oauth-transaction.test.ts`, `pkce.test.ts` |
| Privacy disclosures not matching data flow | **Cleared** | `docs/release/privacy-data-inventory.md` |

## 2. Per-provider final status

| Provider | Status | Reason |
|---|---|---|
| GitHub Copilot | **Externally blocked** | Phase 1 Android website-session matrix + GitHub App permission spike pending; release-disabled |
| Claude | **Externally blocked** | No supported consumer quota API; manual-only pending Phase 1 gate |
| Codex | **Externally blocked** | No supported consumer quota/reset API; manual-only |
| Command Code | **Externally blocked** | No verified read-only vendor contract |
| OpenCode Go | **Externally blocked** | No verified read-only vendor contract |
| Gemini CLI | **Externally blocked** | No approved DevGauge-owned account quota source; user-shared import only |

No connector is **enabled**. No connector is **deferred-not-verified** except the
partner-API capability, which is dormant by design.

## 3. Verified in this repository

- `npm run check`: typecheck, ESLint, unit tests, and build-config checks.
- Security: seeded-secret containment, redaction, OAuth/PKCE/replay, capability
  tamper/replay, malicious route allowlist.
- Storage: migrations (fresh/prior/rollback), key-loss recovery, retention,
  delete-all, and a performance smoke test.
- Emulator: icon, splash config, encrypted storage, and the Phase 3 accessibility
  matrix (`docs/release/mobile-qa-matrix.md`).

## 4. Externally blocked / owner actions

- Final Android package ID, callback domain, legal entity, and store listing owner.
- Complete the Phase 1 signed-in Android checks (Claude/Codex/Copilot).
- GitHub App minimum-permission spike (test app).
- Vendor usage-only contracts (Command Code, OpenCode Go).
- Google account-level Gemini CLI quota contract.
- Brand/trademark review and finalized store privacy policy + Data Safety form.
- Beta cohort, crash-free target, and physical-device accessibility re-check.

## 5. Go/No-Go

- **Preview/internal testing:** GO. The app is local-first, makes no provider
  request, and every connector is honestly labeled disabled or manual.
- **Production with live connectors:** NO-GO until the externally blocked items
  above are resolved and provider contracts are revalidated on the release date.
