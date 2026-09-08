import fp from "fastify-plugin";

import { createCryptoService, type CryptoService } from "@devgauge/provider-core";

import type { ApiEnv } from "../env.js";

export type { CryptoService, Envelope } from "@devgauge/provider-core";
export { createCryptoService, MASTER_KEY_VERSION } from "@devgauge/provider-core";

declare module "fastify" {
  interface FastifyInstance {
    crypto: CryptoService;
  }
}

export const registerCrypto = fp(async (app: import("fastify").FastifyInstance, opts: { env: ApiEnv }) => {
  if (!opts.env.ENC_MASTER_KEY) throw new Error("ENC_MASTER_KEY is required to register the crypto plugin");
  app.decorate("crypto", createCryptoService(opts.env.ENC_MASTER_KEY));
});
