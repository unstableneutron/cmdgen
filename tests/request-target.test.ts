import { describe, expect, test } from "vitest";
import { resolveRequestTarget } from "../src/request-target";

describe("resolveRequestTarget", () => {
  test("defaults both execution shell and implementation target to the current shell", () => {
    expect(resolveRequestTarget("/bin/zsh", "show repo root")).toEqual({
      currentShell: "zsh",
      executionShell: "zsh",
      implementationTarget: "zsh",
      requestedLanguage: undefined,
    });
  });

  test("switches execution shell when the query explicitly ends with a bash override", () => {
    expect(resolveRequestTarget("/bin/zsh", "show repo root in bash")).toEqual({
      currentShell: "zsh",
      executionShell: "bash",
      implementationTarget: "bash",
      requestedLanguage: undefined,
    });
  });

  test("does not switch shells on incidental shell-name mentions", () => {
    expect(resolveRequestTarget("/bin/zsh", "check if bash is installed")).toEqual({
      currentShell: "zsh",
      executionShell: "zsh",
      implementationTarget: "zsh",
      requestedLanguage: undefined,
    });
  });

  test("keeps execution shell but switches implementation target for python", () => {
    expect(resolveRequestTarget("/bin/zsh", "list directories in cwd in python")).toEqual({
      currentShell: "zsh",
      executionShell: "zsh",
      implementationTarget: "python",
      requestedLanguage: "python",
    });
  });

  test("recognizes javascript and typescript overrides", () => {
    expect(resolveRequestTarget("/bin/zsh", "do this in javascript").implementationTarget).toBe(
      "javascript",
    );
    expect(resolveRequestTarget("/bin/zsh", "do this in typescript").implementationTarget).toBe(
      "typescript",
    );
  });

  test("uses bash semantics consistently for /bin/sh", () => {
    expect(resolveRequestTarget("/bin/sh", "show repo root")).toEqual({
      currentShell: "bash",
      executionShell: "bash",
      implementationTarget: "bash",
      requestedLanguage: undefined,
    });
  });
});
