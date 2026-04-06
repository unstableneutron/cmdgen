import type { RequestTarget } from "./request-target";

export function buildPrompt(options: {
  query: string;
  history: string[];
  environmentText: string;
  currentShell: RequestTarget["currentShell"];
  executionShell: RequestTarget["executionShell"];
  implementationTarget: RequestTarget["implementationTarget"];
  requestedLanguage: RequestTarget["requestedLanguage"];
}): string {
  const historyLines =
    options.history.length > 0
      ? options.history.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
      : "(none)";

  const wrapperLines: string[] = [];
  if (options.requestedLanguage === "python") {
    wrapperLines.push(
      "If Python is needed, return a shell-runnable command, not raw Python source by itself.",
    );
    wrapperLines.push("Do not return raw Python source by itself.");
    wrapperLines.push("Prefer uv for Python execution when available.");
  }

  if (options.requestedLanguage === "javascript" || options.requestedLanguage === "typescript") {
    wrapperLines.push(
      "If JavaScript or TypeScript is needed, return a shell-runnable command, not raw JS/TS source by itself.",
    );
    wrapperLines.push("Do not return raw JS/TS source by itself.");
    wrapperLines.push("Prefer bun when available.");
  }

  return [
    "You generate commands for the user's current environment.",
    `Current shell: ${options.currentShell}`,
    `Execution shell: ${options.executionShell}`,
    `Implementation target: ${options.implementationTarget}`,
    `The final output must be runnable in ${options.executionShell}.`,
    "Use the current shell unless the user explicitly asked for another shell or language.",
    "Return only the runnable command or runnable multiline shell block, with no explanation and no markdown fences.",
    ...wrapperLines,
    "",
    "User request:",
    options.query.trim(),
    "",
    "Environment:",
    options.environmentText,
    "",
    "Recent commands:",
    historyLines,
  ].join("\n");
}
