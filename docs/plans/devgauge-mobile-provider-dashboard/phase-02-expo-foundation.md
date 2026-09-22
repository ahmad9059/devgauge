# Phase 2 — Bootstrap Expo Application Foundation

Depends on: Phase 1 sign-off

---

## 1. Goal

Create a production-capable Expo/TypeScript project, deterministic development workflow, typed route skeleton, and CI baseline without implementing provider behavior or final styling.

## 2. Scope

### In scope

- Initialize the current stable Expo SDK with TypeScript strict mode and Expo Router.
- Pin package manager, Node version, dependency policy, and EAS profiles.
- Configure placeholder development identifiers and documented production identifier inputs.
- Add linting, formatting, unit-test bootstrap, typecheck, dependency audit, and CI.
- Create route shells for onboarding, tabs, provider detail, connection flow, legal, support, and diagnostics.
- Add environment validation, root error boundary, and development-only diagnostics boundaries.

### Out of scope

- Final design tokens/components.
- SQLite and SecureStore.
- Provider OAuth/API calls.
- Production store submission.

## 3. Detailed Tasks / Design

1. Initialize Expo without overwriting planning documents.
2. Enable typed routes and unique future auth callback paths.
3. Define `development`, `preview`, and `production` EAS profiles.
4. Keep client-visible configuration separate from confidential secrets.
5. Add route-level error boundaries and loading placeholders.
6. Establish `src/` module aliases and import-boundary conventions.
7. Configure CI for install, typecheck, lint, tests, and config validation.
8. Record chosen SDK/package versions in an ADR.

## 4. Files Touched

- `package.json` and lockfile (new)
- `app.config.ts` (new)
- `eas.json` (new)
- `tsconfig.json` (new)
- lint/format/test configuration (new)
- `app/_layout.tsx`, `app/index.tsx`, `app/(tabs)/**` route shells (new)
- `src/config/environment.ts` (new)
- `src/components/app-error-boundary.tsx` (new)
- `.github/workflows/ci.yml` (new)

## 5. Acceptance Criteria / QA Checklist

- [ ] Clean checkout installs reproducibly.
- [ ] iOS and Android development builds launch.
- [ ] Every planned route resolves and platform back behavior works.
- [ ] Typed invalid routes fail compilation.
- [ ] CI runs typecheck, lint, tests, and dependency audit.
- [ ] Release configuration contains no client/provider secret.
- [ ] Debug tooling is excluded or disabled in production configuration.

## 6. Open Questions

- Final reverse-domain bundle/package identifier.
- Domain used for Universal Links/App Links and OAuth callbacks.
- Package manager and supported Node LTS policy.
