# DevGauge Mobile Provider Dashboard

> Status: **Planning; Phase 1 validation complete.** No schema/API/UI implementation has been made.
>
> Source request: research and plan a local-first Expo React Native usage dashboard for Claude, Codex, Command Code, OpenCode Go, and GitHub Copilot, including dark/light design, secure provider connection, SQLite, notifications, and ten phases. The product brief is preserved in `PRD.md`.

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
8. Deliver Claude and Codex safe companion flows.
9. Complete product UX and notifications.
10. Complete security, QA, privacy, and release readiness.

## 1. Validated Current State

- At research start, the repository contained only the project heading `# devgauge` (`README.md:1`); there was no application implementation to preserve.
- The planning pass has now produced the product, architecture, database, API, security, and implementation specifications, but no feature code (`PRD.md:3`, `IMPLEMENTATION_PLAN.md:3`).
- Provider feasibility is unequal: Claude/Codex consumer synchronization is blocked, Command Code/OpenCode Go are experimental pending contracts, and GitHub is candidate-supported pending a permission spike (`PRD.md:49-65`).
- The proposed auth model rejects embedded WebView/session capture and uses system-browser OAuth or approved API keys (`SECURITY.md:15-29`).

Full claim-by-claim evidence is in `phase-01-validate-feasibility.md`.

## 2. Architecture Decisions

1. Expo React Native, TypeScript strict mode, and Expo Router.
2. Local-first state with no DevGauge account in v1.
3. SQLite for non-secret durable data and SecureStore for credentials/keys.
4. SQLCipher is preferred but requires a measured go/no-go spike.
5. Provider adapters normalize usage without fabricating missing values.
6. External auth sessions only; an optional minimal broker handles confidential exchanges.
7. Exactly five provider identifiers in v1.

See `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, and `SECURITY.md` for the binding technical contracts.

## 3. Key Design Decisions Requiring Sign-Off

| # | Decision | Default | Reason |
|---|---|---|---|
| 1 | Embedded provider login/session capture | Reject | Password-equivalent credential and policy risk |
| 2 | SQLCipher | Prefer, pending build/performance spike | Usage history may reveal work patterns |
| 3 | DevGauge account/backend | No account; broker only if required | Keeps v1 local-first and minimizes data custody |
| 4 | Provider count | Exactly five | Matches requested scope and keeps adapter registry closed |
| 5 | Telemetry | No analytics SDK by default | Data inventory and consent are not yet approved |
| 6 | Final app IDs/domain | Open | Needed for links, callbacks, privacy policy, and stores |

## 4. Risk / Backlog Register

| # | Item | Severity | Notes |
|---|---|---|---|
| R1 | Provider APIs differ materially | High | Preserve provider-native units and nullable fields |
| R2 | SQLCipher excludes Expo Go workflow | Medium | Use development builds from Phase 2 |
| R3 | OAuth callback domain not selected | High | Blocks production registration, not foundation work |
| R4 | Broad API keys may authorize spend | High | Require acceptable scopes/contracts before enabling connectors |
| R5 | Provider limits change frequently | Medium | Source dates, fixtures, capability gates, release revalidation |

## 5. Phase Map

| Phase | Title | Status |
|---|---|---|
| 1 | Validate Feasibility and Secure Product Boundary | Validation complete; sign-off pending |
| 2 | Bootstrap Expo Application Foundation | Not started |
| 3 | Build Dark/Light Design System and Navigation | Not started |
| 4 | Implement Encrypted Local Persistence | Not started |
| 5 | Build Provider Platform and Refresh Engine | Not started |
| 6 | Prove and Deliver GitHub Copilot Connector | Not started |
| 7 | Gate Command Code and OpenCode Go Connectors | Not started |
| 8 | Deliver Claude and Codex Safe Companion Flows | Not started |
| 9 | Complete Product UX and Notifications | Not started |
| 10 | Security Hardening, QA, Privacy, and Release | Not started |

## 6. Cross-Cutting Rules

- One scoped branch/PR per phase or independently reviewable slice.
- Do not add provider credentials, real response payloads, or secrets to fixtures.
- All dynamic SQL values are bound; released migrations are immutable.
- Typecheck, lint, unit tests, security checks, and applicable platform builds gate merge.
- Manual iOS and Android QA is required; AI-only verification is insufficient.
- No blocked or experimental capability may be enabled merely for a demo.
- New current-state claims require real `path:line` evidence.

## 7. Next Step

Confirm the sign-off decisions in Section 3. Then execute Phase 2. Provider outreach can begin in parallel, but provider network implementation remains gated by Phase 5 and the relevant vendor contracts.
