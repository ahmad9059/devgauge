import type { FastifyInstance, FastifyReply } from "fastify";

import { errorEnvelopeSchema, historyResolutionSchema, historySeriesResponseSchema, providerIdSchema } from "@devgauge/contracts";

import { getHistorySeries } from "../services/history-service.js";

const invalid = (reply: FastifyReply, requestId: string, message: string) => reply.code(400).send(
  errorEnvelopeSchema.parse({ error: { code: "invalid_input", message, requestId } })
);

export const buildHistoryRoutes = (app: FastifyInstance): void => {
  app.get("/v1/history/:provider", { preHandler: app.requireAuth }, async (request, reply) => {
    reply.header("cache-control", "private, no-cache");
    const auth = request.auth!;
    const { provider } = request.params as { provider: string };
    const query = request.query as Record<string, string | undefined>;
    const parsedProvider = providerIdSchema.safeParse(provider);
    const parsedResolution = historyResolutionSchema.safeParse(query.resolution ?? "raw");
    if (!parsedProvider.success || !parsedResolution.success) return invalid(reply, request.id, "Invalid history query");

    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 7 * 86_400_000);
    const limit = Number.parseInt(query.limit ?? "100", 10);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to || !Number.isFinite(limit)) {
      return invalid(reply, request.id, "Invalid history range");
    }
    try {
      return historySeriesResponseSchema.parse(await getHistorySeries(app.db, {
        userId: auth.userId,
        provider: parsedProvider.data,
        ...(query.windowId ? { windowId: query.windowId } : {}),
        from,
        to,
        resolution: parsedResolution.data,
        ...(query.cursor ? { cursor: query.cursor } : {}),
        limit,
        timezone: auth.timezone,
      }));
    } catch (error) {
      if (error instanceof TypeError) return invalid(reply, request.id, error.message);
      throw error;
    }
  });
};
