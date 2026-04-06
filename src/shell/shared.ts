export function quoteForPosixShell(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function normalizeInitShell(shellName: string): string {
  if (shellName === "sh") {
    return "bash";
  }

  return shellName;
}
