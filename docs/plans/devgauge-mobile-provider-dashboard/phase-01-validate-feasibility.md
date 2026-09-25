# Phase 1 — Validate Feasibility and Confirm Secure Architecture

Depends on: none

---

## 1. Structural Fact: This Was a Greenfield Repository

At validation start, the repository had only the `devgauge` heading (`README.md:1`). No live entrypoint, router, schema, provider module, storage implementation, or duplicate/legacy implementation existed to trace. The files now present are planning documents only (`IMPLEMENTATION_PLAN.md:3`).

## 2. Claim-by-Claim Validation

### 2.1 “Users can log into Claude/Codex inside DevGauge and the app stores the resulting session”

**Technically plausible; not yet validated for DevGauge.** [AI Usage](https://play.google.com/store/apps/details?id=u.sage&hl=en) advertises Claude, Codex and Copilot; its [privacy policy](https://usage-4e75d.web.app/privacy-policy.html) describes local embedded-WebView sign-in for Claude/GitHub. This is evidence of a shipped Android approach, not a source-code audit, Codex flow proof, or provider approval. RFC 8252 still advises against an embedded OAuth user-agent; website-session login and an OAuth app grant must not be conflated. Phase 1 research is reopened for an Android per-provider feasibility spike.

### 2.2 “All six providers expose comparable hourly/weekly/monthly usage”

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
- Dedicated local embedded WebView feasibility track for requested website-session flows; system authentication browser for distinct registered OAuth API flows.
- SecureStore for small secrets; SQLite/optional SQLCipher for non-secret durable state.
- Stateless-with-respect-to-users broker only when confidential code exchange is unavoidable.
- Disabled/manual experiences while any session integration remains unverified or fails its release gate.

## 4. Confirmed Gaps Not Explicitly Named in the Brief

- A production callback domain, Android package, and legal entity are not selected.
- Gemini CLI is a coding agent, not Gemini Apps; documented `/stats model` does not yet prove an Android-accessible account-wide quota API.
- GitHub App permission compatibility still requires a real test-app spike.
- Experimental provider routes need exact vendor-owned contracts.
- Brand/trademark permissions and store privacy disclosures are release dependencies.

## 5. What Phase 1 Did Not Do

- No Expo project was initialized.
- No database or provider endpoint was called from application code.
- No schema/API/UI implementation was added.
- No provider credentials were collected.

## 5a. Reopened Embedded-Session Spike (pending)

- Build a disposable Expo development build using `react-native-webview` on Android, separate from production connector code; use only test accounts and keep all outputs sanitized.
- For each of Claude, Codex and GitHub Copilot, verify official login redirects/MFA, local session persistence across restart, a minimal first-party usage read, refresh after expiry, logout, and account switching.
- Inspect real platform cookie-store behavior, including whether one provider/account can be deleted without affecting others. Verify WebView bridge and navigation restrictions before recording a pass.
- Record tested Android/WebView versions, date, first-party usage source, policy/terms assessment, and pass/fail for each provider. A comparator's published behavior is not a substitute for these tests.
- Separately investigate Gemini CLI via its official `/stats model`, auth and quota documentation. Prove a DevGauge-owned authorized account-level quota source before claiming live phone sync; otherwise document a user-shared stats/import workflow without reusing CLI credentials.
- Do not advance a failed or undocumented flow to Phases 6/8; retain a clearly labeled disabled/manual fallback pending an owner decision.

## 6. Sign-Off Needed Before Phase 2

- **Reopened validation:** The product owner supplied a shipped Android comparator documenting local WebView sessions. Before Phase 2, prototype official-site login, session persistence, usage access, logout and failure recovery for Claude, Codex and Copilot on Android; document policy/terms and fallback decisions. Also validate Gemini CLI-specific quota access independently of Gemini Apps.

- Approve external-browser-only authentication.
- Approve local-first architecture and optional broker boundary.
- Approve SQLCipher spike.
- Supply or approve ownership for app IDs/domain/legal pages.
- Accept provider support tiers and safe Codex reset semantics.

## 7. Reference — Original Task Brief

Build and deeply plan an Expo React Native app that tracks usage limits for Claude, Codex, Command Code, OpenCode Go, and GitHub Copilot; connects providers securely; stores local data in SQLite; provides Codex reset-related UX; supports usage/connectors/settings tabs; and follows the supplied dark/light design direction.
