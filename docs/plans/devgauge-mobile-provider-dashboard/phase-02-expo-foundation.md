# Phase 2 — Bootstrap Expo Application Foundation

Depends on: owner authorization to start the Android foundation (granted); production connector work still depends on Phase 1 signed-in feasibility and outstanding sign-offs

---

## 1. Goal

Create a production-capable Expo/TypeScript project, deterministic development workflow, typed route skeleton, and CI baseline without implementing provider behavior or final styling.

## 2. Scope

### In scope

- Initialize the current stable Expo SDK with TypeScript strict mode and Expo Router.
- Pin package manager, Node version, dependency policy, and EAS profiles.
- Configure Android-only placeholder package identifiers and documented production identifier inputs; EAS build profiles target Android.
- Add linting, formatting, unit-test bootstrap, typecheck, dependency audit, and CI.
- Create route shells for onboarding, tabs, provider detail, connection flow, legal, support, and diagnostics.
- Add environment validation, root error boundary, and development/internal-preview diagnostics boundaries with a production redirect.

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

- [x] Clean install from package manifest and lockfile with `npm ci` succeeded in an isolated temporary directory.
- [ ] Signed internal preview APK was built and verified; launch on a supported device is pending owner QA.
- [ ] Every planned route resolves and platform back behavior works.
- [x] Typed invalid routes fail compilation after automatic route type generation in `npm run typecheck`.
- [ ] CI workflow contains typecheck, lint, tests, dependency audit and Android bundling; GitHub Actions has not run yet.
- [x] Release config includes no provider secret; production package ID is an owner-supplied non-secret build value.
- [x] Production config disables the diagnostic route, including if the preview flag is accidentally supplied.

## 6. Open Questions

- Final reverse-domain Android package identifier.
- Domain used for Universal Links/App Links and OAuth callbacks.
- npm 12.0.2 and Node 24 LTS are chosen in `package.json`, `.nvmrc` and CI.
