import { createLogger } from "@devgauge/config";
import { CODEX_JOB_NAMES } from "@devgauge/contracts";
import { closeDb, createDb } from "@devgauge/database";

import { codexDisconnectProcessor, codexLoginProcessor, codexRefreshProcessor, codexResetCreditProcessor } from "./jobs/codex.js";
import { validateWorkerEnv } from "./env.js";
import { echoJobProcessor, refreshJobProcessor } from "./jobs/refresh.js";
import { createQueue, createRedisConnection, createWorkerRuntime } from "./queue.js";
import { createObjectStorage } from "./object-storage.js";

const env = validateWorkerEnv();
const logger = createLogger({ name: "connector-worker", level: env.LOG_LEVEL });

const queueHandle = createQueue(env);
const codexDb = env.DATABASE_URL ? createDb(env.DATABASE_URL) : null;
const codexRedis = codexDb ? createRedisConnection(env) : null;
const codexContext = codexDb && codexRedis
  ? { env, db: codexDb, redis: codexRedis, storage: createObjectStorage(env) }
  : null;
const codexEnabled = env.KILLSWITCH_PROVIDER_CODEX !== "true";
const { close: closeWorker } = createWorkerRuntime(
  env,
  {
    refresh: refreshJobProcessor,
    echo: echoJobProcessor,
    ...(codexContext && codexEnabled ? {
      [CODEX_JOB_NAMES.login]: codexLoginProcessor(codexContext),
      [CODEX_JOB_NAMES.refresh]: codexRefreshProcessor(codexContext),
      [CODEX_JOB_NAMES.resetCredit]: codexResetCreditProcessor(codexContext),
      [CODEX_JOB_NAMES.disconnect]: codexDisconnectProcessor(codexContext),
    } : {}),
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
  await closeWorker();
  await queueHandle.close();
  if (codexRedis) await codexRedis.quit();
  if (codexDb) await closeDb(codexDb);
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
