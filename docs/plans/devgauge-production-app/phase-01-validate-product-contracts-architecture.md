# Phase 1 - Validate Product, Contracts, And Architecture

Depends on: the source request and `docs/ai-coding-usage-provider-api-guide.md`

---

## 1. Structural Baseline

The current repository is a starter Expo application, not a partially completed usage tracker. The root package selects Expo Router and React Native (`package.json:4-29`), but the only screen is placeholder content (`src/app/index.tsx:1-17`) and the root layout only mounts a default stack (`src/app/_layout.tsx:1-5`). There is no live-versus-legacy implementation choice to resolve.

The repository had no prior plan convention or durable product/design authority. This planning pass creates `PRODUCT.md` and `docs/plans/devgauge-production-app/`; it does not implement product code.

## 2. Claim-By-Claim Validation

### 2.1 “Connect all four providers.”

**Confirmed as technically supportable, with different connection mechanisms.**

- Codex: backend-managed ChatGPT device-code login through Codex App Server (`docs/ai-coding-usage-provider-api-guide.md:73-155`).
- Claude Code: desktop companion receiving official local `statusLine` JSON (`docs/ai-coding-usage-provider-api-guide.md:349-436`).
- OpenCode Go: user-provided API key and source-backed usage route (`docs/ai-coding-usage-provider-api-guide.md:483-512`).
- GitHub Copilot: GitHub OAuth user token and Copilot SDK RPC (`docs/ai-coding-usage-provider-api-guide.md:630-643`, `docs/ai-coding-usage-provider-api-guide.md:738-761`).

The connection UI cannot be one reusable form with provider logos swapped. It needs one shared state machine with four provider-specific step sequences.

### 2.2 “Track the usage of them.”

**Confirmed, but the data is heterogeneous.** The guide's normalized model permits nullable exact values, percentages, dynamic IDs, multiple units, reset times, source provenance, and stale state (`docs/ai-coding-usage-provider-api-guide.md:29-60`). No single “total AI usage” value is mathematically honest across these providers.

### 2.3 “Track all available stuff.”

**Partially bounded by provider contracts.**

- Codex additionally exposes nullable token activity summaries and daily buckets (`docs/ai-coding-usage-provider-api-guide.md:289-317`).
- Copilot may expose exact entitlement and used-request counts plus an unlimited sentinel (`docs/ai-coding-usage-provider-api-guide.md:763-797`).
- Claude statusLine may expose independent five-hour, seven-day, and optional spend-limit windows (`docs/ai-coding-usage-provider-api-guide.md:361-390`).
- OpenCode currently exposes only three percentage/status/reset windows and explicitly omits wallet, exact dollars, plan price, identity, and per-model usage (`docs/ai-coding-usage-provider-api-guide.md:523-565`, `docs/ai-coding-usage-provider-api-guide.md:616-626`).

“All” therefore means every documented field actually returned, every unknown quota bucket, and all freshness/provenance metadata. It does not mean inferred spend or hidden/internal endpoints.

### 2.4 “Fully production grade.”

**Not present today; achievable only as a multi-surface system.** The provider guide requires a backend-owned API, credential encryption, validation, stale caching, disconnect deletion, and per-user isolation (`docs/ai-coding-usage-provider-api-guide.md:816-899`). Mobile-only polling cannot provide dependable background alerts or host the required Codex/Copilot runtimes.

### 2.5 “UI/UX is most important; black like Epic Games/Vercel.”

**Confirmed as a binding direction, not an incumbent implementation.** Current product code contains no theme or component language (`src/app/index.tsx:1-17`), while Expo configuration still follows the starter's automatic appearance and blue splash (`app.json:9-9`, `app.json:29-34`). The follow-up wireframe fixes exactly three top-level tabs (Usage, Connectors, Settings) and the Epic Games reference fixes an oversized-data, graph-forward visual quality bar. Phase 3 must establish the system from first principles and replace starter assets.

## 3. Recommended Architecture - Confirmed Sound

The recommended topology is a mobile app plus a TypeScript control-plane API, background scheduler, isolated connector workers, PostgreSQL/Redis persistence, encrypted Codex profile storage, and a Claude desktop companion. This honors the provider guide's stable app-facing adapter boundary (`docs/ai-coding-usage-provider-api-guide.md:816-871`) and keeps mobile UI independent from provider protocol churn.

The implementation should start with OpenCode Go after the common platform because it provides the lowest-complexity real vertical slice. Copilot, Codex, and Claude each retain separate phases due to materially different trust and runtime boundaries.

## 4. Confirmed Gaps Not Explicitly Named In The Brief

- App identity/session management and account deletion.
- Launch jurisdiction, data residency, and subprocessor constraints before infrastructure selection.
- Backend credential encryption, key rotation, and audit trail.
- Snapshot persistence, retention, deduplication, and rollups.
- Refresh queue, concurrency locks, retry policy, and provider circuit breakers.
- Push registration, quiet hours, deduplication, and deep-link routing.
- Provider contract fixtures, generated schemas, canaries, and kill switches.
- Claude companion packaging, pairing, local queue, upgrade, and uninstall behavior.
- Offline cache, stale semantics, accessibility, localization, and adaptive tablet behavior.
- CI/CD, infrastructure-as-code, telemetry redaction, SLOs, runbooks, and store compliance.

## 5. What Phase 1 Did Not Do

- No dependency was installed.
- No application screen, API, schema, provider adapter, or infrastructure was implemented.
- No provider credentials or real account data were requested.
- No final `DESIGN.md` was written; that document must describe the rendered system after Phase 3 proves it.

## 6. Sign-Off Completed Before Phase 2

All working defaults were confirmed or changed by the owner in the Phase 1 sign-off gate. The locked decisions are recorded in `00-MASTER-PLAN.md` Section 4:

- Individual-first V1 audience (accepted).
- Dark-first with System, Dark, and Light appearances (accepted).
- Managed SaaS with backend-held provider credentials (accepted).
- 13-month history with 90-day high-resolution data (accepted).
- Backup retention shortened to 14 days and deletion tombstones shortened to 30 days (changed from defaults).
- Codex reset-credit consumption promoted into V1 behind explicit confirmation and idempotency; provider platform is mutation-capable (changed from read-only).
- Hosting locked to Fly.io (API + connector workers) with Neon Postgres and managed Redis.
- Launch jurisdictions locked to US + EU/EEA.

## 7. Reference - Original Task Brief

> `@docs/ai-coding-usage-provider-api-guide.md , we have to plan of phases 10 phases, in which we are going to build a application, fully producation grade, like when connect the connecter of all four , and we can track the usage of them, and also it track all available stuff that is the and MOST important is that, UI/UX , there are also many apps but totally bad experience, so we have to build the like in black theme like for epic games ui/vercel ui [Image 1] , so plan is at your best of best potenial and make that docs, good luck`

Follow-up brief: the three top-level screens must follow the supplied rough Usage/Connector/Settings layout, and the visual execution and graph quality should reach the supplied Epic Games mobile reference. The conversation-only images are transcribed in `UI-UX-SCREEN-CONTRACT.md` so later implementation does not depend on chat history.

## 8. Phase 1 Acceptance

- [x] Existing app structure and scripts were read directly.
- [x] All four provider connection and usage boundaries were validated against the supplied guide.
- [x] Unsafe Claude OAuth and undocumented Codex/Copilot endpoint paths were excluded.
- [x] Product assumptions and design commitments were recorded in `PRODUCT.md`.
- [x] Exactly ten implementation phases were defined.
- [x] Phase 1 sign-off decisions were confirmed and recorded (audience, appearance, hosting, jurisdictions, retention, mutation scope).
