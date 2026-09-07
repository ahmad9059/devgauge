import type { Job, Queue, Worker } from "bullmq";
import { Queue as BullQueue, QueueEvents, Worker as BullWorker } from "bullmq";

import type { Logger } from "@devgauge/config";
import { createLogger } from "@devgauge/config";

import type { WorkerEnv } from "./env.js";

export interface RefreshJobData {
  connectionId: string;
  provider: string;
  requestId: string;
  idempotencyKey: string;
  attempt: number;
}

/** Creates the shared refresh queue. */
export const createQueue = (env: WorkerEnv): Queue<RefreshJobData> =>
  new BullQueue<RefreshJobData>(env.QUEUE_REFRESH_NAME, {
    connection: { url: env.REDIS_URL },
  });

export interface WorkerRuntime {
  worker: Worker<RefreshJobData>;
  queueEvents: QueueEvents;
}

/**
 * Creates the worker with a single consumer on the refresh queue. The worker
 * exposes no public listener and only ever talks to Redis.
 */
export const createWorkerRuntime = (
  env: WorkerEnv,
  processors: Record<string, (job: Job<RefreshJobData>) => Promise<unknown>>,
  logger: Logger = createLogger({ name: "connector-worker", level: env.LOG_LEVEL })
): WorkerRuntime => {
  const worker = new BullWorker<RefreshJobData>(
    env.QUEUE_REFRESH_NAME,
    async (job) => {
      const processor = processors[job.name];
      if (!processor) {
        throw new Error(`No processor registered for job type '${job.name}'`);
      }
      return processor(job);
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: env.WORKER_CONCURRENCY,
      // Jobs are bounded so a hung provider process cannot wedge the queue.
      lockDuration: env.JOB_TIMEOUT_MS,
      stalledInterval: Math.max(30_000, Math.floor(env.JOB_TIMEOUT_MS / 2)),
    }
  );

  worker.on("failed", (job, error) => {
    logger.warn({ jobId: job?.id, jobName: job?.name, err: error }, "job failed");
  });
  worker.on("error", (error) => {
    logger.error({ err: error }, "worker error");
  });

  return { worker, queueEvents: new QueueEvents(env.QUEUE_REFRESH_NAME, { connection: { url: env.REDIS_URL } }) };
};