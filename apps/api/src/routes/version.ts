import type { FastifyInstance } from "fastify";

import {
  API_VERSION,
  MIN_CLIENT_VERSION,
  SUPPORTED_CLIENT_VERSIONS,
} from "@devgauge/config";

export const buildVersionRoutes = (app: FastifyInstance): void => {
  app.get("/v1/version", async () => ({
    apiVersion: API_VERSION,
    minClientVersion: MIN_CLIENT_VERSION,
    supportedClientVersions: [...SUPPORTED_CLIENT_VERSIONS],
  }));
};