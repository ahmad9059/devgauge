import type { Job, Queue, Worker } from "bullmq";
import { Queue as BullQueue, QueueEvents, Worker as BullWorker } from "bullmq";
import { Redis } from "ioredis";

import type { Logger } from "@devgauge/config";
import { createLogger } from "@devgauge/config";
import type { ProviderJobData } from "@devgauge/contracts";

import type { WorkerEnv } from "./env.js";

export type RefreshJobData = ProviderJobData;

/**
 * BullMQ v6 cannot dynamically load its optional `ioredis` dependency in a
 * native ESM process, so we construct ioredis clients ourselves and pass the
 * instances to every BullMQ component.
 */
export const createRedisConnection = (env: WorkerEnv): Redis =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

export interface QueueHandle {
  queue: Queue<RefreshJobData>;
  close: () => Promise<void>;
}

/** Creates the shared refresh queue with an owned Redis connection. */
export const createQueue = (env: WorkerEnv): QueueHandle => {
  const connection = createRedisConnection(env);
  const queue = new BullQueue<RefreshJobData>(env.QUEUE_REFRESH_NAME, { connection });
  return {
    queue,
    close: async () => {
      await queue.close();
      await connection.quit();
    },
  };
};

export interface WorkerRuntime {
  worker: Worker<RefreshJobData>;
  queueEvents: QueueEvents;
  close: () => Promise<void>;
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
  const workerConnection = createRedisConnection(env);
  const eventsConnection = createRedisConnection(env);

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
      connection: workerConnection,
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

  const queueEvents = new QueueEvents(env.QUEUE_REFRESH_NAME, { connection: eventsConnection });

  return {
    worker,
    queueEvents,
    close: async () => {
      await worker.close();
      await queueEvents.close();
      await workerConnection.quit();
      await eventsConnection.quit();
    },
  };
};
