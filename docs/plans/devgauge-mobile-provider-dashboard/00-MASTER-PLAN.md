# DevGauge Mobile Provider Dashboard

> Status: **All ten phases delivered.** Repository-side work for Phases 1–10 is complete and verified; Phase 1 signed-in feasibility, Phase 2 device QA, and the Phase 10 owner/legal/beta items remain externally blocked. No real provider network call is enabled.
>
> Source request: research and plan a local-first **Android-only** Expo React Native usage dashboard for Claude, Codex, Command Code, OpenCode Go, GitHub Copilot and **Gemini CLI**, including dark/light design, secure provider connection, SQLite, notifications, and ten phases. The product brief is preserved in `PRD.md`.

---

## 0. How to Read This Plan

This folder is the complete ten-phase plan. The six specification documents define the cross-phase product and technical contracts; each `phase-0X-*.md` file is an independently reviewable delivery unit.

1. Validate feasibility and security boundary.
2. Bootstrap Expo foundation.
3. Build dark/light design system.
4. Implement encrypted local persistence.
5. Build the provider platform and refresh engine.
6. Prove and deliver GitHub Copilot.
7. Gate Command Code and OpenCode Go.
8. Deliver Claude/Codex session flows and Gemini CLI connection/companion flow.
9. Complete product UX and notifications.
10. Complete security, QA, privacy, and release readiness.

## 1. Validated Current State

- At research start, the repository contained only the project heading `# devgauge` (`README.md:1`); there was no application implementation to preserve.
- The planning pass produced product, architecture, database, API, security and delivery specifications. Phase 2 added an Expo route shell and CI (`package.json:1`, `app/_layout.tsx:1`, `.github/workflows/ci.yml:1`); live provider functionality is still pending.
- Claude, Codex and GitHub Copilot website-session sync is an unverified, provider-specific candidate; Command Code/OpenCode Go still need vendor usage contracts (`PRD.md` §5).
- The product owner requires app-controlled embedded sign-in for Claude, Codex and GitHub Copilot. AI Usage documents a comparable local WebView pattern for Claude/GitHub, but its listing does not prove Codex implementation or permission to replicate it (`PRD.md` §4; `SECURITY.md` §2).
- Gemini CLI is the sixth provider. Its official `/stats model` surface shows session/model and quota data, but an authorized Android cross-device quota contract still needs validation (`PRD.md` §5).

Full claim-by-claim evidence is in `phase-01-validate-feasibility.md`.

## 2. Architecture Decisions

1. Android-only Expo React Native, TypeScript strict mode, and Expo Router; no iOS target or App Store work.
2. Local-first state with no DevGauge account in v1.
3. SQLite for non-secret durable data and SecureStore for credentials/keys.
4. SQLCipher is preferred but requires a measured go/no-go spike.
5. Provider adapters normalize usage without fabricating missing values.
6. Dedicated local WebView session feasibility track for Claude/Codex/GitHub; OS-owned OAuth tabs remain a separate scoped-API option. An optional minimal broker handles confidential OAuth exchanges only.
7. Exactly six provider identifiers in v1; Gemini CLI is distinct from consumer Gemini Apps and API project usage.

See `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, and `SECURITY.md` for the binding technical contracts.

## 3. Key Design Decisions Requiring Sign-Off

| # | Decision | Default | Reason |
|---|---|---|---|
| 1 | Embedded website-session prototype | Investigate per provider/platform in Phase 1 | Play listing/privacy policy demonstrate precedent; production still needs verified usage, session behavior, and policy review |
| 2 | SQLCipher | Prefer, pending build/performance spike | Usage history may reveal work patterns |
| 3 | DevGauge account/backend | No account; broker only if required | Keeps v1 local-first and minimizes data custody |
| 4 | Provider count | Exactly six | Includes Gemini CLI and keeps adapter registry closed |
| 5 | Telemetry | No analytics SDK by default | Data inventory and consent are not yet approved |
| 6 | Final Android package/domain | Open | Needed for Android App Links, callbacks, privacy policy, and Play Store |

**Feasibility gate:** A competitor documents local WebView sessions, so do not rule out the requested design as technically impossible. Its listing does not establish DevGauge's exact per-provider implementation or third-party approval. Phase 1 must validate each path; fallback OAuth/manual experiences do not fulfill the requested session flow unless the owner explicitly accepts them.

## 4. Risk / Backlog Register

| # | Item | Severity | Notes |
|---|---|---|---|
| R1 | Provider APIs differ materially | High | Preserve provider-native units and nullable fields |
| R2 | SQLCipher excludes Expo Go workflow | Medium | Use development builds from Phase 2 |
| R3 | OAuth callback domain not selected | High | Blocks production registration, not foundation work |
| R4 | Broad API keys may authorize spend | High | Require acceptable scopes/contracts before enabling connectors |
| R5 | Provider limits change frequently | Medium | Source dates, fixtures, capability gates, release revalidation |
| R6 | Gemini CLI quota may be available only inside the CLI | High | Validate DevGauge-owned OAuth/approved quota source or user-shared CLI stats; do not substitute consumer chat usage |

## 5. Phase Map

| Phase | Title | Status |
|---|---|---|
| 1 | Validate Feasibility and Secure Product Boundary | WebView and Gemini CLI quota/auth spikes pending |
| 2 | Bootstrap Expo Application Foundation | Code/checks and internal preview APK built; Android device QA pending |
| 3 | Build Dark/Light Design System and Navigation | Complete; verified on phone/tablet emulators |
| 4 | Implement Encrypted Local Persistence | Complete; SQLCipher and repositories verified on emulator |
| 5 | Build Provider Platform and Refresh Engine | Complete; domain, HTTP policy, refresh engine, and capability manifest implemented |
| 6 | Prove and Deliver GitHub Copilot Connector | Implemented release-disabled; live enablement blocked on the Phase 1 matrix and GitHub App permission spike |
| 7 | Gate Command Code and OpenCode Go Connectors | Connector shells complete and tested; live access disabled pending vendor contracts |
| 8 | Deliver Claude/Codex Sessions and Gemini CLI Connector | Manual/blocked flows, Gemini CLI user-shared import, and reminders delivered; live sync gated |
| 9 | Complete Product UX and Notifications | View models, settings persistence, and notifications delivered |
| 10 | Security Hardening, QA, Privacy, and Release | Repository artifacts complete; owner/legal/beta items externally blocked |

## 6. Cross-Cutting Rules

- One scoped branch/PR per phase or independently reviewable slice.
- Do not add provider credentials, real response payloads, or secrets to fixtures.
- All dynamic SQL values are bound; released migrations are immutable.
- Typecheck, lint, unit tests, security checks, and applicable platform builds gate merge.
- Manual Android device/emulator and TalkBack QA is required; AI-only verification is insufficient.
- No blocked or experimental capability may be enabled merely for a demo.
- New current-state claims require real `path:line` evidence.

## 7. Next Step

Run the remaining signed-in Phase 1 Android session tests and finish Phase 2 native/device QA. Resolve product identifiers, test accounts and the sign-off decisions before provider network implementation; see `PHASE-01-FEASIBILITY.md` and `PHASE-02-EXECUTION.md`.
