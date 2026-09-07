import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import { buildOpenApiDocument } from "@devgauge/contracts";

import type { ApiEnv } from "./env.js";
import { registerErrorHandling } from "./plugins/errors.js";
import { buildHealthRoutes, type DependencyCheck } from "./routes/health.js";
import { buildVersionRoutes } from "./routes/version.js";

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

  return app;
};