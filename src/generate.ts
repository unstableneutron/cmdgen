import type { DebugLogger } from "./debug";
import type { RequestTarget } from "./request-target";
import { ensureShellRunnableOutput } from "./language-wrapping";
import { normalizeOutput } from "./normalize";
import { buildPrompt } from "./prompt";

export async function generateCommand(options: {
  query: string;
  history: string[];
  availableCommands: string[];
  environmentText: string;
  requestTarget: RequestTarget;
  completeText: (prompt: string) => Promise<string>;
  debugLogger: DebugLogger;
}): Promise<string> {
  const query = options.query.trim();
  if (!query) {
    throw new Error("Query is required");
  }

  const prompt = buildPrompt({
    query,
    history: options.history,
    environmentText: options.environmentText,
    currentShell: options.requestTarget.currentShell,
    executionShell: options.requestTarget.executionShell,
    implementationTarget: options.requestTarget.implementationTarget,
    requestedLanguage: options.requestTarget.requestedLanguage,
  });
  options.debugLogger.log("prompt-built", {
    query,
    requestTarget: options.requestTarget,
  });

  const raw = await options.completeText(prompt);
  options.debugLogger.log("model-output-raw", raw);
  const normalized = normalizeOutput(raw);
  options.debugLogger.log("model-output-normalized", normalized);

  const finalCommand = ensureShellRunnableOutput({
    output: normalized,
    availableCommands: options.availableCommands,
    requestTarget: options.requestTarget,
  });
  options.debugLogger.log("command-final", finalCommand);

  return finalCommand;
}
