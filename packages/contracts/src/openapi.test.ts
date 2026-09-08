import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "./openapi.js";

describe("buildOpenApiDocument", () => {
  it("produces a deterministic document from the shared schemas", () => {
    const first = JSON.stringify(buildOpenApiDocument());
    const second = JSON.stringify(buildOpenApiDocument());
    expect(second).toBe(first);
  });

  it("describes the unified usage and connections endpoints", () => {
    const doc = buildOpenApiDocument();
    expect(doc.paths?.["/v1/usage"]).toBeDefined();
    expect(doc.paths?.["/v1/connections"]).toBeDefined();
    expect(doc.components?.schemas?.ProviderUsage).toBeDefined();
  });

  it("documents Phase 9 history and alert endpoints", () => {
    const doc = buildOpenApiDocument();
    expect(doc.paths?.["/v1/history/{provider}"]).toBeDefined();
    expect(doc.paths?.["/v1/alerts"]).toBeDefined();
    expect(doc.paths?.["/v1/alert-events"]).toBeDefined();
    expect(doc.components?.schemas?.UsageReadResponse).toBeDefined();
    expect(doc.components?.schemas?.HistorySeries).toBeDefined();
    expect(doc.components?.schemas?.Alerts).toBeDefined();
  });
});