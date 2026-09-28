# Provider Incident and Kill-Switch Runbook

> Applies to DevGauge's provider connectors. No connector is enabled today; this
> runbook is the operational contract for when one is enabled.

## 1. Signals

- Elevated refresh failures for one provider only (auth, 5xx, or schema).
- Provider schema/endpoint change or an announced deprecation.
- A provider policy or vendor contract change affecting allowed access.
- A credential-exposure or session-containment concern.

## 2. Immediate containment (kill switch)

1. **Disable the connector remotely.** Publish a signed capability manifest with
   that provider's entry `enabled: false` for the affected environment.
   - Experimental connectors (Command Code, OpenCode Go) already require the
     manifest; a `false` entry makes the refresh engine record a
     `capability_disabled` attempt and make **no network request**.
   - Supported connectors must also respect the manifest gate before enabling
     live usage.
2. **Verify containment.** Confirm the next refresh for that provider returns
   `skipped: capability-disabled` and that no request is made. Cached data stays
   readable; local deletion remains available.
3. **Preserve evidence.** Keep sanitized error class, status, timing, and
   request IDs. Never capture tokens, cookies, or raw payloads.

## 3. Per-provider guidance

| Provider | Disable lever | Notes |
|---|---|---|
| Claude | Keep web-session gate closed / manual-only | Blocked until partner requirements met |
| Codex | Keep web-session gate closed / manual-only | First-party link + reminder only |
| GitHub Copilot | Clear `liveUsage` release flag | Candidate-disabled until Phase 6 spike |
| Command Code | Capability manifest `enabled: false` | Experimental; also requires verified contract |
| OpenCode Go | Capability manifest `enabled: false` | Experimental; isolated parser |
| Gemini CLI | Manual/user-shared only | No approved account quota source |

## 4. Credential and session response

- If a credential may be exposed: instruct users to revoke it at the provider,
  and ship a build that deletes affected local secrets on launch.
- Revocation is provider-specific; DevGauge always clears local credentials even
  when remote revocation is unavailable, and reports the remote status.
- Never ask a user to paste a token into chat or email.

## 5. Recovery and rollback

1. Fix forward with a new migration only; never edit a released migration.
2. Re-enable a connector only after: the provider contract is current, the
   schema is re-validated against fixtures, and a release re-check passes.
3. A failed migration leaves the prior database intact; recovery is a deliberate
   local reset, not an automatic destructive migration.

## 6. User communication

- Templates must be generic and non-sensitive (no usage amounts, no identifiers).
- State what was disabled, that cached data is preserved, and how to delete it.
- Do not claim an integration works when it is disabled or externally blocked.

## 7. Post-incident

- Record provider, date, signal, action, and outcome in the release log.
- Update fixtures/support tier and the capability manifest defaults.
- Re-run the security and migration test suites before the next release.
