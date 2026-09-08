# DevGauge Production Application

> Status: **Implementation in progress.** Phases 1-6 and 8 are complete; Phase 7 has local implementation and verification with the authenticated staging canary and production migration approval still pending.
>
> Source request: build an exactly ten-phase, production-grade plan for connecting OpenAI Codex, Claude Code, OpenCode Go, and GitHub Copilot, tracking every honestly available usage signal, and delivering a premium mobile experience with the supplied three-screen Usage/Connectors/Settings structure and an Epic Games/Vercel visual standard. The provider contract source is `docs/ai-coding-usage-provider-api-guide.md`; durable product truth is recorded in `PRODUCT.md`; the image references are transcribed in `UI-UX-SCREEN-CONTRACT.md`.

---

## 0. How To Read This Plan

This master document fixes the product boundary, architecture, UX direction, sequencing, release bar, and decisions that require confirmation. Each `phase-0X-*.md` file is an implementation packet with dependencies, detailed tasks, proposed file ownership, and testable exit criteria.

Phase 1 is an evidence-backed validation gate. Phases 2-10 are intentionally not implementation-complete and must not be marked complete until their automated and manual acceptance checks pass. The user requested exactly ten phases, so provider integrations remain separate reviewable gates rather than being compressed into a single high-risk connector phase.

## 1. Validated Current State

### 1.1 Application Baseline

- The repository is an Expo SDK 57, React Native 0.86, React 19, TypeScript application using Expo Router (`package.json:4-34`).
- Strict TypeScript and `@/*` source aliases are already enabled (`tsconfig.json:2-12`).
- Typed routes and the React Compiler are enabled in Expo configuration (`app.json:37-40`).
- The application currently has one placeholder screen with no product workflow, state management, API client, or design system (`src/app/index.tsx:1-17`).
- Routing currently consists only of an unconfigured root stack (`src/app/_layout.tsx:1-5`).
- The current package scripts provide start, platform launch, and lint commands, but no test, typecheck, build, database, or CI gates (`package.json:35-42`).
- There is no existing `docs/plans/` convention, `AGENTS.md`, `CONTEXT.md`, or incumbent product/design specification. This plan establishes the convention; `PRODUCT.md` now records product truth.

### 1.2 Provider Facts That Shape The Product

- Provider windows cannot be reduced to one hourly/weekly schema. Codex may return dynamic limit IDs, Copilot returns named entitlement buckets, and OpenCode Go includes rolling, weekly, and monthly windows (`docs/ai-coding-usage-provider-api-guide.md:29-60`).
- The normalized layer must clamp only display values, preserve original diagnostics, normalize reset times, retain unknown buckets, and retain stale snapshots after transient failures (`docs/ai-coding-usage-provider-api-guide.md:63-69`).
- Codex must run as a pinned backend App Server process over `stdio`, with per-user profile isolation and request-ID routing (`docs/ai-coding-usage-provider-api-guide.md:336-345`).
- Claude subscription usage must come from minimized local `statusLine` data through a desktop companion; source paths, transcript paths, repository identity, and OAuth credentials must not leave the user's machine (`docs/ai-coding-usage-provider-api-guide.md:392-436`).
- Direct Claude subscription OAuth polling is an unstable, prohibited product boundary and is excluded (`docs/ai-coding-usage-provider-api-guide.md:438-479`).
- OpenCode Go provides the simplest first vertical slice, but its usage endpoint is source-backed rather than a separately documented stable public contract (`docs/ai-coding-usage-provider-api-guide.md:483-504`).
- Copilot requires a per-user GitHub token and a pinned Copilot SDK/CLI runtime; unknown quota bucket keys and unlimited entitlements must be preserved (`docs/ai-coding-usage-provider-api-guide.md:738-810`).
- All four providers are intended for V1, with Claude explicitly labeled as requiring a desktop companion (`docs/ai-coding-usage-provider-api-guide.md:903-912`).

### 1.3 Confirmed Product Gaps

No app authentication, provider connection flow, backend, database, background scheduler, connector runtime, companion CLI, notification service, usage history, test harness, telemetry, privacy controls, or release pipeline exists in the repository. These are greenfield deliverables, not hidden extensions of the current starter.

## 2. Product Experience Contract

### 2.1 Job And Audience

DevGauge serves individual developers using multiple AI coding subscriptions during active work. The first question is not “how much analytics do I have?” but “which tool has capacity right now, what is at risk, and when does it reset?”

### 2.2 Selected Direction: Reset Horizon

The visual system is an **Operate** interface named **Reset Horizon**.

- **Thesis:** a live quota instrument, not a dashboard of interchangeable statistic cards.
- **First viewport:** a true-black canvas, a concise Usage header, then a single vertical sequence of immersive provider stages in the wireframe's fixed initial order: Claude Code, Codex, OpenCode Go, GitHub Copilot.
- **Information order:** urgent state, remaining capacity, reset time, freshness, then historical detail.
- **Signature interaction:** each provider stage promotes its most actionable allowance into an oversized figure and graph; tapping it expands into provider history while preserving spatial continuity.
- **Visual world:** black and near-black stepped surfaces, oversized high-contrast white data, quiet separators, precise line/area graphs, tabular numbers, sparse status color, official provider marks, no decorative glow and no generic gradient chrome.
- **Native behavior:** Android uses Material 3 navigation, predictive/gesture back, window insets, and adaptive rail navigation on expanded widths. No iOS conventions are targeted.

The user-pinned three-screen structure and black Epic Games/Vercel direction take precedence over generated alternatives. The design exercise ran in degraded mode without external challenger boards; the plan therefore treats the two supplied references, `UI-UX-SCREEN-CONTRACT.md`, native platform conventions, and the product's quota mechanics as the visual authority.

### 2.3 Core Navigation

| Destination | Purpose |
|---|---|
| Usage | Four stacked provider usage stages, current capacity, reset timing, freshness, graphs, and entry to provider history |
| Connectors | Four stacked provider connection stages, status, setup, reconnect, Claude companion devices, and disconnect |
| Settings | System/Dark/Light appearance, app text size, notification/alert rules, app sessions, privacy, security, legal, support, and diagnostics |

Provider history/detail and provider-specific connection setup are stack routes, not extra top-level tabs. Compact phones use a three-item labeled bottom bar matching the wireframe; expanded Android/tablet layouts use an adaptive rail while retaining exactly the same three destinations.

### 2.4 Required Experience States

Every primary route and every provider flow must define loading, empty, partial, fresh, stale, offline, permission-denied, authentication-expired, rate-limited, malformed-upstream, and recovery states. The app never replaces last-known-good usage with an empty panel after a transient error.

### 2.5 “Track Everything Available” Contract

| Provider | V1 Data Shown When Returned |
|---|---|
| Codex | Plan, every dynamic limit ID, primary/secondary windows, consumed and remaining percentage, actual duration, reset time, reached reason, credit metadata as read-only, lifetime/peak token summaries, streaks, longest turn, daily token buckets |
| Claude Code | Five-hour, seven-day, and optional spend-limit windows; consumed/remaining percentage; reset time; companion device, Claude version, captured time, freshness |
| OpenCode Go | Rolling, weekly, and monthly percentage/status/reset windows |
| GitHub Copilot | Every runtime quota key, entitlement requests, used requests, remaining percentage, unlimited state, reset date |
| Common | Provider/plan, source provenance, connection health, fetched/captured time, stale age, error category, refresh history, alert events |

Unknown values remain “Not provided”; the UI never converts percentages into dollars, tokens, or requests unless the provider returns the applicable numerator and denominator. OpenCode's known omissions are explicit (`docs/ai-coding-usage-provider-api-guide.md:616-626`).

## 3. Architecture Decisions

### 3.1 System Topology

```text
Android app (Expo)  ---- HTTPS + session ---->
                                            |
Hetzner VPS (2 vCPU / 4 GB, owned)          |
  |- apps/api (Fastify)                      |-- Neon Postgres (serverless)
  |- apps/connector-worker (BullMQ)          |-- Upstash Redis (queue + locks)
  |- reverse proxy / Cloudflare Tunnel       `-- Cloudflare R2 (profile artifacts, exports)
      |
      |-- OpenCode HTTP adapter
      |-- Copilot SDK/CLI runtime
      |-- Codex App Server process supervisor
      `-- Claude companion ingest verifier

Claude Code statusLine -> DevGauge companion (user's desktop) -> ingest API
Scheduler (worker + optional Upstash QStash) -> connector jobs -> snapshots -> local alerts
```

Hosting: a single always-on Hetzner VPS owned by the project runs the API and connector worker; the database, queue, and object storage are serverless/managed (Neon, Upstash, Cloudflare R2). See ADR-0003, ADR-0004, ADR-0007.

### 3.2 Workspace Shape

The starter becomes a pnpm/Turborepo TypeScript monorepo:

```text
apps/mobile
apps/api
apps/connector-worker
apps/claude-companion
packages/contracts
packages/database
packages/provider-core
packages/provider-opencode-go
packages/provider-github-copilot
packages/provider-codex
packages/provider-claude-code
packages/ui
packages/config
```

The existing TypeScript choice and strict mode make shared runtime-validated contracts the lowest-risk path (`tsconfig.json:2-12`). Provider packages depend on `provider-core`; they do not depend on mobile or API frameworks.

### 3.3 Control Plane

- Node.js current LTS, Fastify, Zod-generated OpenAPI, Neon Postgres, Upstash Redis/BullMQ, and a migration-owned data package.
- Open-source authentication (Better Auth self-hosted or Neon Auth): Google + email magic link, Authorization Code + PKCE; the API validates tokens and owns authorization. No Apple sign-in.
- Mobile calls only the DevGauge HTTPS API. Provider credentials are never returned to the app after submission.
- Current snapshots use a read-optimized latest table; immutable historical snapshots support trends and alert evaluation.
- Every provider response is schema-validated, normalized, version-tagged, and persisted independently from connection/error state.
- API writes accept idempotency keys; history reads use cursor pagination; list/read endpoints use revision/ETag semantics where useful.

### 3.4 Connector Isolation

- Worker containers have no public inbound port, no source repository mount, minimum filesystem access, resource/time limits, and provider-specific outbound allowlists.
- Every job decrypts only one user's credential/profile into memory or a unique temporary directory, starts a fresh provider process where required, and securely removes temporary material afterward.
- Provider child processes run as an unprivileged identity with a read-only root, isolated temporary storage, disabled core dumps, a scrubbed environment allowlist, blocked cloud metadata and unapproved IPC, and no API/database/queue/KMS credentials. Only supervisor-owned `stdio` and explicitly approved runtime IPC are available.
- Codex profiles are stored as encrypted opaque artifacts; application code does not parse or expose internal token files.
- Copilot uses the requesting user's token, `useLoggedInUser: false`, and empty/no-tool sessions. Codex and Copilot versions are pinned and upgraded through contract-fixture canaries.
- Claude ingest accepts only the minimized allowlisted schema and rejects source paths, transcript paths, prompt identifiers, arbitrary metadata, and tokens.

### 3.5 Mobile Data Strategy

- TanStack Query owns server state; a small local store owns ephemeral UI preferences only.
- Session secrets use `expo-secure-store`; provider secrets remain server-side. SecureStore is native-only encrypted storage and is excluded from Android backups, so re-authentication after reinstall is expected rather than silently restoring undecryptable data.
- SQLCipher-backed SQLite retains last-known normalized snapshots for instant, honest offline startup. Its key is stored in SecureStore, both database and key are excluded from backup/device transfer, and cache rows contain no provider credentials.
- Server refresh and alert evaluation are authoritative. Android background scheduling is best-effort only because OS timing is battery-aware and not guaranteed; opening the app triggers a freshness-aware refresh.
- Push payloads contain route IDs and non-sensitive status summaries, never credentials or raw provider payloads. Notification taps deep-link through Expo Router.

### 3.6 API Compatibility

- Public mobile contracts are additive within a major version; clients ignore unknown fields and preserve unknown provider bucket IDs.
- The API supports the current and previous released mobile contract (`N` and `N-1`) through a documented deprecation window.
- Responses expose minimum-supported-client metadata. Forced upgrades are reserved for security or provider-contract emergencies and include an accessible blocking explanation.
- CI replays contract fixtures against the schemas bundled in every still-supported store release.

### 3.7 Reference Production Infrastructure

The production footprint is a single **Hetzner VPS (2 vCPU / 4 GB, already owned)** running the API + connector worker + reverse proxy, plus serverless/managed services: **Neon Postgres**, **Upstash Redis**, and **Cloudflare R2**. Exposure is a reverse proxy with Let's Encrypt TLS or a Cloudflare Tunnel (no public inbound ports). The VPS is disposable/stateless — the database and files live off-box, so recovery is re-provision + redeploy. Domain: `devgauge.devshub.xyz` now, own domain later. See ADR-0004.

## 4. Confirmed Sign-Off Decisions (Phase 1)

The following decisions were confirmed with the owner during the Phase 1 sign-off gate and are locked for implementation:

| Decision | Confirmed Value | Notes |
|---|---|---|
| V1 audience | Individual accounts; team workspaces deferred | Backlog B1 |
| Appearance | Dark-first with System, Dark, and Light settings | Follows the Epic-style reference and supplied Settings wireframe |
| Product model | Managed SaaS with mobile client and companion | Required for background refresh, history, connector runtimes, alerts |
| Provider secret placement | Backend only after connection submission | Enables alerts; centralizes encryption, revocation, audit, redaction |
| History retention | 13 months; raw cadence 90 days, daily rollups afterward | Locked |
| Backup/deletion retention | Encrypted operational backups expire within 14 days; pseudonymous deletion tombstones remain 30 days | Shortened from the 35/90 default per owner decision |
| Provider mutation | Codex reset-credit consumption ships in V1 behind explicit confirmation and idempotency; platform is mutation-capable | Promoted from backlog B2 per owner decision |
| Release platforms | Android only (Google Play + F-Droid); no iOS; tablet layouts supported; public web app deferred | Locked per owner decision; F-Droid implies no Play Services/FCM dependency |
| Hosting | Hetzner VPS (2 vCPU / 4 GB, owned) runs API + connector worker; Neon Postgres; Upstash Redis; Cloudflare R2; domain `devgauge.devshub.xyz` now, own domain later | Locked per owner decision |
| Launch jurisdictions | US + EU/EEA | Determines residency, subprocessors, consent, retention, export, deletion obligations |
| Notifications | Local notifications (WorkManager) by default; optional UnifiedPush/ntfy; no FCM in F-Droid builds | Locked per ADR-0012 |

Mutation-capable provider actions (Phase 7 Codex reset credits) require explicit user confirmation, idempotency keys, a dedicated audit event, and a security review pass before enablement.

## 5. Risk And Backlog Register

| # | Item | Severity | Disposition |
|---|---|---:|---|
| R1 | Provider contract drift breaks parsing | Critical | Runtime validation, version pins, fixtures, canaries, stale fallback, kill switches |
| R2 | Codex per-user auth profile leakage | Critical | Envelope encryption, unique temp directories, process isolation, redaction tests, deletion verification |
| R3 | Claude companion accidentally uploads source context | Critical | Allowlist reconstruction, prohibited-key tests, payload size cap, local preview/doctor command |
| R4 | OAuth account-linking or CSRF flaw | Critical | PKCE, single-use state, callback binding, short TTL, verified identity, replay tests |
| R5 | Provider rate limiting or account enforcement | High | Provider cadence, jitter, per-user locks, retry instructions, circuit breakers, no undocumented endpoints |
| R6 | A single aggregate percentage misleads users | High | Never average incomparable windows; show provider/window truth and nearest actionable event |
| R7 | Dark or light theme has low-contrast secondary content | High | Token-pair contrast checks in both themes, increased-contrast testing, no color-only state |
| R8 | Mobile background execution is delayed or killed | High | Server-side scheduler is authoritative; mobile cache and stale timestamps remain honest |
| R9 | Notification fatigue | Medium | Explicit opt-in, quiet hours, dedupe, hysteresis, per-provider controls |
| R10 | OpenCode source-backed endpoint changes or disappears | High | Adapter flag, contract canary, last-known-good data, status communication |
| R11 | Claude companion packaging varies across macOS/Linux/Windows | Medium | Signed release artifacts, npm fallback, compatibility matrix, rollback channel; this is the only on-device companion (Codex/Copilot run on the VPS) |
| R12 | Starter branding/assets leak into release | Medium | Replace Expo starter icon/splash/colors and run asset inventory before beta |
| R13 | Codex reset-credit consumption triggers unintended mutation | High | Explicit confirmation, idempotency key, post-consume refresh, audit event, rate limit, security review |
| R14 | F-Droid builds have no Google Play Services (no FCM) | High | Local notifications via WorkManager by default; UnifiedPush/ntfy optional; no FCM-only path (ADR-0012) |
| R15 | Single Hetzner VPS is a single point of failure / compromise | High | Disposable/stateless host, envelope-encrypted credentials, Cloudflare Tunnel, SSH key-only, failover = re-provision + redeploy |
| B1 | Team workspaces and organization-level views | Backlog | Separate initiative after individual V1 data model proves stable |
| B3 | Home-screen widgets/watch surfaces | Backlog | Consider after data freshness and privacy behavior are validated on devices |

## 6. Phase Map

| Phase | Title | Status | Exit Outcome |
|---:|---|---|---|
| 1 | Validate Product, Contracts, And Architecture | Complete for planning | Evidence, boundaries, assumptions, and threat surfaces are explicit |
| 2 | Establish Monorepo And Delivery Foundation | Complete (repo deliverable) | Reproducible local/CI builds and deployable service skeletons; cloud provisioning scoped, needs owner credentials |
| 3 | Build Reset Horizon Design System And Mobile Shell | Complete (shell) | Approved, accessible, adaptive app shell and component/state language built against mock data; DESIGN.md recorded |
| 4 | Build Identity, Data, Secrets, And Usage Core | Complete (control plane + mobile auth) | Secure multi-user control plane and normalized snapshot pipeline live on Neon; mobile auth gate + offline cache |
| 5 | Ship OpenCode Go Vertical Slice | Complete | Real OpenCode Go adapter end-to-end with error mapping, live validation, and runbook; valid-key smoke needs an entitlement |
| 6 | Ship GitHub Copilot Connector | Complete | GitHub OAuth + dynamic Copilot entitlements work safely (sandbox verified; real-seat canary pending) |
| 7 | Ship OpenAI Codex Connector | Pending | Isolated App Server login, quota, and activity reads work |
| 8 | Ship Claude Code Companion | Complete (core + backend) | Minimized statusLine snapshots pair and sync safely; packaging/keyring deferred to release |
| 9 | Complete History, Alerts, And Product Experience | Pending | All providers become one coherent daily-use product |
| 10 | Harden, Certify, And Release | Pending | Security, reliability, accessibility, performance, operations, and stores pass |

## 7. Cross-Cutting Engineering Rules

- Every phase is a scoped, reviewable change set and must leave mainline deployable.
- Standardize one package manager and one lockfile in Phase 2; CI rejects lockfile drift.
- Database changes use reviewed, forward-only migrations with expand/migrate/contract sequencing for destructive evolution.
- Provider payloads are untrusted input even on HTTP 2xx. Validate before normalization and never silently discard unknown buckets.
- Raw credentials, OAuth codes, device codes, companion secrets, authorization headers, and Codex profile contents are prohibited from logs, analytics, crash reports, fixtures, and push payloads.
- Every request/job carries a correlation ID, user/connection ownership is checked at the data boundary, and refresh jobs are idempotent with one active job per connection.
- Last-known-good usage, current connection health, and current refresh error remain separate states.
- Time is stored in UTC; locale/time zone formatting happens at the presentation edge. Countdown tests use an injected clock.
- New dependencies require license, maintenance, bundle, and native-build review. Provider runtimes and generated schemas are pinned.
- Accessibility is part of component acceptance, not a final overlay: semantic roles, labels, focus order, Android font scaling, reduced motion, 48dp Android touch targets, and non-color status cues.
- Native platform conventions win over visual imitation. The product may look related across platforms without forcing identical controls or navigation behavior.
- Test fixtures are synthetic and secret-scanned. Contract tests cover valid, missing, extra, null, malformed, unauthorized, forbidden, rate-limited, and server-error payloads.
- Feature flags and provider kill switches exist before a connector reaches beta.
- Each phase updates OpenAPI, data dictionary, runbooks, privacy inventory, and decision records affected by that phase.
- An append-only, pseudonymous deletion ledger outside normal database backups records completed deletion subjects. Every restore is quarantined and reconciled against that ledger before serving traffic so deleted credentials/data cannot reappear.

## 8. Production Release Definition

The product is not “production-grade” because all screens render. V1 release requires:

- All four provider paths pass sandbox/fixture tests and controlled real-account smoke tests.
- API availability objective is at least 99.9% monthly, excluding documented provider outages.
- Cached `GET /v1/usage` p95 is below 500 ms under the agreed launch load.
- Provider refresh freshness meets the guide's cadence under normal upstream conditions (`docs/ai-coding-usage-provider-api-guide.md:874-883`).
- No open critical/high security findings, no known credential logging path, and successful key-rotation/disconnect deletion drills.
- Crash-free mobile sessions meet at least 99.8% during staged beta.
- Core “connect -> see usage -> receive alert -> open detail -> disconnect” journeys pass on supported Android versions.
- The compact mobile shell has exactly three top-level destinations, Usage, Connectors, and Settings, and no later feature adds a fourth tab.
- TalkBack, large text, both themes, increased contrast, reduced motion, offline mode, slow network, and denied notification permission are verified on device classes in scope.
- Google Play and F-Droid declarations match the actual telemetry, credential/data retention, and local-notification behavior; no Google Play Services dependency in the F-Droid build.
- On-call alerts, dashboards, provider outage messaging, rollback, backup restore, and incident runbooks are exercised before general availability.

## 9. Next Step

Phase 1 sign-off is complete and all decisions are locked in Section 4. Phase 2 has established the monorepo, environment matrix, local infrastructure, shared contracts, CI, and deployable service skeletons for the confirmed Hetzner VPS + Neon + Upstash + Cloudflare R2 hosting; it does not begin provider-specific behavior early.
