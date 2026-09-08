import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { errorEnvelopeSchema } from "@devgauge/contracts";
import { getConnection, upsertConnection } from "@devgauge/database";
import {
  buildAuthorizeUrl,
  exchangeCode,
  randomPkceVerifier,
  randomState,
} from "@devgauge/provider-github-copilot";

import type { ApiEnv } from "../env.js";
import { COPILOT_ACCESS, COPILOT_REFRESH, clearCopilotTokens, storeCopilotToken } from "../services/copilot-tokens.js";
import { toConnectionDto } from "../services/mappers.js";
import { refreshProviderUsage } from "../services/usage-service.js";

/**
 * In-memory OAuth transaction store (state -> { verifier, userId, expiresAt }).
 * Suitable for the single-instance MVP; moves to Redis for multi-instance.
 */
interface PendingTransaction {
  pkceVerifier: string;
  userId: string;
  expiresAt: number;
}
const pending = new Map<string, PendingTransaction>();
const OAUTH_TTL_MS = 10 * 60_000;

const appConfig = (env: ApiEnv): { clientId: string; clientSecret: string; redirectUri: string; scope: string } => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_REDIRECT_URI) {
    throw new Error("GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / GITHUB_REDIRECT_URI are required for GitHub OAuth");
  }
  return {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    redirectUri: env.GITHUB_REDIRECT_URI,
    scope: env.GITHUB_OAUTH_SCOPE,
  };
};

const unauthorized = (request: FastifyRequest, reply: FastifyReply, message: string): FastifyReply =>
  reply.code(400).send(
    errorEnvelopeSchema.parse({
      error: { code: "provider_unauthorized", message, requestId: request.id },
    })
  );

export const buildGithubOauthRoutes = (app: FastifyInstance, env: ApiEnv): void => {
  app.get("/v1/connections/github-copilot/authorize", { preHandler: app.requireAuth }, async (request) => {
    const auth = request.auth!;
    const config = appConfig(env);
    const state = randomState();
    const verifier = randomPkceVerifier();
    pending.set(state, { pkceVerifier: verifier, userId: auth.userId, expiresAt: Date.now() + OAUTH_TTL_MS });
    const authorizeUrl = buildAuthorizeUrl(config, state, verifier, config.scope);
    return { authorizeUrl, state };
  });

  app.get("/v1/connections/github-copilot/callback", async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };

    if (error || !code || !state) {
      return reply.code(400).send(
        errorEnvelopeSchema.parse({
          error: { code: "provider_unauthorized", message: error ?? "Missing code or state", requestId: request.id },
        })
      );
    }

    const txn = pending.get(state);
    if (!txn) return unauthorized(request, reply, "Unknown or expired OAuth state");
    if (txn.expiresAt < Date.now()) {
      pending.delete(state);
      return unauthorized(request, reply, "OAuth state expired");
    }
    pending.delete(state); // single-use

    const config = appConfig(env);
    const tokens = await exchangeCode(config, code, txn.pkceVerifier);

    // Bind the connection to the authenticated DevGauge user who started OAuth.
    const userId = txn.userId;
    const connection = await upsertConnection(app.db, { userId, provider: "github-copilot", plan: "copilot" });
    await clearCopilotTokens(app.db, connection.id);
    await storeCopilotToken(app.db, app.crypto, connection.id, COPILOT_ACCESS, tokens.accessToken);
    if (tokens.refreshToken) {
      await storeCopilotToken(app.db, app.crypto, connection.id, COPILOT_REFRESH, tokens.refreshToken);
    }

    // First refresh in sandbox/sdk mode to seed snapshots.
    await refreshProviderUsage(app.db, {
      userId,
      provider: "github-copilot",
      adapterVersion: "copilot-adapter-0.1.0",
      ctx: {
        crypto: app.crypto,
        mockTransport: env.FEATURE_MOCK_TRANSPORT === "true",
        copilotRuntimeMode: env.COPILOT_RUNTIME_MODE,
      },
    });

    const updated = await getConnection(app.db, userId, "github-copilot");
    return {
      ok: true,
      githubLogin: tokens.user.login,
      githubUserId: tokens.user.id,
      connection: updated ? toConnectionDto(updated) : null,
    };
  });
};