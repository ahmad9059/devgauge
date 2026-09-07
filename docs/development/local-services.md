# Local Development

## One-command workspace

```bash
pnpm install            # first time (frozen: pnpm install --frozen-lockfile)
docker compose -f infra/docker-compose.yml up -d   # postgres + redis + minio
pnpm dev                # turbo dev (builds workspace deps, runs apps)
```

## What runs where

| Process | Command | Port / transport |
|---|---|---|
| Expo mobile app | `pnpm --filter @devgauge/mobile start` | Metro (3001/8081) |
| API skeleton | `pnpm --filter @devgauge/api dev` | http://localhost:3000 |
| Connector worker | `pnpm --filter @devgauge/connector-worker dev` | Redis only, no public listener |
| Claude companion CLI | `pnpm --filter @devgauge/claude-companion dev` | stdout |
| Postgres / Redis / MinIO | `docker compose -f infra/docker-compose.yml up -d` | 5432 / 6379 / 9000 |

## Checks

```bash
pnpm lint        # turbo run lint
pnpm typecheck   # turbo run typecheck
pnpm test        # turbo run test
pnpm build       # turbo run build
```

## Worker smoke (requires Redis)

```bash
REDIS_URL=redis://localhost:6379 pnpm --filter @devgauge/connector-worker smoke
```

## Environment

Copy `.env.example` to `.env.local` and fill in values. Production processes
fail closed when required values are missing (e.g. `DATABASE_URL`/`REDIS_URL`
when `NODE_ENV=production`).