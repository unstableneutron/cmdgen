import { type Api, completeSimple, type Model } from "@mariozechner/pi-ai";
import { describe, expect, test, vi } from "vitest";
import { createCompleteText } from "../src/inference";

function makeModel(): Model<Api> {
  return {
    id: "gpt-5.4",
    name: "GPT-5.4",
    api: "openai-responses",
    provider: "gust",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 32000,
    baseUrl: "https://example.com/v1",
  };
}

describe("createCompleteText", () => {
  test("passes resolved auth into completeSimple", async () => {
    const completeSimpleFn = vi.fn(async () => ({
      content: [{ type: "text", text: "pwd" }],
      errorMessage: undefined,
    })) as unknown as typeof completeSimple;

    const completeText = createCompleteText({
      completeSimpleFn,
    });

    const result = await completeText({
      model: makeModel(),
      prompt: "show repo root",
      thinkingLevel: "high",
      getAuth: async () => ({
        ok: true,
        apiKey: "token-123",
        headers: { "x-test": "1" },
      }),
    });

    expect(result).toBe("pwd");
    expect(completeSimpleFn).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "gust", id: "gpt-5.4" }),
      expect.objectContaining({ messages: expect.any(Array) }),
      expect.objectContaining({
        apiKey: "token-123",
        headers: { "x-test": "1" },
        reasoning: "high",
      }),
    );
  });

  test("omits reasoning when thinking level is off", async () => {
    const completeSimpleFn = vi.fn(async () => ({
      content: [{ type: "text", text: "pwd" }],
      errorMessage: undefined,
    })) as unknown as typeof completeSimple;

    const completeText = createCompleteText({
      completeSimpleFn,
    });

    await completeText({
      model: makeModel(),
      prompt: "show repo root",
      thinkingLevel: "off",
      getAuth: async () => ({ ok: true, apiKey: "token-123" }),
    });

    expect(completeSimpleFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.not.objectContaining({ reasoning: "off" }),
    );
  });

  test("throws when auth resolution fails", async () => {
    const completeText = createCompleteText({
      completeSimpleFn: vi.fn(async () => ({
        content: [{ type: "text", text: "pwd" }],
        errorMessage: undefined,
      })) as unknown as typeof completeSimple,
    });

    await expect(
      completeText({
        model: makeModel(),
        prompt: "show repo root",
        thinkingLevel: "high",
        getAuth: async () => ({ ok: false, error: "No API key for provider: gust" }),
      }),
    ).rejects.toThrow("No API key for provider: gust");
  });
});
