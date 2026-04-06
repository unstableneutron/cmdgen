import { type Api, type Model } from "@mariozechner/pi-ai";
import { describe, expect, test, vi } from "vitest";
import { main } from "../src/cli";

type Deps = NonNullable<Parameters<typeof main>[1]>;

type GenerateCall = Parameters<Deps["generateCommand"]>[0];

function makeModel(id: string): Model<Api> {
  return {
    provider: "gust",
    id,
    api: "openai-responses",
    name: id,
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 32000,
    baseUrl: "https://example.com/v1",
  };
}

function createDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    emitShellInit(shellName: string): string {
      return `wrapper:${shellName}`;
    },
    stdout(_text: string): void {},
    stderr(_text: string): void {},
    getEnvShell(): string | undefined {
      return "/bin/zsh";
    },
    getEnvVar(_name: string): string | undefined {
      return undefined;
    },
    getProgramPath(): string {
      return "/tmp/cmdgen";
    },
    createPiConfig() {
      return {
        modelRegistry: {
          find(_provider: string, modelId: string) {
            return makeModel(modelId);
          },
          getAvailable() {
            return [makeModel("gpt-5.4")];
          },
          async getApiKeyAndHeaders() {
            return { ok: true as const, apiKey: "token-123" };
          },
        },
        settingsManager: {
          getDefaultProvider() {
            return "gust";
          },
          getDefaultModel() {
            return "gpt-5.4";
          },
          getDefaultThinkingLevel() {
            return "high";
          },
        },
      };
    },
    detectEnvironmentMetadata() {
      return {
        shell: "/bin/zsh",
        cwd: "/tmp/demo",
        availableCommands: ["uv", "bun", "jj"],
      };
    },
    formatEnvironmentMetadata(): string {
      return "Current shell: /bin/zsh";
    },
    async generateCommand(_input: GenerateCall): Promise<string> {
      return "echo ok";
    },
    async completeText(): Promise<string> {
      return "unused";
    },
    resolveRequestTarget() {
      return {
        currentShell: "zsh" as const,
        executionShell: "zsh" as const,
        implementationTarget: "zsh" as const,
        requestedLanguage: undefined,
      };
    },
    ...overrides,
  };
}

describe("cli main", () => {
  test("shell command writes wrapper text", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const deps = createDeps({
      emitShellInit(): string {
        return "wrapper-text";
      },
      stdout(text: string): void {
        stdout.push(text);
      },
      stderr(text: string): void {
        stderr.push(text);
      },
      createPiConfig: vi.fn(() => {
        throw new Error("should not be called");
      }),
      detectEnvironmentMetadata: vi.fn(() => {
        throw new Error("should not be called");
      }),
      formatEnvironmentMetadata: vi.fn(() => {
        throw new Error("should not be called");
      }),
      generateCommand: vi.fn(async () => {
        throw new Error("should not be called");
      }),
      completeText: vi.fn(async () => {
        throw new Error("should not be called");
      }),
      resolveRequestTarget: vi.fn(() => {
        throw new Error("should not be called");
      }),
    });

    const exitCode = await main(["shell", "zsh"], deps);

    expect(exitCode).toBe(0);
    expect(stdout).toEqual(["wrapper-text\n"]);
    expect(stderr).toEqual([]);
  });

  test("generate command writes normalized output", async () => {
    const stdout: string[] = [];
    const deps = createDeps({
      stdout(text: string): void {
        stdout.push(text);
      },
      async generateCommand({ query, requestTarget }: GenerateCall): Promise<string> {
        expect(requestTarget.executionShell).toBe("zsh");
        return `echo ${query}`;
      },
    });

    const exitCode = await main(
      [
        "generate",
        "--shell",
        "zsh",
        "--cwd",
        "/tmp/demo",
        "--history-entry",
        "jj st",
        "--",
        "show repo root",
      ],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(stdout).toEqual(["echo show repo root\n"]);
  });

  test("passes debug mode from --debug to generation", async () => {
    const enabledStates: boolean[] = [];
    const deps = createDeps({
      async generateCommand({ debugLogger }: GenerateCall): Promise<string> {
        enabledStates.push(debugLogger.enabled);
        return "echo ok";
      },
    });

    const exitCode = await main(["generate", "--debug", "show", "repo", "root"], deps);

    expect(exitCode).toBe(0);
    expect(enabledStates).toEqual([true]);
  });

  test("passes debug mode from CMDGEN_DEBUG to generation", async () => {
    const enabledStates: boolean[] = [];
    const deps = createDeps({
      getEnvVar(name: string): string | undefined {
        return name === "CMDGEN_DEBUG" ? "1" : undefined;
      },
      async generateCommand({ debugLogger }: GenerateCall): Promise<string> {
        enabledStates.push(debugLogger.enabled);
        return "echo ok";
      },
    });

    const exitCode = await main(["generate", "show", "repo", "root"], deps);

    expect(exitCode).toBe(0);
    expect(enabledStates).toEqual([true]);
  });

  test("parses options on the left of -- and keeps query text on the right", async () => {
    const queries: string[] = [];
    const deps = createDeps({
      async generateCommand({ query, requestTarget }: GenerateCall): Promise<string> {
        queries.push(`${query}::${requestTarget.implementationTarget}`);
        return "echo ok";
      },
      resolveRequestTarget() {
        return {
          currentShell: "zsh" as const,
          executionShell: "zsh" as const,
          implementationTarget: "python" as const,
          requestedLanguage: "python" as const,
        };
      },
    });

    const exitCode = await main(
      [
        "generate",
        "--shell",
        "zsh",
        "--cwd",
        "/tmp/demo",
        "--",
        "show",
        "repo",
        "root",
        "in",
        "python",
      ],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(queries).toEqual(["show repo root in python::python"]);
  });

  test("parses positional queries even when -- is omitted", async () => {
    const queries: string[] = [];
    const deps = createDeps({
      async generateCommand({ query }: GenerateCall): Promise<string> {
        queries.push(query);
        return "echo ok";
      },
    });

    const exitCode = await main(["generate", "--shell", "zsh", "show", "repo", "root"], deps);

    expect(exitCode).toBe(0);
    expect(queries).toEqual(["show repo root"]);
  });

  test("passes through an explicit model override", async () => {
    const lookedUp: string[] = [];
    const deps = createDeps({
      createPiConfig() {
        return {
          modelRegistry: {
            find(provider: string, modelId: string) {
              lookedUp.push(`${provider}/${modelId}`);
              return makeModel(modelId);
            },
            getAvailable() {
              return [];
            },
            async getApiKeyAndHeaders() {
              return { ok: true as const, apiKey: "token-123" };
            },
          },
          settingsManager: {
            getDefaultProvider() {
              return "gust";
            },
            getDefaultModel() {
              return "gpt-5.4";
            },
            getDefaultThinkingLevel() {
              return "high";
            },
          },
        };
      },
    });

    const exitCode = await main(
      ["generate", "--model", "gust/gpt-5.4-mini", "show", "repo", "root"],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(lookedUp).toContain("gust/gpt-5.4-mini");
  });

  test("resolves a model override by provider/name when the exact id differs", async () => {
    const deps = createDeps({
      createPiConfig() {
        return {
          modelRegistry: {
            find() {
              return undefined;
            },
            getAvailable() {
              return [
                {
                  ...makeModel("global.anthropic.claude-haiku-4-5-20251001-v1:0"),
                  name: "claude-haiku-4-5",
                },
              ];
            },
            async getApiKeyAndHeaders() {
              return { ok: true as const, apiKey: "token-123" };
            },
          },
          settingsManager: {
            getDefaultProvider() {
              return "gust";
            },
            getDefaultModel() {
              return "gpt-5.4";
            },
            getDefaultThinkingLevel() {
              return "high";
            },
          },
        };
      },
    });

    const exitCode = await main(
      ["generate", "--model", "gust/claude-haiku-4-5", "show", "repo", "root"],
      deps,
    );

    expect(exitCode).toBe(0);
  });
});
