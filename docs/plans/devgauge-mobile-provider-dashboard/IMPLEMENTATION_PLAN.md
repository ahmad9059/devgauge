# DevGauge Implementation Plan

> Status: **Planning; embedded-session feasibility reopened.** At the start of planning no feature code existed (`README.md:1`), and no feature code has been added; only planning documents were created.
>
> The request specifies ten explicit phases. All ten are delivered in this folder as `phase-01` through `phase-10`, with one master plan and the six supporting specification documents.

## 0. How to Read This Plan

- `PRD.md` defines product behavior and design intent.
- `ARCHITECTURE.md` defines module boundaries and runtime flows.
- `DATABASE.md` defines local persistence and migration rules.
- `API.md` defines provider/broker contracts and support tiers.
- `SECURITY.md` defines non-negotiable controls and release blockers.
- This file defines delivery order, scope, files, and gates.

Nothing after Phase 1 starts until its embedded-session spike and the sign-off decisions below are resolved.

## 1. Validated Current State

- Before this planning pass, the repository contained only `README.md`, whose sole content is `# devgauge` (`README.md:1`). It now also contains this documentation set, but still has no feature implementation.
- At the validated starting point there was no Expo project, application entrypoint, package stack, database, auth, provider integration, design system, test setup, CI, or prior plan style to preserve (`README.md:1`).
- The [AI Usage Play listing](https://play.google.com/store/apps/details?id=u.sage&hl=en) and [privacy policy](https://usage-4e75d.web.app/privacy-policy.html) demonstrate a shipped Android app advertising these providers and documenting local embedded WebView sessions for Claude/GitHub. This proves feasibility in principle, not DevGauge's exact integrations, provider authorization, Codex flow, or Gemini **CLI** tracking. RFC 8252 recommends external user-agents for delegated OAuth; a website session is not an OAuth app grant.
- GitHub Copilot billing usage has documented API endpoints, but compatible GitHub App user permissions/authentication remain a Phase 6 feasibility gate.
- Claude/Codex consumer usage has no documented public third-party quota API; embedded website-session access is now an explicit feasibility track, not a proven production contract.
- Command Code/OpenCode Go must remain experimental until usage contracts are confirmed.

## 2. Architecture Decisions

1. Android-only local-first Expo application; no DevGauge account in v1.
2. Expo Router, TypeScript strict mode, SQLite, SecureStore, a gated local WebView-session path for Claude/Codex/Copilot, external browser OAuth for distinct API-token flows, and local notifications.
3. Provider adapters normalize data while preserving provider-native units and nulls.
4. Optional stateless broker only for confidential OAuth exchange/revocation.
5. WebView session handling is local, per-provider, explicitly disclosed and tested; no password interception, credential-file import, cross-provider cookie reuse, or quota circumvention.
6. Exactly six provider IDs in v1, including Gemini CLI.

## 3. Decisions Requiring Sign-Off

| # | Decision | Default in this plan | Why it matters |
|---|---|---|---|
| 1 | Embedded website-session sign-in | Prototype Claude/Codex/Copilot on Android | Comparator confirms shipped pattern, not each provider's authorization or reliability |
| 2 | Claude/Codex launch behavior | WebView feasibility first; disable live sync and offer links/reminders if spike fails | No public consumer quota API; fallback needs owner acceptance |
| 3 | Codex reset | Open first-party reset/usage page only | No public reset API; no misleading claim |
| 4 | Command Code/OpenCode Go | Experimental behind kill switch | Usage endpoints are not stable public contracts |
| 5 | GitHub auth | WebView website session spike first; GitHub App/broker as distinct fallback | OAuth API token is not website session |
| 6 | SQLite encryption | SQLCipher preferred | Protects usage history but requires development builds |
| 7 | Telemetry | No analytics SDK by default | Avoid collecting sensitive usage/account metadata before policy exists |

**Required feasibility spike:** The product owner requires app-controlled embedded browser login and local website-session access for Claude, Codex and Copilot. A shipped comparator documents such a design for Claude/GitHub. Phase 1 now validates it per provider and platform; Phases 6/8 implement only paths passing that gate. OAuth/manual flows remain non-equivalent fallbacks requiring explicit owner acceptance.

**Gemini CLI addition:** The sixth provider is Google's CLI coding agent, not consumer Gemini Apps. Phase 1 checks DevGauge-owned quota authorization and the meaning of `/stats model`; Phase 8 implements approved live access or user-shared stats. The app ships for Android only.

## 4. Requested Workstream Mapping

| Requested workstream | Delivery phase |
|---|---|
| 1. Validate repository and providers | Phase 1 |
| 2. Expo foundation | Phase 2 |
| 3. Dark/light design system | Phase 3 |
| 4. SQLite and SecureStore | Phase 4 |
| 5. Provider domain/API framework | Phase 5 |
| 6. GitHub Copilot connector feasibility and delivery | Phase 6 |
| 7. Command Code/OpenCode Go connectors | Phase 7 |
| 8. Claude/Codex sessions, Gemini CLI connector and reset handoff | Phase 8 |
| 9. Dashboard, settings, notifications | Phase 9 |
| 10. Security, QA, privacy, release | Phase 10 |

## 5. Phase Map

| Phase | Title | Status | Depends on |
|---|---|---|---|
| 1 | Validate Feasibility and Secure Product Boundary | Embedded-session and Gemini CLI quota/auth spikes pending | None |
| 2 | Bootstrap Expo Application Foundation | Not started | Phase 1 sign-off |
| 3 | Build Dark/Light Design System and Navigation | Not started | Phase 2 |
| 4 | Implement Encrypted Local Persistence | Not started | Phase 2 |
| 5 | Build Provider Platform and Refresh Engine | Not started | Phases 3-4 |
| 6 | Prove and Deliver GitHub Copilot Connector | Not started | Phase 5 |
| 7 | Gate Command Code and OpenCode Go Connectors | Not started | Phase 5; vendor approval gates network enablement only |
| 8 | Deliver Claude/Codex Sessions and Gemini CLI Connector | Not started | Phase 5 |
| 9 | Complete Usage, Connector, Settings, and Notifications UX | Not started | Phases 6-8; vendor approval is not required for disabled shells |
| 10 | Security Hardening, QA, Privacy, and Release Readiness | Not started | Phase 9 |

## 6. Phase 1 - Validate Feasibility and Secure Product Boundary

**Goal:** Convert the initial concept into an implementable, policy-safe scope before project initialization.

### In scope

- Confirm the repository was greenfield at planning start (`README.md:1`).
- Research all six providers, including Gemini CLI quota/auth distinctions, using official docs/primary repositories.
- Separate consumer quota, API usage, and enterprise billing concepts.
- Define supported, experimental, and blocked connector tiers.
- Prototype dedicated embedded WebView sign-in on Android for Claude, Codex and GitHub; validate local cookie/session retention, usage access, logout and provider-policy constraints without logging or exporting credentials.
- Validate whether a DevGauge-owned OAuth client can read account-level Gemini CLI quota through a documented Google contract; distinguish it from CLI-local `/stats model` and Gemini Apps usage.
- Define safe Codex reset semantics.
- Produce the six planning documents.
- Obtain product-owner decisions in Section 3.

### Out of scope

- Expo initialization.
- Provider registration or vendor outreach execution.
- Any production code.

### Files touched

- `docs/plans/devgauge-mobile-provider-dashboard/PRD.md` (new)
- `docs/plans/devgauge-mobile-provider-dashboard/ARCHITECTURE.md` (new)
- `docs/plans/devgauge-mobile-provider-dashboard/DATABASE.md` (new)
- `docs/plans/devgauge-mobile-provider-dashboard/API.md` (new)
- `docs/plans/devgauge-mobile-provider-dashboard/SECURITY.md` (new)
- `docs/plans/devgauge-mobile-provider-dashboard/IMPLEMENTATION_PLAN.md` (new)

### Acceptance criteria

- [x] Every current repository claim cites an opened file and line.
- [x] Every provider has a provisional support tier and official/primary product sources; undocumented candidate routes are explicitly marked unverified and blocked.
- [ ] WebView session feasibility and provider/platform review are documented with pass/fail criteria and sanitized evidence.
- [x] Requested product, design, database, API, security, and delivery scopes are documented.
- [ ] Product owner confirms all seven sign-off decisions.
- [ ] Vendor outreach owners and deadlines are assigned.

### Open questions

- Does `Codex reset` mean banked reset redemption, opening the usage page, starting a new chat, or clearing local cache?
- Is a small broker deployment acceptable if GitHub requires confidential exchange?
- Which legal entity/domain will own OAuth callbacks, app IDs, privacy policy, and store listings?

## 7. Phase 2 - Bootstrap Expo Application Foundation

**Goal:** Establish a production-capable Expo project, development workflow, and typed route shell before visual or provider feature implementation.

### In scope

- Initialize current stable Expo/React Native with TypeScript and Expo Router.
- Pin package manager, Node version, Expo SDK, and EAS configuration.
- Configure Android package, reverse-domain scheme and Android App Link/callback domains; EAS targets Android only.
- Add strict TypeScript, lint, formatting, unit tests, CI, and environment validation.
- Implement route skeleton for onboarding, tabs, provider detail, connector flow, legal/support.
- Configure development, preview, and production build profiles without embedding secrets.
- Establish path aliases, environment schema validation, error boundary, and test bootstrap.

### Proposed files

- `package.json`, lockfile, `app.config.ts`, `eas.json`, `tsconfig.json`, lint/format/test configs (new)
- `app/**` route files (new)
- `src/config/environment.ts` (new)
- `src/components/app-error-boundary.tsx` (new)
- `.github/workflows/ci.yml` (new)

### Acceptance criteria

- [ ] Android development build launches on supported device/emulator.
- [ ] Typed routes compile and deep-link test routes resolve.
- [ ] Development, preview, and production configuration boundaries are validated.
- [ ] CI runs typecheck, lint, unit tests, and dependency audit.
- [ ] No secrets or provider client secrets are present in app config.

### Open questions

- Final Android package/domain.
- Package manager and supported Node version.

## 8. Phase 3 - Build Dark/Light Design System and Navigation

**Goal:** Translate the supplied layout frame and dark visual reference into an accessible, token-driven mobile design system and complete three-tab navigation shell.

### In scope

- Create semantic dark/light color tokens, typography, spacing, radii, icon sizes, elevation, and motion tokens.
- Implement Usage, Connectors, and Settings tab shells with safe-area-aware bottom navigation.
- Build primitives: Screen, Header, Card, Button, ProgressBar, StatusChip, ListRow, Sheet, EmptyState, ErrorState, and Skeleton.
- Build static fixtures for all six provider cards and every support/connection state.
- Define responsive phone/tablet layouts and landscape behavior.
- Add accessibility semantics, platform touch targets, Dynamic Type behavior, reduced motion, and contrast tests.

### Design requirements

- Dark default follows the supplied premium near-black reference without copying commerce patterns.
- Light mode is independently designed and tested rather than mechanically inverted.
- IBM Plex Sans is used for body/UI and JetBrains Mono selectively for usage data, subject to licensing and bundle review.
- Bottom tabs use one vector icon family and visible text labels for Usage, Connectors, and Settings.
- All interactions meet 48dp Android minimum targets and provide pressed/disabled/focus states.
- Progress bars always include readable values and never depend on color alone.

### Proposed files

- `src/design/{tokens,themes,typography,motion}.ts` (new)
- `src/components/ui/**` (new)
- `src/components/usage/provider-card.tsx` (new)
- `src/components/connectors/connector-card.tsx` (new)
- `src/testing/fixtures/providers.ts` (new)
- `app/(tabs)/**` layout/shell files (new)

### Acceptance criteria

- [ ] Three-tab shell matches the supplied information architecture on small/large phones and tablets.
- [ ] Dark and light snapshots cover every primitive and state.
- [ ] Contrast meets 4.5:1 text and 3:1 meaningful non-text requirements.
- [ ] Largest supported text sizes do not hide values or actions.
- [ ] TalkBack order and labels are verified on representative Android screens.
- [ ] Reduced-motion mode removes non-essential transitions.
- [ ] No emoji or unofficial provider artwork is used as a structural icon.

### Open questions

- Exact font weights to bundle versus system-font fallback.
- Final approved provider brand assets.
- Whether tablet uses one wide column or a two-column provider grid in v1.

## 9. Phase 4 - Implement Encrypted Local Persistence

**Goal:** Establish durable, migration-safe local state and secret separation.

### In scope

- Add `expo-sqlite` and `expo-secure-store`.
- Make SQLCipher go/no-go decision through a development-build spike.
- Implement database initialization, WAL, foreign keys, key application, and versioned migrations.
- Implement schema in `DATABASE.md`.
- Add typed repositories for connections, snapshots, attempts, notification rules, settings, and manual reset entries.
- Implement credential vault with namespaced keys and explicit deletion.
- Add retention and delete-all services.
- Add redacted diagnostics export.

### Proposed files

- `src/storage/database.ts` (new)
- `src/storage/migrations/0001-initial-schema.ts` (new)
- `src/storage/repositories/*.ts` (new)
- `src/storage/secure-vault.ts` (new)
- `src/services/diagnostics/export.ts` (new)
- migration/repository/security tests and database fixtures (new)

### Acceptance criteria

- [ ] Fresh and prior-version fixtures migrate transactionally.
- [ ] SQLCipher database cannot be opened without key when enabled.
- [ ] Key-loss recovery is documented and tested.
- [ ] Database exports contain no seeded fake token/API key.
- [ ] Dynamic SQL values are bound.
- [ ] Disconnect/delete cascades data and SecureStore entries correctly.
- [ ] Android reinstall/backup behavior has manual QA records.

### Open questions

- SQLCipher approval after build-size/startup measurements.
- Default history retention: proposed 90 days.
- Whether optional biometric lock belongs in v1 or post-v1.

## 10. Phase 5 - Build Provider Platform and Refresh Engine

**Goal:** Build provider-independent connection, fetch, normalization, cache, and error infrastructure.

### In scope

- Domain models and provider registry for exactly six IDs, including `gemini-cli`.
- Adapter interface and capability descriptors.
- HTTP client with allowlisted hosts, timeout, cancellation, concurrency, backoff, and redaction.
- Refresh state machine and per-connection mutex.
- Zod schema validation and versioned fixture contracts.
- Foreground/manual refresh orchestration and stale-cache behavior.
- Signed capability manifest verification for experimental connectors.
- App lifecycle/network awareness.
- Mock provider adapter for UI/E2E tests.

### Proposed files

- `src/domain/{providers,usage,errors}.ts` (new)
- `src/providers/{registry,types}.ts` (new)
- `src/services/network/{client,backoff,redaction}.ts` (new)
- `src/features/dashboard/refresh-provider.ts` (new)
- `src/services/capabilities/**` (new)
- provider contract test harness and fixtures (new)

### Acceptance criteria

- [ ] Unknown limits remain null end-to-end.
- [ ] One adapter failure does not block other adapters.
- [ ] Duplicate refreshes coalesce.
- [ ] `429` and `Retry-After` behavior is tested.
- [ ] Malformed/oversized provider payloads fail safely.
- [ ] Capability manifest signature, audience/environment, issue/expiry time, clock-skew, and lower-version replay tests pass.
- [ ] Logs contain no seeded fake secrets.

### Open questions

- Manifest hosting/signing owner.
- Exact default refresh TTL per approved provider contract.

## 11. Phase 6 - Prove and Deliver GitHub Copilot Connector

**Goal:** Prove the requested GitHub website-session path on Android and ship it only if Phase 1 session/policy gates pass; independently prove the GitHub App API-token alternative.

### In scope

- Validate embedded official-site GitHub login, local cookie persistence, usage access, account scope and logout on Android before enabling the requested path.
- Register a test GitHub App and prove which minimum account permission, if any, authorizes the billing endpoints before changing the tier from candidate-supported to supported.
- Spike browser PKCE versus device flow and determine whether a broker is required.
- Implement exact callbacks, transaction initialization, TTL replay storage, state/PKCE binding, atomic transaction consumption, token refresh, and revocation.
- Implement personal AI credit and premium request usage.
- Implement optional organization-admin connection separately.
- Normalize billing-period data without inventing caps.
- Build connection consent, account scope, reauth, error, and disconnect UX.

### Proposed files

- `src/providers/github-copilot/{adapter,client,schema,normalize,auth}.ts` (new)
- `src/providers/github-copilot/fixtures/**` (new)
- `src/services/auth/**` (new)
- `src/services/web-session/**` (new; only after Phase 1 gate)
- `broker/src/routes/oauth-github.ts` and security helpers if required (new)
- Broker deployment configuration, secret-manager integration, domain/TLS configuration, TTL store, health checks, redacted monitoring, and CI/CD if the spike selects a broker (new)
- GitHub connector component/E2E tests (new)

### Acceptance criteria

- [ ] Personal and organization billing scopes are not conflated.
- [ ] Any enabled website-session path demonstrates locally retained cookies, validated usage access, safe logout, reviewed policy, and no session data in logs/broker/SQLite.
- [ ] A GitHub App user token is proven against every enabled billing endpoint with the documented minimum permission; otherwise the connector remains release-disabled.
- [ ] OAuth PKCE/state/replay tests pass.
- [ ] Token scope is minimum necessary and shown before consent.
- [ ] Unsupported managed-account cases produce actionable guidance.
- [ ] Disconnect revokes and clears local credentials.
- [ ] Billing data labels match GitHub terminology.
- [ ] Broker, if used, retains no usage history or provider password/session.
- [ ] Broker deployment has managed secrets, TLS, replay-store expiry, no-store logging tests, monitoring, rate limits, and an operational rollback/runbook.

### Open questions

- GitHub App permission approval and exact endpoint permission mapping.
- Whether user access endpoint exposes entitlement cap or consumption only for target plans.

## 12. Phase 7 - Gate Command Code and OpenCode Go Connectors

**Goal:** Add secure, independently disableable Command Code and OpenCode Go connector shells, enabling live network access only after vendor contracts are verified.

### In scope

- Vendor outreach and written integration approval; approval gates network enablement, not completion of disabled connector shells.
- Secure API-key form, validation, storage, refresh, and revocation guidance.
- Experimental schemas/normalizers and signed kill-switch behavior.
- Provider-specific identity, usage, rate-limit, expired-key, malformed-schema, and offline handling.
- Capability/status disclosures and explicit broad-key warnings in UI.

### Proposed files

- `src/providers/command-code/**` (new)
- `src/providers/opencode-go/**` (new)
- `src/components/connectors/experimental-disclosure.tsx` (new)
- connector fixture/contract/security tests (new)

### Acceptance criteria

- [ ] Production network calls remain disabled without vendor approval and exact vendor-owned endpoint contracts.
- [ ] API keys never enter SQLite/logs/diagnostics.
- [ ] Schema-change failure preserves last successful snapshot.
- [ ] Kill switch stops new requests but permits local deletion/read-only cache.
- [ ] Broad keys require explicit risk disclosure; a connector does not ship if usage-only access cannot be authorized at an acceptable risk level.
- [ ] Command Code and OpenCode Go failures remain isolated from each other and from GitHub.

### Open questions

- Vendor-provided read-only scopes, usage endpoints, polling limits, and revocation.
- Whether broad API keys are acceptable for a read-only dashboard at all.

## 13. Phase 8 - Deliver Claude/Codex Sessions and Gemini CLI Connector

**Goal:** Deliver feasible embedded Claude/Codex website-session connections after the Android Phase 1 spike, plus Gemini CLI quota tracking only through a proven DevGauge authorization/usage contract or explicitly user-shared CLI stats.

### In scope

- Implement a WebView-backed session adapter only for providers that pass the Phase 1 gate; otherwise keep blocked/manual adapters with `liveUsage: false`.
- Implement `gemini-cli` with its own states: approved DevGauge OAuth quota read if available; otherwise user-shared `/stats model` data with source/time/coverage and no claim of live account-wide remaining quota.
- Add status explanations describing why automatic synchronization is unavailable.
- Open only allowlisted first-party usage/help pages through the system browser.
- Add manual reset-time entry, timezone confirmation, editing, deletion, and reminder scheduling.
- Implement Codex `View usage and resets` handoff.
- Define a dormant partner-API capability boundary that cannot activate without an app-reviewed contract and feature gate.
- Add states for awaiting partner API, manual reminder active, stale manual entry, and unsupported account.

### Proposed files

- `src/providers/claude/**` (new)
- `src/providers/codex/**` (new)
- `src/providers/gemini-cli/**` (new)
- `src/components/connectors/blocked-provider-card.tsx` (new)
- `src/features/connections/manual-reset-form.tsx` (new)
- `src/services/links/provider-links.ts` (new)
- blocked/manual connector tests and fixtures (new)

### Acceptance criteria

- [ ] Claude/Codex never show `Connected` because a first-party page was opened.
- [ ] Gemini CLI figures are never sourced from Gemini Apps chat and manual session stats never claim complete account quota.
- [ ] Any enabled WebView flow has tested local cookie retention, allowlisted navigation, safe logout, redacted logs, and a reviewed usage source; failed flows remain disabled.
- [ ] Codex action cannot be interpreted as forced quota reset.
- [ ] Manual entries and reminders are visibly labeled user-provided.
- [ ] Link destinations are fixed, allowlisted, and covered by tests.
- [ ] Partner capability cannot be enabled solely by remote manifest.
- [ ] Removing a manual entry cancels its scheduled notification.

### Open questions

- Product-approved wording for unavailable automatic synchronization.
- Exact official Claude usage destination to use at implementation time.
- Whether reminders support recurring schedules or one-time timestamps only; one-time is the recommended v1 default.

## 14. Phase 9 - Complete Usage, Connector, Settings, and Notifications UX

**Goal:** Turn connector infrastructure into the complete, polished product described by the supplied layout and visual reference.

### In scope

- Usage dashboard with ordering, summary rail, provider cards, pull refresh, and details.
- Compact progress/bullet bars with explicit numbers and reset times.
- Connector sections by support tier and complete states.
- Settings for theme, system-respecting text scale, thresholds, quiet hours, privacy, legal, support, diagnostics, and deletion.
- Foreground-evaluated threshold notifications and scheduled reset reminders with idempotent scheduling; v1 does not claim real-time background threshold monitoring.
- Offline, stale, partial, loading, empty, error, auth-expired, and rate-limited states.
- Accessibility labels, focus order, reduced motion, and large-text layouts.

### Proposed files

- `src/features/dashboard/**` (new)
- `src/components/usage/**` (new)
- `src/components/connectors/**` (new)
- `src/components/settings/**` (new)
- `src/services/notifications/**` (new)
- final `app/(tabs)/**` and detail/connect routes (new)
- component/accessibility/E2E tests (new)

### Acceptance criteria

- [ ] All six providers render every defined state.
- [ ] GitHub renders a non-interactive candidate/release-disabled state until the Phase 6 gate passes.
- [ ] Dashboard remains usable offline from cached data.
- [ ] Theme switches without restart and has no hardcoded screen colors.
- [ ] Android font scaling, TalkBack, and reduced motion pass manual matrix.
- [ ] Notification denial does not block app usage.
- [ ] Notification payloads are generic and routes allowlisted.
- [ ] 375px phone, large phone, tablet, and landscape layouts have no hidden content.

### Open questions

- Exact threshold defaults; proposed off until user enables.
- Whether provider history charts belong in v1 detail or post-v1.

## 15. Phase 10 - Security Hardening, QA, Privacy, and Release Readiness

**Goal:** Verify the app against actual provider contracts, platform policies, security controls, and production devices.

### In scope

- Threat-model update against final data flows.
- Full secret/redaction, deep-link, OAuth, migration, retention, and delete-all testing.
- Dependency/license/supply-chain review.
- Performance profiling for startup, refresh, database, and list rendering.
- Store privacy/data safety disclosures, privacy policy, terms, support, licenses, and reviewer notes.
- Brand asset/license review for all six providers.
- Beta distribution, crash triage, accessibility audit, and device matrix.
- Operational runbook for provider schema incidents and kill switches.
- Final go/no-go per connector; blocked connectors remain blocked.

### Proposed files

- `docs/operations/provider-incident-runbook.md` (new)
- `docs/release/privacy-data-inventory.md` (new)
- `docs/release/mobile-qa-matrix.md` (new)
- store metadata/privacy manifests/native config (new)
- final security, E2E, performance, and migration tests (new)

### Acceptance criteria

- [ ] All release blockers in `SECURITY.md` are cleared.
- [ ] No high-confidence credential exposure is found.
- [ ] Provider contracts and permissions are revalidated on release date.
- [ ] Experimental connectors have owner-tested disable path.
- [ ] App privacy/Data Safety forms match actual SDK/network behavior.
- [ ] Crash-free beta, performance, accessibility, and device thresholds are approved.
- [ ] Claude/Codex remain blocked unless written vendor approval is attached.
- [ ] Manual QA evidence exists; AI-only verification is insufficient.

### Open questions

- Play Store release owner and legal review owner.
- Beta cohort size and success thresholds.

## 16. Cross-Cutting Rules

- One scoped branch/PR per phase or independently reviewable sub-slice.
- No unrelated refactors discovered during implementation; log them separately.
- Every provider behavior change updates fixtures, source links, and support tier.
- No migration edits after release; add a new migration.
- Typecheck, lint, tests, security checks, and platform builds gate merge.
- Provider credentials and real account payloads are never committed as fixtures.
- Each phase includes manual Android verification relevant to its scope.
- Do not enable blocked/experimental functionality to satisfy a demo.

## 17. Risk and Backlog Register

| # | Item | Severity | Treatment |
|---|---|---|---|
| R1 | No public Claude consumer quota API | Critical product risk | Block sync; pursue partnership |
| R2 | No public Codex consumer quota/reset API | Critical product risk | First-party link/manual reminder only |
| R3 | Command Code private alpha API instability | High | Vendor contract, kill switch, parser isolation |
| R4 | OpenCode Go usage endpoint not documented stable | High | Vendor confirmation before production |
| R5 | Broad API keys may permit spend/model calls | High | Require read-only scope or do not ship connector |
| R6 | SQLCipher excludes Expo Go workflow | Medium | Use development builds from Phase 2 |
| R7 | Provider limits/pricing change often | Medium | Source dates, remote disable, release revalidation |
| R8 | GitHub usage may omit organization-managed personal data | Medium | Explicit account-scope UX and org admin path |
| R9 | Brand/trademark approval | Medium | Legal/brand review before store release |

## 18. Next Step

Confirm the seven decisions in Section 3 and clarify the Codex reset meaning. After sign-off, Phase 2 can initialize the Expo project; no provider implementation should begin before that gate.
