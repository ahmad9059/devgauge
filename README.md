# DevGauge

A premium, dark-first mobile app for tracking AI coding usage across **OpenAI Codex**, **Claude Code**, **OpenCode Go**, and **GitHub Copilot** — with honest freshness, reset timing, history, and actionable alerts.

This is a pnpm + Turborepo TypeScript monorepo.

## Workspace

| Path | Package | Purpose |
|---|---|---|
| `apps/mobile` | `@devgauge/mobile` | Expo (React Native) mobile app |
| `apps/api` | `@devgauge/api` | Fastify control-plane API skeleton |
| `apps/connector-worker` | `@devgauge/connector-worker` | BullMQ refresh worker + subprocess sandbox |
| `apps/claude-companion` | `@devgauge/claude-companion` | Claude Code statusLine companion CLI |
| `packages/contracts` | `@devgauge/contracts` | Shared Zod domain model, fixtures, OpenAPI |
| `packages/config` | `@devgauge/config` | Env validation, redaction, logging, provider metadata |
| `packages/provider-core` | `@devgauge/provider-core` | Normalization + error taxonomy for provider adapters |

## Getting started

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d   # postgres + redis + minio (local dev)
pnpm dev                                            # turbo dev
```

See `docs/development/local-services.md` for details and the one-command flow.

## Quality gates

```bash
pnpm lint        # eslint across the workspace (expo lint for mobile)
pnpm typecheck   # tsc --noEmit per package
pnpm test        # vitest per package
pnpm build       # tsc emit + expo export (web)
```

CI (`.github/workflows/ci.yml`) runs these plus gitleaks secret scanning, `pnpm audit`, container builds + Trivy scans, and a Redis-backed worker smoke test.

## Architecture

Design and phase plans live in `docs/plans/devgauge-production-app/` (master plan + ten phases). Product truth is recorded in `PRODUCT.md`; infrastructure decisions are in `docs/architecture/adr-*.md`.

## License

0BSD