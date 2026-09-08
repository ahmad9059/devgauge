import type { FastifyInstance } from "fastify";

import { errorEnvelopeSchema, providerIdSchema } from "@devgauge/contracts";
import { deleteUsageHistory } from "@devgauge/database";

import { getHistorySeries } from "../services/history-service.js";

const csvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const buildDataRightsRoutes = (app: FastifyInstance): void => {
  app.get("/v1/data/export", { preHandler: app.requireAuth }, async (request, reply) => {
    const auth = request.auth!;
    const query = request.query as { provider?: string; format?: string };
    const parsed = providerIdSchema.safeParse(query.provider);
    if (!parsed.success) return reply.code(400).send(errorEnvelopeSchema.parse({
      error: { code: "invalid_input", message: "A valid provider is required", requestId: request.id },
    }));
    const to = new Date();
    const from = new Date(to);
    from.setUTCMonth(from.getUTCMonth() - 13);
    const history = await getHistorySeries(app.db, {
      userId: auth.userId,
      provider: parsed.data,
      from,
      to,
      resolution: "raw",
      limit: 200,
      timezone: auth.timezone,
    });
    if (query.format === "csv") {
      const header = ["provider", "window_id", "label", "timestamp", "used_percent", "remaining_percent", "used", "limit", "unit", "resets_at", "state", "stale", "source"];
      const rows = history.points.map((point) => [
        point.provider, point.windowId, point.label, point.timestamp, point.usedPercent,
        point.remainingPercent, point.used, point.limit, point.unit, point.resetsAt,
        point.state, point.stale, point.source,
      ].map(csvCell).join(","));
      return reply
        .header("content-type", "text/csv; charset=utf-8")
        .header("content-disposition", `attachment; filename="devgauge-${parsed.data}-history.csv"`)
        .send([header.join(","), ...rows].join("\n"));
    }
    return reply.header("content-disposition", `attachment; filename="devgauge-${parsed.data}-history.json"`).send(history);
  });

  app.delete("/v1/data/history", { preHandler: app.requireAuth }, async (request, reply) => {
    const body = request.body as { confirmed?: boolean; provider?: string } | undefined;
    if (body?.confirmed !== true) return reply.code(400).send(errorEnvelopeSchema.parse({
      error: { code: "invalid_input", message: "Explicit confirmation is required", requestId: request.id },
    }));
    const provider = body.provider === undefined ? undefined : providerIdSchema.safeParse(body.provider);
    if (provider && !provider.success) return reply.code(400).send(errorEnvelopeSchema.parse({
      error: { code: "invalid_input", message: "Unknown provider", requestId: request.id },
    }));
    const deleted = await deleteUsageHistory(app.db, {
      userId: request.auth!.userId,
      ...(provider?.success ? { provider: provider.data } : {}),
    });
    return { ok: true, deletedSnapshots: deleted };
  });
};
