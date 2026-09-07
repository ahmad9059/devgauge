import { describe, expect, it } from "vitest";

import { cursorPageSchema } from "./pagination.js";
import { usageWindowSchema } from "./usage.js";
import { fixedClock } from "./testing.js";

describe("cursorPageSchema", () => {
  it("validates a page of usage windows", () => {
    const schema = cursorPageSchema(usageWindowSchema);
    const result = schema.safeParse({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
    expect(result.success).toBe(true);
  });

  it("requires a next cursor when more data exists", () => {
    const schema = cursorPageSchema(usageWindowSchema);
    const result = schema.safeParse({
      items: [],
      nextCursor: null,
      hasMore: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("clock helpers", () => {
  it("returns a fixed timestamp deterministically", () => {
    const clock = fixedClock("2026-09-05T12:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-09-05T12:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-09-05T12:00:00.000Z");
  });
});