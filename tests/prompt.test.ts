import { describe, expect, test } from "vitest";
import { buildPrompt } from "../src/prompt";

describe("buildPrompt", () => {
  test("returns a system prompt plus a separate user prompt", () => {
    const prompt = buildPrompt({
      query: "show me recently modified files",
      history: ["jj st", "bun test"],
      environmentText: [
        "Current shell: /bin/zsh",
        "Current directory: /Users/thinh/Projects/cmdgen",
        "Available commands: mise, brew, uv, bun, pnpm, jj",
      ].join("\n"),
      currentShell: "zsh",
      executionShell: "zsh",
      implementationTarget: "zsh",
      requestedLanguage: undefined,
    });

    expect(prompt.systemPrompt).toContain("1. jj st");
    expect(prompt.systemPrompt).toContain("2. bun test");
    expect(prompt.systemPrompt).toContain("Available commands: mise, brew, uv, bun, pnpm, jj");
    expect(prompt.systemPrompt).toContain("Return only the runnable command");
    expect(prompt.userPrompt).toBe("show me recently modified files");
  });

  test("states that the output must run in the resolved execution shell", () => {
    const prompt = buildPrompt({
      query: "show repo root",
      history: ["jj st"],
      environmentText: "Current shell: /bin/zsh",
      currentShell: "zsh",
      executionShell: "bash",
      implementationTarget: "bash",
      requestedLanguage: undefined,
    });

    expect(prompt.systemPrompt).toContain("Current shell: zsh");
    expect(prompt.systemPrompt).toContain("Execution shell: bash");
    expect(prompt.systemPrompt).toContain("The final output must be runnable in bash");
    expect(prompt.userPrompt).toBe("show repo root");
  });

  test("requires runnable wrapping for explicit python requests", () => {
    const prompt = buildPrompt({
      query: "list directories in cwd in python",
      history: [],
      environmentText: "Available commands: uv, bun",
      currentShell: "zsh",
      executionShell: "zsh",
      implementationTarget: "python",
      requestedLanguage: "python",
    });

    expect(prompt.systemPrompt).toContain("Implementation target: python");
    expect(prompt.systemPrompt).toContain("Do not return raw Python source by itself");
    expect(prompt.systemPrompt).toContain("Prefer uv for Python execution when available");
    expect(prompt.userPrompt).toBe("list directories in cwd in python");
  });

  test("tells the model to return shell-runnable JavaScript/TypeScript wrappers", () => {
    const prompt = buildPrompt({
      query: "count files in cwd in typescript",
      history: [],
      environmentText: "Available commands: bun",
      currentShell: "zsh",
      executionShell: "zsh",
      implementationTarget: "typescript",
      requestedLanguage: "typescript",
    });

    expect(prompt.systemPrompt).toContain("Implementation target: typescript");
    expect(prompt.systemPrompt).toContain("Do not return raw JS/TS source by itself");
    expect(prompt.systemPrompt).toContain("Prefer bun when available");
    expect(prompt.userPrompt).toBe("count files in cwd in typescript");
  });
});
