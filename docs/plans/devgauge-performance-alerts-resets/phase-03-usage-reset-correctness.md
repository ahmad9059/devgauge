# Phase 3 — Fix Usage and Reset Correctness

Depends on: 1

## 1. Goal

Prevent incorrect alerts and reset timing before accelerating live refresh. Evidence: A10–A13, A19; usage-extract.ts:82, provider-views.ts:69, session.ts:60.

## 2. Scope

In scope: tasks below. Other phase responsibilities and production publishing are outside this phase.

## 3. Detailed Tasks / Design

Replace value-magnitude guessing with provider/field unit metadata (percent vs ratio vs remaining). Normalize epoch seconds/milliseconds and ISO timestamps; parse relative text against capturedAt plus explicit provider timezone only when unambiguous. Preserve unknown raw reset text separately; never schedule an unknown timestamp. Preserve absolute resetsAt and fetchedAt through a production view model rather than importing runtime shapes from testing fixtures. Add foreground minute-clock freshness/countdowns; display passed reset as awaiting fresh usage, not invented new allowance. Validate manual input with timezone-aware UI and explicit ISO offset. Make connection/snapshot/attempt updates atomic; pass real trigger/start/end/duration. Keep original history intact; introduce forward migration only when needed.

### Separate commit slices

- `fix(usage): normalize explicit percent and ratio units`
- `fix(resets): preserve absolute reset instants and source text`
- `fix(storage): atomically persist snapshots and accurate attempts`
- `fix(usage): advance freshness and reset countdowns in foreground`

## 4. Files Touched

src/services/web-session/usage-extract.ts; usage-text.ts; session.ts; src/features/dashboard/provider-views.ts; app-providers.tsx; src/features/connections/manual-reset.ts; manual-reset-form.tsx; src/storage/migrations/ (new forward migration if needed); app/provider/[providerId].tsx

## 5. Acceptance Criteria / QA Checklist

- [ ] Regression cases 0/0.5/1/1.5/100 percent, ratio fields, used/remaining conversion, null/malformed payloads.
- [ ] UTC/offset/epoch/relative text/DST/month rollover covered; unknown resets never scheduled.
- [ ] Clock updates without network calls; original instant does not drift across renders.
- [ ] Injected persistence failure leaves no fresh connection without committed snapshot.

## 6. Open Questions

Relative provider text locale/timezone may be unknowable; retain display-only source text instead of guessing.
