import type { RequestTarget, RequestedLanguage } from "./request-target";

function isShellRunnablePythonCommand(output: string): boolean {
  return /^(uv\b|uvx\b|python\b|python3\b)/.test(output) || output.includes("<<'PY'");
}

function isShellRunnableJavaScriptCommand(output: string): boolean {
  return /^(bun\b|node\b)/.test(output) || output.includes("<<'JS'") || output.includes("<<'TS'");
}

function looksLikeRawPythonSource(output: string): boolean {
  const trimmed = output.trimStart();
  return /^(import\s+|from\s+|print\(|def\s+|class\s+|for\s+|while\s+|if\s+|with\s+|try:|@)/.test(
    trimmed,
  );
}

function looksLikeRawJavaScriptSource(output: string): boolean {
  const trimmed = output.trimStart();
  return /^(import\s+|export\s+|const\s+|let\s+|var\s+|function\s+|async\s+function\s+|console\.|for\s*\(|if\s*\(|type\s+|interface\s+)/.test(
    trimmed,
  );
}

function wrapPythonSource(output: string, availableCommands: string[]): string {
  const runner = availableCommands.includes("uv")
    ? "uv run --isolated python"
    : availableCommands.includes("python3")
      ? "python3"
      : "python";

  return `${runner} - <<'PY'\n${output}\nPY`;
}

function wrapJavaScriptSource(
  output: string,
  availableCommands: string[],
  requestedLanguage: Exclude<RequestedLanguage, "python">,
): string {
  const runner = availableCommands.includes("bun") ? "bun -" : "node -";
  const label = requestedLanguage === "typescript" ? "TS" : "JS";

  return `${runner} <<'${label}'\n${output}\n${label}`;
}

export function ensureShellRunnableOutput(options: {
  output: string;
  availableCommands: string[];
  requestTarget: RequestTarget;
}): string {
  const { output, availableCommands, requestTarget } = options;

  if (!requestTarget.requestedLanguage) {
    return output;
  }

  if (requestTarget.executionShell === "nu") {
    return output;
  }

  if (requestTarget.requestedLanguage === "python") {
    if (isShellRunnablePythonCommand(output)) {
      return output;
    }

    if (looksLikeRawPythonSource(output)) {
      return wrapPythonSource(output, availableCommands);
    }

    return output;
  }

  if (isShellRunnableJavaScriptCommand(output)) {
    return output;
  }

  if (looksLikeRawJavaScriptSource(output)) {
    return wrapJavaScriptSource(output, availableCommands, requestTarget.requestedLanguage);
  }

  return output;
}
