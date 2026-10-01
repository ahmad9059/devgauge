# Phase 4 — Make Manual and Automatic Sync Fast and Reliable

Depends on: 3

## 1. Goal

Unify active orchestration, remove avoidable latency and keep cached UI responsive. Evidence: A04–A09, A14; sync-provider.tsx:240, :265, session.ts:118.

## 2. Scope

In scope: tasks below. Other phase responsibilities and production publishing are outside this phase.

## 3. Detailed Tasks / Design

Introduce one connection-scoped coordinator with explicit trigger, total deadline, cancellation, in-flight deduplication and per-provider outcomes. Reuse existing refresh engine policies behind session/API transport adapters. Keep cached snapshots visible and update each completed provider immediately; remove serialized 250 ms acknowledgement sleeps. Separate manual force-refresh from automatic TTL due checks, while honoring provider cooldown/Retry-After. Refresh due providers at startup/foreground; evaluate network recovery when a reliable reachability signal exists. Warm-path capture should use verified quota responses rather than unnecessarily waiting for DOM reset text; preserve partial/unknown fields honestly. Bound active renderers (initially two, tune with device measurements), clean jobs on unmount/disconnect, and set measured idle lifetime. Filter verified usage URLs/content types before response cloning; cap bridge input and stop timers/observers after completion. Cache account-scoped Antigravity discovery/working endpoint metadata; invalidate on account/auth/schema change, separate onboarding from ordinary refresh and parallelize independent model/quota requests. Persist classified attempts/cooldowns and surface auth/offline/rate-limit/schema errors. Wire bounded retention away from critical paint path.

### Separate commit slices

- `refactor(sync): centralize triggers deduplication and outcomes`
- `perf(sync): prioritize verified warm quota capture`
- `perf(sync): bound renderer lifetime and capture overhead`
- `perf(antigravity): cache discovery and parallelize independent reads`
- `fix(sync): refresh due connections and persist cooldown failures`
- `fix(storage): reconcile bounded usage-history retention`

## 4. Files Touched

src/features/dashboard/sync-provider.tsx; refresh-connection.ts; sync-retry.ts; lifecycle.ts; auto-sync.tsx (consolidate/remove only after wiring verification); sync-coordinator.ts (new); src/services/web-session/bridge-script.ts; session.ts; src/providers/antigravity/quota.ts; sync.ts; src/storage/repositories/usage.ts

## 5. Acceptance Criteria / QA Checklist

- [ ] App-open/manual/foreground paths share coordinator; overlapping requests do not duplicate calls/writes.
- [ ] 401/schema failures do not repeat full page loads; 429 respects Retry-After; deadline cancels all work.
- [ ] One slow provider does not delay already finished cards; failure preserves last good snapshot with visible stale reason.
- [ ] Measure cold/warm p50/p95, first update, total elapsed, call count and RAM against Phase 1 targets.
- [ ] Disconnect/unmount/account change prevent late stale results; auth secrets never leave vault/cookie boundary.

## 6. Open Questions

Remote/server latency sets the floor; meet measured improvements and report unavailable live evidence. Background polling is outside this phase.
