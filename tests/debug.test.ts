import { describe, expect, test } from "vitest";
import { createDebugLogger } from "../src/debug";

describe("createDebugLogger", () => {
  test("emits NDJSON with stable top-level fields by default", () => {
    const writes: string[] = [];
    const logger = createDebugLogger(true, (text) => writes.push(text));

    logger.log("resolved-model", {
      provider: "gust",
      id: "gpt-5.4-mini",
    });

    expect(writes).toHaveLength(1);

    const entry = JSON.parse(writes[0]);
    expect(entry).toEqual({
      ts: expect.any(String),
      event: "resolved-model",
      source: "cmdgen",
      data: {
        provider: "gust",
        id: "gpt-5.4-mini",
      },
    });
  });

  test("preserves provider payloads under data", () => {
    const writes: string[] = [];
    const logger = createDebugLogger(true, (text) => writes.push(text));
    const payload = {
      model: "gpt-5.4-mini",
      input: [{ role: "user", content: "show repo root" }],
    };

    logger.log("provider-payload", payload);

    expect(writes).toHaveLength(1);

    const entry = JSON.parse(writes[0]);
    expect(entry.event).toBe("provider-payload");
    expect(entry.source).toBe("provider");
    expect(entry.data).toEqual(payload);
  });

  test("supports pretty human-readable output", () => {
    const writes: string[] = [];
    const logger = createDebugLogger(true, (text) => writes.push(text), "pretty");

    logger.log("resolved-model", {
      provider: "gust",
      id: "gpt-5.4-mini",
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("resolved-model");
    expect(writes[0]).toContain("gust");
    expect(() => JSON.parse(writes[0])).toThrow();
  });
});
