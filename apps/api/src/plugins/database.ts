import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import type { Db } from "@devgauge/database";
import { closeDb, createDb } from "@devgauge/database";

import type { ApiEnv } from "../env.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

export const registerDatabase = fp(async (app: FastifyInstance, opts: { env: ApiEnv }) => {
  if (!opts.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to register the database plugin");
  }
  const db = createDb(opts.env.DATABASE_URL);
  app.decorate("db", db);
  app.addHook("onClose", async () => {
    await closeDb(db);
  });
});