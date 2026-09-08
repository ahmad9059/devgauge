import type { FastifyInstance, FastifyReply } from "fastify";

import { alertEventsResponseSchema, alertRuleInputSchema, alertRuleSchema, alertsResponseSchema, errorEnvelopeSchema } from "@devgauge/contracts";
import { acknowledgeAlertEvent, createAlertRule, deleteOwnedAlertRule, listAlertEvents, listAlertRules, updateOwnedAlertRule } from "@devgauge/database";

const notFound = (reply: FastifyReply, requestId: string) => reply.code(404).send(
  errorEnvelopeSchema.parse({ error: { code: "not_found", message: "Alert not found", requestId } })
);

export const buildAlertRoutes = (app: FastifyInstance): void => {
  app.get("/v1/alerts", { preHandler: app.requireAuth }, async (request) =>
    alertsResponseSchema.parse({ alerts: await listAlertRules(app.db, request.auth!.userId) }));

  app.post("/v1/alerts", { preHandler: app.requireAuth }, async (request, reply) => {
    const input = alertRuleInputSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send(errorEnvelopeSchema.parse({
      error: { code: "invalid_input", message: "Invalid alert rule", requestId: request.id },
    }));
    return reply.code(201).send(alertRuleSchema.parse(await createAlertRule(app.db, request.auth!.userId, input.data)));
  });

  app.put("/v1/alerts/:id", { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = alertRuleInputSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send(errorEnvelopeSchema.parse({
      error: { code: "invalid_input", message: "Invalid alert rule", requestId: request.id },
    }));
    const alert = await updateOwnedAlertRule(app.db, id, request.auth!.userId, input.data);
    return alert ? alertRuleSchema.parse(alert) : notFound(reply, request.id);
  });

  app.delete("/v1/alerts/:id", { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return await deleteOwnedAlertRule(app.db, id, request.auth!.userId) ? { ok: true } : notFound(reply, request.id);
  });

  app.get("/v1/alert-events", { preHandler: app.requireAuth }, async (request) =>
    alertEventsResponseSchema.parse({ events: await listAlertEvents(app.db, request.auth!.userId) }));

  app.post("/v1/alert-events/:id/acknowledge", { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return await acknowledgeAlertEvent(app.db, id, request.auth!.userId) ? { ok: true } : notFound(reply, request.id);
  });
};
