#!/usr/bin/env bun
import { type Api, type Model } from "@mariozechner/pi-ai";
import { parseArgs } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPiConfig } from "./config";
import { createDebugLogger, type DebugFormat, type DebugLogger } from "./debug";
import {
  detectEnvironmentMetadata,
  formatEnvironmentMetadata,
  type EnvironmentMetadata,
} from "./environment";
import { generateCommand } from "./generate";
import { createCompleteText, type CompleteTextInput } from "./inference";
import { resolveEffectiveModel } from "./model-resolution";
import { resolveRequestTarget } from "./request-target";
import { emitShellInit } from "./shell";

type ConfiguredModel = Model<Api>;

type SettingsLike = {
  getDefaultProvider(): string | undefined;
  getDefaultModel(): string | undefined;
  getDefaultThinkingLevel(): string | undefined;
};

type ModelRegistryLike = {
  find(provider: string, modelId: string): ConfiguredModel | undefined;
  getAvailable(): ConfiguredModel[] | Promise<ConfiguredModel[]>;
  getApiKeyAndHeaders(
    model: ConfiguredModel,
  ): Promise<
    { ok: true; apiKey?: string; headers?: Record<string, string> } | { ok: false; error: string }
  >;
};

type PiConfigLike = {
  modelRegistry: ModelRegistryLike;
  settingsManager: SettingsLike;
};

type MainDeps = {
  emitShellInit: (shellName: string, programPath: string) => string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  getEnvShell: () => string | undefined;
  getEnvVar: (name: string) => string | undefined;
  getProgramPath: () => string;
  createPiConfig: (cwd?: string) => PiConfigLike;
  detectEnvironmentMetadata: (options?: {
    shell?: string;
    cwd?: string;
    env?: Record<string, string | undefined>;
    hasCommand?: (name: string) => boolean;
  }) => EnvironmentMetadata;
  formatEnvironmentMetadata: (metadata: EnvironmentMetadata) => string;
  generateCommand: typeof generateCommand;
  completeText: (input: CompleteTextInput) => Promise<string>;
  resolveRequestTarget: typeof resolveRequestTarget;
};

const defaultDeps: MainDeps = {
  emitShellInit,
  stdout(text: string): void {
    process.stdout.write(text);
  },
  stderr(text: string): void {
    process.stderr.write(text);
  },
  getEnvShell(): string | undefined {
    return process.env.SHELL;
  },
  getEnvVar(name: string): string | undefined {
    return process.env[name];
  },
  getProgramPath(): string {
    const currentFile = fileURLToPath(import.meta.url);
    return join(dirname(currentFile), "..", "bin", "cmdgen");
  },
  createPiConfig,
  detectEnvironmentMetadata,
  formatEnvironmentMetadata,
  generateCommand,
  completeText: createCompleteText(),
  resolveRequestTarget,
};

type ParsedGenerateArgs = {
  shell: string;
  cwd: string;
  history: string[];
  query: string;
  modelOverride?: string;
  debug: boolean;
  debugFormat: DebugFormat;
};

function normalizeShellName(shellName: string | undefined): string {
  const name = shellName?.split("/").pop();
  if (!name || name === "sh") {
    return "bash";
  }

  return name;
}

function splitOnDoubleDash(argv: string[]): { optionArgs: string[]; queryArgs: string[] } {
  const separatorIndex = argv.indexOf("--");
  if (separatorIndex === -1) {
    return {
      optionArgs: argv,
      queryArgs: [],
    };
  }

  return {
    optionArgs: argv.slice(0, separatorIndex),
    queryArgs: argv.slice(separatorIndex + 1),
  };
}

function isDebugEnabled(
  flagEnabled: boolean,
  prettyEnabled: boolean,
  envValue: string | undefined,
): boolean {
  if (flagEnabled || prettyEnabled) {
    return true;
  }

  if (!envValue) {
    return false;
  }

  const normalized = envValue.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function parseGenerateArgs(
  argv: string[],
  envShell: string | undefined,
  debugEnv: string | undefined,
): ParsedGenerateArgs {
  const { optionArgs, queryArgs } = splitOnDoubleDash(argv);
  const { values, positionals } = parseArgs({
    args: optionArgs,
    options: {
      shell: { type: "string" },
      cwd: { type: "string" },
      "history-entry": { type: "string", multiple: true },
      model: { type: "string" },
      debug: { type: "boolean" },
      "debug-pretty": { type: "boolean" },
    },
    allowPositionals: true,
    strict: false,
  });

  const queryWords = queryArgs.length > 0 ? queryArgs : positionals;

  const shell = typeof values.shell === "string" ? values.shell : (envShell ?? "sh");
  const cwd = typeof values.cwd === "string" ? values.cwd : process.cwd();
  const history = Array.isArray(values["history-entry"])
    ? values["history-entry"].filter((entry): entry is string => typeof entry === "string")
    : [];
  const modelOverride = typeof values.model === "string" ? values.model : undefined;
  const prettyDebug = values["debug-pretty"] === true;

  return {
    shell,
    cwd,
    history,
    query: queryWords.join(" ").trim(),
    modelOverride,
    debug: isDebugEnabled(values.debug === true, prettyDebug, debugEnv),
    debugFormat: prettyDebug ? "pretty" : "ndjson",
  };
}

function parseModelOverride(
  modelOverride: string | undefined,
): { provider: string; modelId: string } | undefined {
  if (!modelOverride) {
    return undefined;
  }

  const separatorIndex = modelOverride.indexOf("/");
  if (separatorIndex <= 0 || separatorIndex === modelOverride.length - 1) {
    throw new Error("Model override must use provider/model format");
  }

  return {
    provider: modelOverride.slice(0, separatorIndex),
    modelId: modelOverride.slice(separatorIndex + 1),
  };
}

async function resolveModel(
  modelRegistry: ModelRegistryLike,
  settingsManager: SettingsLike,
  modelOverride: string | undefined,
  envModelOverride: string | undefined,
): Promise<ConfiguredModel> {
  const parsedOverride = parseModelOverride(modelOverride ?? envModelOverride);
  if (parsedOverride) {
    const overriddenModel = modelRegistry.find(parsedOverride.provider, parsedOverride.modelId);
    if (overriddenModel) {
      return overriddenModel;
    }

    const availableModels = await modelRegistry.getAvailable();
    const namedMatch = availableModels.find(
      (model) =>
        model.provider === parsedOverride.provider && model.name === parsedOverride.modelId,
    );
    if (namedMatch) {
      return namedMatch;
    }

    throw new Error(`Unknown model override: ${modelOverride}`);
  }

  return resolveEffectiveModel({
    defaultProvider: settingsManager.getDefaultProvider(),
    defaultModelId: settingsManager.getDefaultModel(),
    findModel(provider: string, modelId: string): ConfiguredModel | undefined {
      return modelRegistry.find(provider, modelId);
    },
    getAvailableModels(): ConfiguredModel[] | Promise<ConfiguredModel[]> {
      return modelRegistry.getAvailable();
    },
  });
}

async function runGenerate(
  argv: string[],
  deps: MainDeps,
  initialDebugEnv: string | undefined,
): Promise<number> {
  const parsed = parseGenerateArgs(argv, deps.getEnvShell(), initialDebugEnv);
  const debugLogger = createDebugLogger(parsed.debug, deps.stderr, parsed.debugFormat);
  debugLogger.log("generate-args", {
    shell: parsed.shell,
    cwd: parsed.cwd,
    historyEntries: parsed.history.length,
    modelOverride: parsed.modelOverride,
    query: parsed.query,
    debugFormat: parsed.debugFormat,
  });

  const { modelRegistry, settingsManager } = deps.createPiConfig(parsed.cwd);
  const model = await resolveModel(
    modelRegistry,
    settingsManager,
    parsed.modelOverride,
    deps.getEnvVar("CMDGEN_MODEL"),
  );
  debugLogger.log("resolved-model", {
    provider: model.provider,
    id: model.id,
    name: model.name,
    api: model.api,
  });
  const requestTarget = deps.resolveRequestTarget(parsed.shell, parsed.query);
  debugLogger.log("request-target", requestTarget);
  const environment = deps.detectEnvironmentMetadata({
    shell: parsed.shell,
    cwd: parsed.cwd,
  });
  const environmentText = deps.formatEnvironmentMetadata(environment);
  debugLogger.log("environment", environment);
  const output = await deps.generateCommand({
    query: parsed.query,
    history: parsed.history,
    availableCommands: environment.availableCommands,
    environmentText,
    requestTarget,
    completeText(prompt: { systemPrompt: string; userPrompt: string }): Promise<string> {
      return deps.completeText({
        model,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        thinkingLevel: settingsManager.getDefaultThinkingLevel(),
        getAuth(resolvedModel: ConfiguredModel) {
          return modelRegistry.getApiKeyAndHeaders(resolvedModel);
        },
        debugLogger,
      });
    },
    debugLogger,
  });

  deps.stdout(`${output}\n`);
  return 0;
}

export async function main(argv: string[], deps: MainDeps = defaultDeps): Promise<number> {
  let debugLogger: DebugLogger = createDebugLogger(false, deps.stderr);

  try {
    const command = argv[0];

    if (command === "shell" || command === "init") {
      const shellName = normalizeShellName(argv[1] === "auto" ? deps.getEnvShell() : argv[1]);
      deps.stdout(`${deps.emitShellInit(shellName, deps.getProgramPath())}\n`);
      return 0;
    }

    if (command === "generate") {
      return await runGenerate(argv.slice(1), deps, deps.getEnvVar("CMDGEN_DEBUG"));
    }

    return await runGenerate(argv, deps, deps.getEnvVar("CMDGEN_DEBUG"));
  } catch (error) {
    debugLogger.log("error", { message: error instanceof Error ? error.message : String(error) });
    deps.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (import.meta.main) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
