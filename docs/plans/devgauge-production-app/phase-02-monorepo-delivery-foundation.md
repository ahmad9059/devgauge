# Phase 2 - Establish Monorepo And Delivery Foundation

Depends on: Phase 1 defaults, launch jurisdictions, and production hosting decision recorded

---

## 1. Goal

Create a reproducible TypeScript workspace in which the mobile app, API, workers, companion, contracts, and provider adapters can evolve independently while sharing validated domain types. End this phase with deployable skeletons and enforceable quality gates, not with mocked provider logic hidden in production paths.

## 2. Scope

### In Scope

- Standardize pnpm and remove competing lockfile ambiguity.
- Move the Expo starter into `apps/mobile` without changing product behavior.
- Add API, connector-worker, and Claude companion application skeletons.
- Add shared TypeScript, lint, format, test, environment, logging, and contract packages.
- Add local PostgreSQL, Redis, and object-storage-compatible development services.
- Add container builds, CI, dependency/security scanning, preview/staging deployment skeletons, and infrastructure decision records.
- Establish API versioning, error envelope, correlation IDs, health/readiness endpoints, and feature-flag interfaces.
- Provision the minimal isolated staging environment required by every later migration, canary, OAuth callback, connector, and deletion test.

### Out Of Scope

- User authentication and production data tables.
- Provider credential storage or real provider calls.
- Production UI beyond preserving the starter through the move.
- Final production provisioning and production traffic.

## 3. Detailed Tasks And Design

### 3.1 Workspace

- Create a root `pnpm-workspace.yaml` and Turborepo pipeline for `lint`, `typecheck`, `test`, `build`, `dev`, and `clean`.
- Move `src`, `assets`, Expo configuration, and Expo-specific TypeScript declarations into `apps/mobile`; preserve typed routes and React Compiler settings currently enabled at `app.json:37-40`.
- Pin Node.js current LTS and pnpm versions with `engines`/`packageManager`; commit only the pnpm lockfile.
- Keep package dependency directions enforceable: apps may depend on packages; provider packages may depend on core/contracts/config; no package may import an app.

### 3.2 Shared Contracts

- Define provider IDs, connection states, normalized usage windows, source provenance, stale metadata, activity summaries, API errors, pagination, and schema versions in `packages/contracts`.
- Use Zod at every network/process boundary and generate OpenAPI schemas from the same definitions.
- Preserve upstream numeric originals in an internal diagnostics shape while exposing clamped display values in public DTOs.
- Add deterministic fixture builders and injected clock/UUID helpers for tests.

### 3.3 Service Skeletons

- Create Fastify API bootstrap with security headers, CORS allowlist, body limits, request IDs, structured logging, liveness/readiness, and OpenAPI in non-production environments.
- Create worker bootstrap with BullMQ connectivity, graceful shutdown, job timeouts, and no public listener.
- Define the subprocess sandbox contract: scrubbed environment allowlist, unprivileged UID, read-only root, isolated temporary storage, disabled core dumps, no cloud metadata, no direct database/Redis/KMS credentials, restricted IPC, and provider-specific egress.
- Create companion CLI bootstrap with `--version`, `help`, structured exit codes, and no telemetry by default.
- Validate environment variables at startup and fail closed when production secrets/config are absent.

### 3.4 Local And CI Environments

- Add containerized PostgreSQL, Redis, and S3-compatible object storage for development only.
- Add `.env.example` with names and descriptions, never values; add secret-scanning policy.
- Add GitHub Actions for install integrity, lint, typecheck, unit tests, contract tests, build, container scan, and dependency license review.
- Generate software bills of materials and sign release containers/artifacts in the later release workflow.

### 3.5 Staging Foundation

- Provision a private staging API, worker network, PostgreSQL, Redis, object storage, KMS key, secret store, OIDC callbacks, push credentials, and provider canary secret locations through infrastructure-as-code.
- Use non-production accounts/data only; isolate staging IAM, keys, networks, and buckets from production.
- Add migration, backup/restore, deployment/rollback, worker sandbox, and synthetic end-to-end smoke jobs that later phases extend.
- Gate vendor, region, log retention, analytics, backup location, and subprocessor choices on the approved launch jurisdictions and data-residency policy.

### 3.6 API Compatibility And Decision Records

- Record ADRs for workspace, API framework, database/queue, auth provider, encryption/KMS, object storage, deployment platform, and observability vendors.
- Record supported iOS/Android/desktop companion OS versions and a version-upgrade policy.
- Define additive contract rules, tolerant-reader behavior, `N`/`N-1` mobile support, minimum-client signaling, emergency forced-upgrade rules, and a deprecation window that accounts for app-store review delays.

## 4. Files Touched

- `package.json` (replace root app package with workspace orchestration)
- `pnpm-workspace.yaml` (new)
- `turbo.json` (new)
- `tsconfig.base.json` (new)
- `eslint.config.mjs` (new)
- `apps/mobile/**` (new location for current Expo app)
- `apps/api/src/index.ts` (new)
- `apps/connector-worker/src/index.ts` (new)
- `apps/claude-companion/src/cli.ts` (new)
- `packages/contracts/src/**` (new)
- `packages/config/src/**` (new)
- `packages/provider-core/src/**` (new)
- `infra/docker-compose.yml` (new)
- `infra/**` (new after hosting sign-off)
- `.github/workflows/ci.yml` (new)
- `.github/dependabot.yml` (new)
- `docs/architecture/adr-*.md` (new)
- `.env.example` (new)
- `bun.lock` (remove after pnpm standardization)

## 5. Acceptance Criteria And QA Checklist

- [ ] One documented command installs and starts mobile, API, worker, database, Redis, and local object storage.
- [ ] Clean checkout CI runs lint, typecheck, unit tests, contract tests, builds, and container scans.
- [ ] Only one package-manager lockfile remains and frozen-lockfile install passes.
- [ ] Mobile behavior is unchanged after relocation and opens on iOS and Android development builds.
- [ ] API liveness succeeds without dependencies; readiness fails when required dependencies are unavailable.
- [ ] Worker exits gracefully without losing/duplicating an acknowledged test job.
- [ ] Environment validation rejects missing production values and redacts configured secret keys.
- [ ] Import-boundary checks reject app-to-app and provider-to-mobile coupling.
- [ ] OpenAPI generation is deterministic and checked for drift in CI.
- [ ] ADRs record the approved hosting/cost decision and rollback implications.
- [ ] Isolated staging API, data services, KMS, object storage, OIDC callbacks, workers, and secret locations are provisioned from reviewed infrastructure-as-code.
- [ ] A sandbox probe proves provider child processes cannot see service credentials, cloud metadata, other users' temporary files, or unrestricted network destinations.
- [ ] Contract CI proves current and previous released client schemas remain compatible and minimum-client behavior is testable.
- [ ] Region, backup, telemetry, auth, and subprocessor choices match the approved jurisdiction/data-residency record.

## 6. Open Questions

- Which cloud account/region and monthly launch budget are approved?
- Which countries/regions are in the initial launch and where may their data be processed or backed up?
- Is the API intended for a private beta only or immediate public registration?
- Which desktop operating systems are mandatory for the first companion release?
