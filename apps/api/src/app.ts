import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import { buildOpenApiDocument, PRODUCT_JOB_NAMES } from "@devgauge/contracts";

import type { ApiEnv } from "./env.js";
import { registerErrorHandling } from "./plugins/errors.js";
import { registerDatabase } from "./plugins/database.js";
import { registerCrypto } from "./plugins/crypto.js";
import { registerAuth } from "./plugins/auth.js";
import { registerProviderQueue } from "./plugins/queue.js";
import { buildHealthRoutes, type DependencyCheck } from "./routes/health.js";
import { buildVersionRoutes } from "./routes/version.js";
import { buildAuthRoutes } from "./routes/auth.js";
import { buildMeRoutes } from "./routes/me.js";
import { buildProvidersRoutes } from "./routes/providers.js";
import { buildConnectionsRoutes } from "./routes/connections.js";
import { buildUsageRoutes } from "./routes/usage.js";
import { buildGithubOauthRoutes } from "./routes/github-oauth.js";
import { buildCompanionRoutes } from "./routes/companion.js";
import { buildCodexRoutes } from "./routes/codex.js";
import { buildHistoryRoutes } from "./routes/history.js";
import { buildAlertRoutes } from "./routes/alerts.js";
import { buildDataRightsRoutes } from "./routes/data-rights.js";

export interface BuildAppOptions {
  env: ApiEnv;
  dependencies?: DependencyCheck[];
}

export const buildApp = async (options: BuildAppOptions): Promise<FastifyInstance> => {
  const { env, dependencies = [] } = options;

  // Fastify owns its logger; we only configure the level and redaction paths.
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "headers.authorization",
          "authorization",
          "*.apiKey",
          "*.api_key",
          "*.clientSecret",
          "*.client_secret",
          "*.accessToken",
          "*.access_token",
          "*.refreshToken",
          "*.refresh_token",
           "*.deviceCode",
           "*.device_code",
          "*.userCode",
          "*.user_code",
          "*.password",
          "*.credential",
          "*.credentialEnvelope",
          "*.profileArtifact",
          "DATABASE_URL",
          "REDIS_URL",
        ],
        censor: "***REDACTED***",
      },
    },
    trustProxy: true,
    bodyLimit: 1024 * 1024,
    genReqId: (request) =>
      (request.headers["x-request-id"] as string | undefined) ?? globalThis.crypto.randomUUID(),
  });

  await app.register(helmet, {
    // JSON API surface; default CSP is not meaningful here.
    contentSecurityPolicy: false,
  });

  const corsOrigins = env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  await app.register(cors, {
    origin: corsOrigins.length > 0 ? corsOrigins : false,
  });

  if (env.NODE_ENV !== "production") {
    // Serve the deterministic OpenAPI document built from the shared Zod
    // schemas at GET /documentation/json (no swagger-ui in the skeleton).
    app.get("/documentation/json", async () => buildOpenApiDocument());
  }

  registerErrorHandling(app);
  buildHealthRoutes(app, dependencies);
  buildVersionRoutes(app);

  // Data-plane plugins require DATABASE_URL + ENC_MASTER_KEY. In production
  // these are enforced at startup (fail closed); in dev/test they are skipped
  // so the skeleton health/version surface stays bootable without infra.
  const dataPlaneReady = Boolean(env.DATABASE_URL && env.ENC_MASTER_KEY);
  if (dataPlaneReady) {
    await app.register(registerDatabase, { env });
    await app.register(registerCrypto, { env });
    await app.register(registerAuth);
    await app.register(registerProviderQueue, { env });
    buildAuthRoutes(app, env);
    buildMeRoutes(app);
    buildProvidersRoutes(app);
    buildConnectionsRoutes(app, env);
    buildUsageRoutes(app, env);
    buildGithubOauthRoutes(app, env);
    buildCompanionRoutes(app);
    buildCodexRoutes(app, env);
    buildHistoryRoutes(app);
    buildAlertRoutes(app);
    buildDataRightsRoutes(app);
    if (app.providerQueue) {
      await app.providerQueue.upsertJobScheduler(
        "retention-daily",
        { pattern: "0 3 * * *" },
        {
          name: PRODUCT_JOB_NAMES.rollupRetention,
          data: { requestId: "scheduled-retention", idempotencyKey: "daily-retention", userId: "", connectionId: "" },
          opts: { attempts: 3, backoff: { type: "exponential", delay: 60_000 }, removeOnComplete: 100, removeOnFail: 500 },
        }
      );
    }
  }

  return app;
};
