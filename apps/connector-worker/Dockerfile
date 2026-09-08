# syntax=docker/dockerfile:1
FROM node:26-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/connector-worker/package.json apps/connector-worker/
COPY packages/contracts/package.json packages/contracts/
COPY packages/config/package.json packages/config/
COPY packages/provider-core/package.json packages/provider-core/
COPY packages/provider-codex/package.json packages/provider-codex/
COPY packages/database/package.json packages/database/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @devgauge/connector-worker... build
RUN pnpm --filter @devgauge/connector-worker deploy --prod /out

FROM node:26-alpine AS runtime
ENV NODE_ENV=production
ENV CODEX_BINARY_PATH=/usr/local/bin/codex
WORKDIR /app
COPY --from=build /out ./
COPY --from=build /repo/node_modules/.pnpm/@openai+codex@0.153.4-linux-x64/node_modules/@openai/codex/vendor/x86_64-unknown-linux-musl/bin/codex /usr/local/bin/codex
# The worker never exposes a public listener.
USER node
CMD ["node", "dist/index.js"]
