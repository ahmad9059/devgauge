# DevGauge Performance, Alerts and Provider Resets

> Status: Implementation in progress. Usage correctness, shared sync, compact packaging and persisted notifications, provider actions and honest earned-reset handoffs committed; live account and final device verification pending.
> Source request: fast whole-project review followed by an executable Codex goal prompt; verbatim brief in phase-01-validate-baseline.md.

## 0. How to Read This Plan

Read Phase 1 for confirmed findings and limits, then execute the phase map. CODEX-GOAL-PROMPT.md is the paste-ready implementation instruction. Eight phases separate measurement, Android size, usage correctness, sync, alerts, earned resets, UI functionality and final verification. Each phase contains multiple small commits, not one giant commit.

## 1. Validated Baseline (Before Implementation)

The active coordinator is mounted in `app/_layout.tsx:67`, not the legacy diagnostic refresh engine. Current APK is 123.89 MiB, dominated by four ABI native libraries (Phase 1 artifact analysis; `android/gradle.properties:31`). Release shrink defaults are off (`android/app/build.gradle:69`, `:116`). Long retry paths (`sync-provider.tsx:52`, `sync-retry.ts:7`), incorrect percentage normalization (`usage-extract.ts:82`), frozen/reset-relative display (`provider-views.ts:69`, `app-providers.tsx:73`) and placeholder controls (`app/provider/[providerId].tsx:198`, `app/(tabs)/settings.tsx:175`) are real gaps. Notification building blocks exist but are not integrated; provider matching and cycle deduplication need repair before activation (`thresholds.ts:41`, `:22`). All detailed evidence is in Phase 1.

## 2. Architecture Decisions

- Retain Android Expo, Hermes, local-first encrypted SQLCipher and SecureStore. Keep native configuration reproducible through clean prebuild.
- One connection-scoped sync coordinator serving app-open, foreground, user refresh and post-reset refresh. Reuse proven error/cooldown/concurrency logic from `refresh-connection.ts:154` behind transport interfaces; avoid keeping two competing schedulers.
- Provider-specific typed normalization; absolute UTC reset instants and raw source text stored separately. Recompute countdowns using a coarse foreground clock, without polling the provider to animate time.
- A persisted notification reconciler runs after committed snapshots and on startup/settings changes. Native operations use recoverable state transitions rather than pretending SQLite/native scheduling is one transaction.
- Scheduled window resets and earned on-demand reset offers are separate domains. Provider-supported, user-confirmed redemption changes real account limits; reminders only notify. Capability flags follow verified runtime transports, and never fabricate redemption availability.

## 3. Default Product Decisions

Proceed under these defaults during implementation; routine choices need no new approval:

- Build compact arm64 phone APK for internal testing, retain a separate emulator profile; deliver AAB/per-device Play measurements for production. Preserve existing device support unless the product explicitly changes it.
- Alerts remain opt-in. Offer provider/account/window threshold presets (e.g. 80/90/100%), reset lead time and quiet hours; editable, persisted settings. Generic lock-screen copy remains default; users can opt into provider/window detail. In-app reset timeline always names the provider/window.
- Foreground due refresh, app-open stale refresh and manual refresh are included. Continuous Android background polling is a separate capability requiring battery/platform assessment; scheduled local reminders work without polling. Do not promise alerts for new unseen remote consumption while the app is closed.
- Claude/Codex detail pages get earned-reset sections. Prove a supported direct transport; otherwise provide an honest first-party redemption handoff with post-return refresh. Handoff is explicitly partial fulfillment of direct redemption, not complete implementation.
- Single-account session cookies are the current boundary (`session.ts:57`); do not claim simultaneous isolated multi-account WebViews without proving cookie partitioning. Preserve account/connection IDs for alerts and storage.

## 4. Risk / Backlog Register

| Item | Priority | Handling |
|---|---|---|
| Percent/reset correctness before alerts | High | Phase 3 must precede Phase 5 |
| Unsupported Android redemption transport | High | Phase 6 feasibility report; continue unrelated work, report direct feature blocked |
| WebView cookies shared across providers/accounts | High | Scope disconnect/account selection carefully; avoid clearing unrelated sessions |
| Build shrinker/native compatibility | High | Verify SQLCipher reopen, auth, notifications and navigation on release artifact |
| Existing docs/capabilities differ from live wiring | High | Reconcile in Phase 7 with verified transports, not mass-enable flags |
| Notification delivery varies by OS/power/permission | Medium | Device evidence and supported behavior labels |
| Retention not wired (`usage.ts:396`) | Medium | Add measured, bounded maintenance after sync; never prune newest snapshots |
| Public installed OAuth client policy/ownership | Review | Document public vs secret boundary; verify account ownership/scopes before distribution |
| Dependency/release/device QA unmeasured | Open | Phase 8, report unresolved items rather than assuming pass |

## 5. Phase Map

| Phase | Title | Dependencies | Status |
|---|---|---|---|
| 1 | Validate and measure baseline | None | Source/artifact complete; device pending |
| 2 | Reduce Android artifact size | 1 | Intermediate phone APK measured; native/final QA pending |
| 3 | Fix usage, reset timestamps and persistence | 1 | Implemented; regressions pass; final native QA pending |
| 4 | Speed up and unify sync | 3 | Shared runtime and policy implemented; signed-in measurements pending |
| 5 | Deliver thresholds and reset notifications | 3, 4 | Scoped settings/journal/reconciliation implemented; native delivery matrix partial |
| 6 | Claude/Codex earned reset offers and redemption | 3, 4; feasibility independent | Contract/model/handoff implemented; direct transport unproved |
| 7 | Working provider actions and microinteractions | 4, 5, 6 integration | Implemented; full device/accessibility QA pending |
| 8 | Release verification and completion report | 2–7 | Planned |

Execute 1, 2, 3, 4, 5, 6, 7, 8; Phase 6 discovery may start earlier. External blockers must not stop independent work.

## 6. Cross-Cutting Rules

- One independently reversible concern per commit, meaningful message, record hash/tests in execution log. Stage explicit paths. Preserve unrelated work. Do not push, deploy or edit user-global Codex configuration for this task.
- Released SQLite migrations immutable; add forward migrations and document any data rollback implications. Git revert does not magically roll back an installed database or consumed provider credit.
- Keep credentials, cookies, raw sensitive responses and user identities out of logs/fixtures. Narrow bridge capture; preserve HTTPS/host/route validation and encrypted storage.
- Use focused meaningful regressions for sync, parsing, state and native reconciliation. Run typecheck/lint/test/config/format gates before completion, and platform QA against the final release build. Clean warnings in a separate commit.
- Existing project conventions in `docs/plans/devgauge-mobile-provider-dashboard/00-MASTER-PLAN.md` §6 apply: parameterized SQL, real device/TalkBack QA, honest capability gates. Old status claims are not reliable current behavior evidence.
- Performance targets are provisional: >=50% reduction for compact phone APK relative to current universal APK; <=60 MiB arm64 APK stretch budget; cached screen <=500 ms and press feedback <=100 ms; warm successful sync p95 <=3 s / cold <=8 s on defined device/network, or >=50% reduction from measured baseline where upstream prevents those. Record comparisons and explain misses. Changing ABI packaging alone is not a like-for-like runtime optimization; also report same-ABI before/after. No artificial acknowledgement sleeps on completion path.

## 7. Next Step

Continue authorized verification of final artifacts, account-bound earned-reset transport, notification/device/accessibility behavior and signed-in sync performance. EXECUTION-LOG.md and BASELINE.md record committed work and measured evidence. Irreversible account reset consumption still requires the user's explicit in-app confirmation.
