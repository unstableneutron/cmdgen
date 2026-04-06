import { emitBashInit } from "./bash";
import { emitNuInit } from "./nu";
import { normalizeInitShell } from "./shared";
import { emitZshInit } from "./zsh";

export function emitShellInit(shellName: string, programPath: string): string {
  const normalized = normalizeInitShell(shellName);

  if (normalized === "zsh") {
    return emitZshInit(programPath);
  }

  if (normalized === "bash") {
    return emitBashInit(programPath);
  }

  if (normalized === "nu") {
    return emitNuInit(programPath);
  }

  throw new Error(`Unsupported shell: ${shellName}`);
}
