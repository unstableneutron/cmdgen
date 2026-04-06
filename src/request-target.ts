export type ShellName = "zsh" | "bash" | "nu";
export type RequestedLanguage = "python" | "javascript" | "typescript";
export type ImplementationTarget = ShellName | RequestedLanguage;

export type RequestTarget = {
  currentShell: ShellName;
  executionShell: ShellName;
  implementationTarget: ImplementationTarget;
  requestedLanguage?: RequestedLanguage;
};

function normalizeShellName(shellPath: string | undefined): ShellName {
  const shellName = shellPath?.split("/").pop()?.toLowerCase();

  if (shellName === "bash" || shellName === "sh") {
    return "bash";
  }

  if (shellName === "nu" || shellName === "nushell") {
    return "nu";
  }

  return "zsh";
}

function readExecutionShell(query: string, currentShell: ShellName): ShellName {
  const normalizedQuery = query.trim().toLowerCase();

  const shellMatch = normalizedQuery.match(
    /(?:^|\s)(?:in|for)\s+(bash|zsh|nu|nushell|sh)(?=\s+(?:in|using|with)\s+(python|javascript|typescript)\s*$|\s*$)/,
  );

  if (!shellMatch) {
    return currentShell;
  }

  return normalizeShellName(shellMatch[1]);
}

function readRequestedLanguage(query: string): RequestedLanguage | undefined {
  const normalizedQuery = query.trim().toLowerCase();
  const languageMatch = normalizedQuery.match(
    /(?:^|\s)(?:in|using|with)\s+(python|javascript|typescript)\s*$/,
  );

  return languageMatch?.[1] as RequestedLanguage | undefined;
}

export function resolveRequestTarget(shellPath: string | undefined, query: string): RequestTarget {
  const currentShell = normalizeShellName(shellPath);
  const executionShell = readExecutionShell(query, currentShell);
  const requestedLanguage = readRequestedLanguage(query);
  const implementationTarget = requestedLanguage ?? executionShell;

  return {
    currentShell,
    executionShell,
    implementationTarget,
    requestedLanguage,
  };
}
