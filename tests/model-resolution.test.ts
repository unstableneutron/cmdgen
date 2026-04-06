import { describe, expect, test } from "vitest";
import { resolveEffectiveModel } from "../src/model-resolution";

const fullModel = {
  provider: "gust",
  id: "gpt-5.4",
  api: "openai-responses",
  name: "GPT-5.4",
  reasoning: true,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000,
};

describe("resolveEffectiveModel", () => {
  test("uses configured default provider and model when available", async () => {
    const result = await resolveEffectiveModel({
      defaultProvider: "gust",
      defaultModelId: "gpt-5.4",
      findModel: (provider, id) =>
        provider === "gust" && id === "gpt-5.4" ? fullModel : undefined,
      getAvailableModels: async () => [fullModel],
    });

    expect(result.provider).toBe("gust");
    expect(result.id).toBe("gpt-5.4");
    expect(result.api).toBe("openai-responses");
  });

  test("falls back to first available model when default is missing", async () => {
    const result = await resolveEffectiveModel({
      defaultProvider: "gust",
      defaultModelId: "missing-model",
      findModel: () => undefined,
      getAvailableModels: async () => [
        { ...fullModel, id: "gpt-5.3-codex" },
        { ...fullModel, id: "kimi-k2.5-turbo", api: "openai-completions" },
      ],
    });

    expect(result.provider).toBe("gust");
    expect(result.id).toBe("gpt-5.3-codex");
    expect(result.api).toBe("openai-responses");
  });

  test("throws when no models are available", async () => {
    await expect(
      resolveEffectiveModel({
        defaultProvider: undefined,
        defaultModelId: undefined,
        findModel: () => undefined,
        getAvailableModels: async () => [],
      }),
    ).rejects.toThrow("No configured or available models found");
  });
});
