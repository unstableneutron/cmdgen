import {
  type Api,
  completeSimple,
  type Model,
  streamSimple,
  type AssistantMessageEvent,
} from "@mariozechner/pi-ai";
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

function makeStream(events: AssistantMessageEvent[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
    async result() {
      for (let index = events.length - 1; index >= 0; index -= 1) {
        const event = events[index];
        if (event.type === "done") {
          return event.message;
        }
      }

      throw new Error("Missing done event");
    },
  };
}

describe("createCompleteText", () => {
  test("passes systemPrompt and user message into completeSimple", async () => {
    const completeSimpleFn = vi.fn(async () => ({
      content: [{ type: "text", text: "pwd" }],
      errorMessage: undefined,
    })) as unknown as typeof completeSimple;

    const completeText = createCompleteText({
      completeSimpleFn,
    });

    const result = await completeText({
      model: makeModel(),
      systemPrompt: "You generate commands.",
      userPrompt: "show repo root",
      thinkingLevel: "high",
      getAuth: async () => ({
        ok: true,
        apiKey: "token-123",
        headers: { "x-test": "1" },
      }),
      debugLogger: { enabled: false, log() {} },
    });

    expect(result).toBe("pwd");
    expect(completeSimpleFn).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "gust", id: "gpt-5.4" }),
      expect.objectContaining({
        systemPrompt: "You generate commands.",
        messages: [expect.objectContaining({ role: "user", content: "show repo root" })],
      }),
      expect.objectContaining({
        apiKey: "token-123",
        headers: { "x-test": "1" },
        reasoning: "high",
      }),
    );
  });

  test("streams and logs events when debug is enabled", async () => {
    const logs: Array<{ label: string; data: unknown }> = [];
    const streamSimpleFn = vi.fn((_model, _context, options) => {
      options?.onPayload?.({ messages: [{ role: "user", content: "show repo root" }] });
      return makeStream([
        {
          type: "text_start",
          contentIndex: 0,
          partial: {
            role: "assistant",
            content: [],
            api: "openai-responses",
            provider: "gust",
            model: "gpt-5.4",
            usage: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 0,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: "stop",
            timestamp: 1,
          },
        },
        {
          type: "text_delta",
          contentIndex: 0,
          delta: "pwd",
          partial: {
            role: "assistant",
            content: [{ type: "text", text: "pwd" }],
            api: "openai-responses",
            provider: "gust",
            model: "gpt-5.4",
            usage: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 0,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: "stop",
            timestamp: 1,
          },
        },
        {
          type: "done",
          reason: "stop",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "pwd" }],
            api: "openai-responses",
            provider: "gust",
            model: "gpt-5.4",
            usage: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 0,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: "stop",
            timestamp: 1,
          },
        },
      ]);
    }) as unknown as typeof streamSimple;

    const completeText = createCompleteText({
      completeSimpleFn: vi.fn(async () => {
        throw new Error("should not use completeSimple in debug mode");
      }) as unknown as typeof completeSimple,
      streamSimpleFn,
    });

    const result = await completeText({
      model: makeModel(),
      systemPrompt: "You generate commands.",
      userPrompt: "show repo root",
      thinkingLevel: "high",
      getAuth: async () => ({
        ok: true,
        apiKey: "token-123",
        headers: { "x-test": "1" },
      }),
      debugLogger: {
        enabled: true,
        log(label: string, data?: unknown): void {
          logs.push({ label, data });
        },
      },
    });

    expect(result).toBe("pwd");
    expect(streamSimpleFn).toHaveBeenCalledOnce();
    expect(streamSimpleFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        systemPrompt: "You generate commands.",
        messages: [expect.objectContaining({ role: "user", content: "show repo root" })],
      }),
      expect.anything(),
    );
    expect(logs.map((entry) => entry.label)).toContain("provider-payload");
    expect(logs.map((entry) => entry.label)).toContain("model-stream-event");
    expect(logs.map((entry) => entry.label)).toContain("model-response-text");
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
      systemPrompt: "You generate commands.",
      userPrompt: "show repo root",
      thinkingLevel: "off",
      getAuth: async () => ({ ok: true, apiKey: "token-123" }),
      debugLogger: { enabled: false, log() {} },
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
        systemPrompt: "You generate commands.",
        userPrompt: "show repo root",
        thinkingLevel: "high",
        getAuth: async () => ({ ok: false, error: "No API key for provider: gust" }),
        debugLogger: { enabled: false, log() {} },
      }),
    ).rejects.toThrow("No API key for provider: gust");
  });
});
