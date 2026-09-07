import type { FastifyInstance, FastifyReply } from "fastify";

import { errorEnvelopeSchema } from "@devgauge/contracts";
import { toErrorEnvelope } from "@devgauge/provider-core";

const replyEnvelope = (reply: FastifyReply, statusCode: number, body: unknown): void => {
  reply.code(statusCode).send(body);
};

export const registerErrorHandling = (app: FastifyInstance): void => {
  app.setNotFoundHandler((request, reply) => {
    const requestId = request.id;
    replyEnvelope(
      reply,
      404,
      errorEnvelopeSchema.parse({
        error: { code: "not_found", message: "Route not found", requestId },
      })
    );
  });

  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;
    const envelope = toErrorEnvelope(error, requestId);
    const statusCode = envelope.error.code === "not_found" ? 404 : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error, requestId }, "request failed");
    }

    replyEnvelope(reply, statusCode, envelope);
  });
};