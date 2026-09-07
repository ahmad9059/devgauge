import type { FastifyInstance } from "fastify";

export interface DependencyCheck {
  name: string;
  check: () => Promise<void> | void;
}

export const buildHealthRoutes = (
  app: FastifyInstance,
  dependencies: DependencyCheck[]
): void => {
  app.get("/health/live", async () => ({ status: "ok" }));

  app.get("/health/ready", async (_request, reply) => {
    const results = await Promise.all(
      dependencies.map(async (dependency) => {
        try {
          await dependency.check();
          return { name: dependency.name, status: "ok" as const };
        } catch {
          return { name: dependency.name, status: "unavailable" as const };
        }
      })
    );

    const failed = results.filter((result) => result.status !== "ok");
    reply.code(failed.length > 0 ? 503 : 200);
    return {
      status: failed.length > 0 ? "unavailable" : "ok",
      services: results,
    };
  });
};