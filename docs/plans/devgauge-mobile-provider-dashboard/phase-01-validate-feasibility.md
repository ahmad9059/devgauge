# Phase 1 — Validate Feasibility and Confirm Secure Architecture

Depends on: none

---

## 1. Structural Fact: This Was a Greenfield Repository

At validation start, the repository had only the `devgauge` heading (`README.md:1`). No live entrypoint, router, schema, provider module, storage implementation, or duplicate/legacy implementation existed to trace. The files now present are planning documents only (`IMPLEMENTATION_PLAN.md:3`).

## 2. Claim-by-Claim Validation

### 2.1 “Users can log into Claude/Codex inside DevGauge and the app stores the resulting session”

**Not approved.** Native OAuth best practice requires an external user-agent and prohibits embedded user-agents that can inspect credentials/cookies. DevGauge must not harvest sessions. The resulting boundary is documented in `SECURITY.md:15-29`.

### 2.2 “All five providers expose comparable hourly/weekly/monthly usage”

**Not confirmed.** Provider semantics differ. The validated support matrix and release gates are recorded in `PRD.md:49-65`; absent windows must remain absent rather than being invented.

### 2.3 “Codex usage can be reset with one button”

**Not confirmed as a third-party API capability.** The safe v1 action opens the first-party usage/reset page and optionally schedules a local reminder (`PRD.md:124-132`).

### 2.4 “SQLite should store application data locally”

**Confirmed as a sound architecture with constraints.** Non-secret metadata/history belongs in SQLite; credentials and the optional SQLCipher key belong in SecureStore (`DATABASE.md:5-29`).

### 2.5 “The UI should follow the supplied dark reference and also support light mode”

**Confirmed as a product requirement.** The design contract defines independent themes, typography, spacing, motion, contrast, and platform touch targets (`PRD.md:209-229`).

## 3. Recommended Architecture — Confirmed Sound with Provider Gates

- Local-first Expo application.
- Provider adapter registry with runtime response validation.
- System authentication browser for registered OAuth flows.
- SecureStore for small secrets; SQLite/optional SQLCipher for non-secret durable state.
- Stateless-with-respect-to-users broker only when confidential code exchange is unavoidable.
- Disabled/manual experiences when vendors do not offer approved APIs.

## 4. Confirmed Gaps Not Explicitly Named in the Brief

- A production callback domain, bundle ID, Android package, and legal entity are not selected.
- GitHub App permission compatibility still requires a real test-app spike.
- Experimental provider routes need exact vendor-owned contracts.
- Brand/trademark permissions and store privacy disclosures are release dependencies.

## 5. What Phase 1 Did Not Do

- No Expo project was initialized.
- No database or provider endpoint was called from application code.
- No schema/API/UI implementation was added.
- No provider credentials were collected.

## 6. Sign-Off Needed Before Phase 2

- Approve external-browser-only authentication.
- Approve local-first architecture and optional broker boundary.
- Approve SQLCipher spike.
- Supply or approve ownership for app IDs/domain/legal pages.
- Accept provider support tiers and safe Codex reset semantics.

## 7. Reference — Original Task Brief

Build and deeply plan an Expo React Native app that tracks usage limits for Claude, Codex, Command Code, OpenCode Go, and GitHub Copilot; connects providers securely; stores local data in SQLite; provides Codex reset-related UX; supports usage/connectors/settings tabs; and follows the supplied dark/light design direction.
