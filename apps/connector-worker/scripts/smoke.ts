/**
 * Worker smoke test (requires a running Redis, see infra/docker-compose.yml).
 *
 * Proves the at-least-once acknowledgement path end to end: enqueues an echo
 * job and a refresh stub job, processes them through the worker, and verifies
 * both results before exiting 0.
 */
import { createLogger } from "@devgauge/config";

import { validateWorkerEnv } from "../src/env.js";
import { createQueue, createWorkerRuntime } from "../src/queue.js";
import { echoJobProcessor, refreshJobProcessor } from "../src/jobs/refresh.js";

const env = validateWorkerEnv();
const logger = createLogger({ name: "worker-smoke", level: env.LOG_LEVEL });

const queue = createQueue(env);
const { worker, queueEvents } = createWorkerRuntime(
  env,
  { refresh: refreshJobProcessor, echo: echoJobProcessor },
  logger
);

const waitFor = (predicate: () => boolean, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = (): void => {
      if (predicate()) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error("timed out waiting for job"));
      setTimeout(poll, 50);
    };
    poll();
  });

const completed: Record<string, unknown> = {};
queueEvents.on("completed", (event) => {
  completed[event.jobId] = event.returnvalue;
});

const main = async (): Promise<void> => {
  const echoJob = await queue.add("echo", {
    connectionId: "conn_1",
    provider: "opencode-go",
    requestId: "req_smoke",
    idempotencyKey: "smoke-echo-1",
    attempt: 0,
  });
  const refreshJob = await queue.add("refresh", {
    connectionId: "conn_2",
    provider: "github-copilot",
    requestId: "req_smoke",
    idempotencyKey: "smoke-refresh-1",
    attempt: 0,
  });

  const echoJobId = echoJob.id;
  const refreshJobId = refreshJob.id;
  if (echoJobId == null || refreshJobId == null) {
    throw new Error("queue did not assign job ids");
  }

  await waitFor(() => completed[echoJobId] !== undefined && completed[refreshJobId] !== undefined);

  const echoed = completed[echoJobId] as { echoed: { provider: string } } | undefined;
  const refreshed = completed[refreshJobId] as { status: string; provider: string } | undefined;

  if (echoed?.echoed?.provider !== "opencode-go") {
    throw new Error("echo job returned the wrong payload");
  }
  if (refreshed?.status !== "stub" || refreshed?.provider !== "github-copilot") {
    throw new Error("refresh job returned the wrong payload");
  }

  logger.info("worker smoke test passed");
  await worker.close();
  await queueEvents.close();
  await queue.close();
  process.exit(0);
};

main().catch((error) => {
  logger.error({ err: error }, "worker smoke test failed");
  process.exit(1);
});