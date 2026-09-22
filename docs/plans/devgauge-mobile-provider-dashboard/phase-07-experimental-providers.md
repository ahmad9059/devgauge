# Phase 7 — Gate Command Code and OpenCode Go Connectors

Depends on: Phase 5; vendor approval gates live network enablement

---

## 1. Goal

Build safe connector shells for Command Code and OpenCode Go while ensuring undocumented routes or overpowered API keys cannot silently become production integrations.

## 2. Scope

### In scope

- Vendor outreach and contract capture.
- Secure API-key input, validation, storage, and deletion.
- Isolated parsers/normalizers and provider-specific fixtures.
- Signed kill-switch behavior and schema-change fallback.
- Experimental disclosures, broad-key warnings, and revocation guidance.

### Out of scope

- Calls to unverified endpoints.
- Browser-session extraction.
- Enabling a broad-spend credential without approved risk treatment.

## 3. Detailed Tasks / Design

1. Obtain exact vendor-owned usage endpoint, auth scope, response schema, polling limits, revocation, and distribution permission.
2. Keep production capability false until all required contract fields are recorded.
3. Open official key-management page; accept key only in a secure native field.
4. Validate identity/usage before persisting a credential reference.
5. Implement strict runtime schemas and provider-native five-hour/weekly/monthly mapping only when supplied or documented.
6. Preserve last successful cache on transient/schema failure.
7. Honor kill switch while retaining read-only cache and local deletion.
8. Provide explicit disconnect and vendor-side key revocation instructions.

## 4. Files Touched

- `src/providers/command-code/**` (new)
- `src/providers/opencode-go/**` (new)
- `src/components/connectors/experimental-disclosure.tsx` (new)
- `src/features/connections/api-key-form.tsx` (new)
- provider fixtures, contract tests, and security tests (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] No request is made without exact vendor-owned contract evidence.
- [ ] API keys never appear in SQLite, logs, diagnostics, or screenshots.
- [ ] Broad-key risk is disclosed and explicitly accepted, or connector remains disabled.
- [ ] `429`, expired key, malformed schema, offline, and provider outage states are tested.
- [ ] Kill switch stops requests without preventing deletion.
- [ ] Provider failures remain isolated.
- [ ] Disconnect removes the local secret and explains remote revocation.

## 6. Open Questions

- Whether either vendor will issue usage-only/read-only credentials.
- Stable endpoint and schema commitments.
- Allowed polling frequency and third-party client distribution terms.
