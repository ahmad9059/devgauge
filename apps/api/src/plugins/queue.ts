import fp from "fastify-plugin";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

import type { ProviderJobData } from "@devgauge/contracts";

import type { ApiEnv } from "../env.js";

declare module "fastify" {
  interface FastifyInstance {
    providerQueue: Queue<ProviderJobData> | null;
  }
}

export const registerProviderQueue = fp(async (app: import("fastify").FastifyInstance, opts: { env: ApiEnv }) => {
  if (!opts.env.REDIS_URL) {
    app.decorate("providerQueue", null);
    return;
  }
  const connection = new Redis(opts.env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue<ProviderJobData>(opts.env.QUEUE_REFRESH_NAME, { connection });
  app.decorate("providerQueue", queue);
  app.addHook("onClose", async () => {
    await queue.close();
    await connection.quit();
  });
});
