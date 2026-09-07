import { createLogger } from "@devgauge/config";

import { validateWorkerEnv } from "./env.js";
import { echoJobProcessor, refreshJobProcessor } from "./jobs/refresh.js";
import { createQueue, createWorkerRuntime } from "./queue.js";

const env = validateWorkerEnv();
const logger = createLogger({ name: "connector-worker", level: env.LOG_LEVEL });

const queue = createQueue(env);
const { worker, queueEvents } = createWorkerRuntime(
  env,
  {
    refresh: refreshJobProcessor,
    echo: echoJobProcessor,
  },
  logger
);

logger.info(
  {
    queue: env.QUEUE_REFRESH_NAME,
    concurrency: env.WORKER_CONCURRENCY,
    jobTimeoutMs: env.JOB_TIMEOUT_MS,
  },
  "connector-worker started"
);

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, "shutting down");
  // close() waits for in-flight jobs and un-acks nothing: BullMQ re-queues
  // jobs whose processing was interrupted, so no job is lost or duplicated.
  await worker.close();
  await queueEvents.close();
  await queue.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});