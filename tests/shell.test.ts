import { describe, expect, test } from "vitest";
import { emitShellInit } from "../src/shell";

describe("emitShellInit", () => {
  test("emits zsh wrapper with d alias and print -z", () => {
    const text = emitShellInit("zsh", "/Users/thinh/Projects/cmdgen/bin/cmdgen");
    expect(text).toContain("d() {");
    expect(text).toContain('print -z -- "$generated"');
    expect(text).toContain("cmdgen() {");
    expect(text).toContain("--history-entry");
  });

  test("emits bash wrapper that prints to stdout", () => {
    const text = emitShellInit("bash", "/Users/thinh/Projects/cmdgen/bin/cmdgen");
    expect(text).toContain("d() {");
    expect(text).toContain("generate --shell bash");
    expect(text).not.toContain("print -z");
  });

  test("maps sh to bash init output", () => {
    const text = emitShellInit("sh", "/Users/thinh/Projects/cmdgen/bin/cmdgen");
    expect(text).toContain("generate --shell bash");
  });

  test("throws on unsupported shells", () => {
    expect(() => emitShellInit("fish", "/tmp/cmdgen")).toThrow("Unsupported shell");
  });
});
