import { describe, expect, test } from "vitest";
import {
  resolveArtifactPaths,
  runLauncher,
  shouldRunLauncherForInvocation,
} from "../src/launcher";

describe("resolveArtifactPaths", () => {
  test("derives sibling binary and script paths from the stable launcher", () => {
    expect(resolveArtifactPaths("/tmp/cmdgen/dist/cmdgen.js")).toEqual({
      binaryPath: "/tmp/cmdgen/dist/cmdgen",
      scriptPath: "/tmp/cmdgen/dist/cli.js",
    });
  });
});

describe("shouldRunLauncherForInvocation", () => {
  test("treats a symlinked bin path as the launcher itself", () => {
    expect(
      shouldRunLauncherForInvocation({
        invokedPath: "/tmp/prefix/bin/cmdgen",
        selfPath: "/tmp/prefix/lib/node_modules/cmdgen/dist/cmdgen.js",
        resolveRealPath(path) {
          if (path === "/tmp/prefix/bin/cmdgen") {
            return "/tmp/prefix/lib/node_modules/cmdgen/dist/cmdgen.js";
          }

          return path;
        },
      }),
    ).toBe(true);
  });
});

describe("runLauncher", () => {
  test("prefers the compiled binary when it exists", () => {
    const calls: Array<{ command: string; args: string[]; programPath?: string }> = [];

    const exitCode = runLauncher({
      argv: ["init", "zsh"],
      execPath: process.execPath,
      env: {},
      resolveSelfPath: () => "/tmp/cmdgen/dist/cmdgen.js",
      canExecute: (path) => path.endsWith("/cmdgen"),
      fileExists: () => true,
      spawn(command, args, options) {
        calls.push({
          command,
          args,
          programPath: options.env?.CMDGEN_PROGRAM_PATH,
        });

        return { status: 0 };
      },
      stderr() {},
    });

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      {
        command: "/tmp/cmdgen/dist/cmdgen",
        args: ["init", "zsh"],
        programPath: "/tmp/cmdgen/dist/cmdgen.js",
      },
    ]);
  });

  test("falls back to node + cli.js when the binary is absent", () => {
    const calls: Array<{ command: string; args: string[]; programPath?: string }> = [];

    const exitCode = runLauncher({
      argv: ["generate", "show", "repo", "root"],
      execPath: "/usr/local/bin/node",
      env: {},
      resolveSelfPath: () => "/tmp/cmdgen/dist/cmdgen.js",
      canExecute: () => false,
      fileExists: (path) => path.endsWith("/cli.js"),
      spawn(command, args, options) {
        calls.push({
          command,
          args,
          programPath: options.env?.CMDGEN_PROGRAM_PATH,
        });

        return { status: 0 };
      },
      stderr() {},
    });

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      {
        command: "/usr/local/bin/node",
        args: ["/tmp/cmdgen/dist/cli.js", "generate", "show", "repo", "root"],
        programPath: "/tmp/cmdgen/dist/cmdgen.js",
      },
    ]);
  });

  test("falls back to node + cli.js when the binary exits by signal", () => {
    const calls: Array<{ command: string; args: string[]; programPath?: string }> = [];

    const exitCode = runLauncher({
      argv: ["init", "zsh"],
      execPath: "/usr/local/bin/node",
      env: {},
      resolveSelfPath: () => "/tmp/cmdgen/dist/cmdgen.js",
      canExecute: (path) => path.endsWith("/cmdgen"),
      fileExists: (path) => path.endsWith("/cli.js"),
      spawn(command, args, options) {
        calls.push({
          command,
          args,
          programPath: options.env?.CMDGEN_PROGRAM_PATH,
        });

        if (command.endsWith("/cmdgen")) {
          return { status: null, error: undefined, signal: "SIGKILL" };
        }

        return { status: 0 };
      },
      stderr() {},
    });

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      {
        command: "/tmp/cmdgen/dist/cmdgen",
        args: ["init", "zsh"],
        programPath: "/tmp/cmdgen/dist/cmdgen.js",
      },
      {
        command: "/usr/local/bin/node",
        args: ["/tmp/cmdgen/dist/cli.js", "init", "zsh"],
        programPath: "/tmp/cmdgen/dist/cmdgen.js",
      },
    ]);
  });

  test("fails clearly when neither artifact exists", () => {
    const errors: string[] = [];

    const exitCode = runLauncher({
      argv: [],
      execPath: process.execPath,
      env: {},
      resolveSelfPath: () => "/tmp/cmdgen/dist/cmdgen.js",
      canExecute: () => false,
      fileExists: () => false,
      spawn() {
        throw new Error("spawn should not be called");
      },
      stderr(text) {
        errors.push(text);
      },
    });

    expect(exitCode).toBe(1);
    expect(errors.join("")).toContain("Unable to find a runnable cmdgen artifact");
  });
});
