import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { accessSync, constants, existsSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type SpawnResult = Pick<SpawnSyncReturns<Buffer>, "error" | "signal" | "status">;

type LauncherDeps = {
  argv: string[];
  execPath: string;
  env: NodeJS.ProcessEnv;
  resolveSelfPath: () => string;
  canExecute: (path: string) => boolean;
  fileExists: (path: string) => boolean;
  spawn: (
    command: string,
    args: string[],
    options: { stdio: "inherit"; env: NodeJS.ProcessEnv },
  ) => SpawnResult;
  stderr: (text: string) => void;
};

export function resolveArtifactPaths(selfPath: string): {
  binaryPath: string;
  scriptPath: string;
} {
  const distDir = dirname(selfPath);

  return {
    binaryPath: join(distDir, "cmdgen"),
    scriptPath: join(distDir, "cli.js"),
  };
}

function defaultCanExecute(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function didExitCleanly(result: SpawnResult): boolean {
  return !result.error && !result.signal && result.status === 0;
}

function toExitCode(result: SpawnResult): number {
  if (typeof result.status === "number") {
    return result.status;
  }

  return result.error || result.signal ? 1 : 0;
}

export function shouldRunLauncherForInvocation(options: {
  invokedPath: string | undefined;
  selfPath: string;
  resolveRealPath?: (path: string) => string;
}): boolean {
  const { invokedPath, selfPath, resolveRealPath = realpathSync } = options;
  if (!invokedPath) {
    return false;
  }

  try {
    return resolveRealPath(invokedPath) === resolveRealPath(selfPath);
  } catch {
    return false;
  }
}

export function runLauncher(
  deps: LauncherDeps = {
    argv: process.argv.slice(2),
    execPath: process.execPath,
    env: process.env,
    resolveSelfPath: () => fileURLToPath(import.meta.url),
    canExecute: defaultCanExecute,
    fileExists: existsSync,
    spawn(command, args, options) {
      return spawnSync(command, args, options);
    },
    stderr(text) {
      process.stderr.write(text);
    },
  },
): number {
  const selfPath = deps.resolveSelfPath();
  const { binaryPath, scriptPath } = resolveArtifactPaths(selfPath);
  const env = { ...deps.env, CMDGEN_PROGRAM_PATH: selfPath };

  if (deps.canExecute(binaryPath)) {
    const result = deps.spawn(binaryPath, deps.argv, { stdio: "inherit", env });
    if (didExitCleanly(result)) {
      return 0;
    }

    if (!result.signal && !result.error) {
      return toExitCode(result);
    }
  }

  if (!deps.fileExists(scriptPath)) {
    deps.stderr(`Unable to find a runnable cmdgen artifact at ${binaryPath} or ${scriptPath}\n`);
    return 1;
  }

  const result = deps.spawn(deps.execPath, [scriptPath, ...deps.argv], {
    stdio: "inherit",
    env,
  });
  return toExitCode(result);
}

if (
  shouldRunLauncherForInvocation({
    invokedPath: process.argv[1],
    selfPath: fileURLToPath(import.meta.url),
  })
) {
  process.exit(runLauncher());
}
