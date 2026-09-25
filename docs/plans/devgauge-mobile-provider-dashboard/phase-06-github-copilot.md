# Phase 6 — Prove and Deliver GitHub Copilot Connector

Depends on: Phase 5

---

## 1. Goal

Prove an embedded GitHub website session can access the intended usage surface locally and durably on Android; independently test whether GitHub App authorization can access billing endpoints as a scoped-API fallback.

**Product gate:** GitHub App OAuth yields a scoped API token, not the requested website session. The comparator's privacy policy describes a GitHub WebView connection, so first investigate that flow. Passing the API-token permission spike alone does not satisfy the owner's embedded sign-in requirement.

## 2. Scope

### In scope

- Test GitHub App registration and minimum permission discovery.
- Prototype embedded GitHub login, cookie persistence, usage access, and logout on Android; document provider policy and account scopes.
- Browser PKCE versus device-flow spike.
- Optional OAuth broker transaction, replay, exchange, refresh, and revocation path.
- Personal and organization billing usage adapters.
- Account-scope selection, consent, reauthorization, disconnect, and errors.

### Out of scope

- Repository/code permissions unrelated to billing usage.
- Fabricated entitlement caps.
- Other provider integrations.

## 3. Detailed Tasks / Design

1. Register a test app and call each intended endpoint with a GitHub App user token.
1a. Execute the Phase 1 WebView test matrix for GitHub and record whether website-session usage access is stable, local and permitted; implement that path only if it passes review.
2. Record exact accepted account permission and account-type coverage.
3. Prefer direct native/device authorization when compliant; otherwise deploy the minimal broker defined in `API.md`.
4. Bind broker transaction ID, state, PKCE challenge, provider, callback, expiry, and consumed status in a TTL replay store.
5. Implement personal AI credit/premium usage and a separate organization-admin path.
6. Normalize billing-period quantities without inventing missing limits.
7. Store credential material in SecureStore and support remote revocation/local deletion.
8. Keep connector candidate-disabled when any feasibility gate fails.

## 4. Files Touched

- `src/providers/github-copilot/{adapter,client,schema,normalize,auth}.ts` (new)
- `src/providers/github-copilot/fixtures/**` (new)
- `src/services/auth/**` (new/update)
- `src/features/connections/github/**` (new)
- `broker/**` deployment/routes/security files if required (new)
- connector contract, security, component, and E2E tests (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] Real test proves every enabled endpoint and minimum permission.
- [ ] If the requested WebView path is enabled, Android session persistence, usage access, cookie containment and logout are demonstrated with sanitized evidence.
- [ ] Personal and organization scopes are never conflated.
- [ ] PKCE, state mismatch, callback mismatch, expiry, and replay tests pass.
- [ ] Broker, if used, has managed secrets, TLS, TTL store, no-store logs, monitoring, rate limits, and rollback runbook.
- [ ] Unknown cap renders as unknown, not zero/unlimited.
- [ ] Disconnect revokes where supported and always clears local credentials.
- [ ] Failed feasibility leaves a clear release-disabled card.

## 6. Open Questions

- Exact GitHub App account permission accepted by billing APIs.
- Browser PKCE versus device flow availability for this app type.
- Whether target personal plans expose entitlement cap or consumption only.
