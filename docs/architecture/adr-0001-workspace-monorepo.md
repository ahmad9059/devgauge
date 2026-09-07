# ADR-0001: Workspace As A pnpm/Turborepo Monorepo

Status: Accepted

## Context
DevGauge spans a mobile app, control-plane API, connector workers, a desktop companion, and shared provider adapters. A single flat package made provider contracts and mobile/server types drift independently. The starter already used pnpm (a pnpm layout existed in `node_modules`).

## Decision
- One pnpm workspace (`apps/*`, `packages/*`) with a single lockfile.
- Turborepo for `lint`, `typecheck`, `test`, `build`, `dev`, `clean` caching.
- TypeScript everywhere; server-side packages/apps emit ESM to `dist`; `@devgauge/contracts` exposes a `react-native` export condition for Metro (Phase 3).
- Dependency direction is enforced by review/CI: apps may depend on packages; provider packages may depend on contracts/config/provider-core; nothing imports an app.

## Consequences
- One reproducible install; Turborepo caches cross-package builds.
- Contract changes surface at typecheck time across every consumer.
- Provider binary/SDK version pins (Codex, Copilot) are isolated per package.