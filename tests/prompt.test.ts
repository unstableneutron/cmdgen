import { describe, expect, test } from "vitest";
import { buildPrompt } from "../src/prompt";

describe("buildPrompt", () => {
  test("includes query, history, and environment metadata", () => {
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

    expect(prompt).toContain("show me recently modified files");
    expect(prompt).toContain("1. jj st");
    expect(prompt).toContain("2. bun test");
    expect(prompt).toContain("Available commands: mise, brew, uv, bun, pnpm, jj");
    expect(prompt).toContain("Return only the runnable command");
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

    expect(prompt).toContain("Current shell: zsh");
    expect(prompt).toContain("Execution shell: bash");
    expect(prompt).toContain("The final output must be runnable in bash");
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

    expect(prompt).toContain("Implementation target: python");
    expect(prompt).toContain("Do not return raw Python source by itself");
    expect(prompt).toContain("Prefer uv for Python execution when available");
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

    expect(prompt).toContain("Implementation target: typescript");
    expect(prompt).toContain("Do not return raw JS/TS source by itself");
    expect(prompt).toContain("Prefer bun when available");
  });
});
