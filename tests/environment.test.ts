import { describe, expect, test } from "vitest";
import { detectEnvironmentMetadata, formatEnvironmentMetadata } from "../src/environment";

describe("environment metadata", () => {
  test("formats available commands and active virtualenv", () => {
    const text = formatEnvironmentMetadata({
      availableCommands: ["mise", "brew", "uv", "jj"],
      shell: "/bin/zsh",
      cwd: "/Users/thinh/Projects/cmdgen",
      virtualEnv: "/tmp/demo-venv",
    });

    expect(text).toContain("Current shell: /bin/zsh");
    expect(text).toContain("Current directory: /Users/thinh/Projects/cmdgen");
    expect(text).toContain("Available commands: mise, brew, uv, jj");
    expect(text).toContain("Active virtualenv: /tmp/demo-venv");
  });

  test("detectEnvironmentMetadata respects injected availability checks", () => {
    const metadata = detectEnvironmentMetadata({
      shell: "/bin/zsh",
      cwd: "/tmp/demo",
      env: { VIRTUAL_ENV: "/tmp/demo-venv" },
      hasCommand: (name) => ["mise", "bun", "pnpm"].includes(name),
    });

    expect(metadata.availableCommands).toEqual(["mise", "bun", "pnpm"]);
    expect(metadata.virtualEnv).toBe("/tmp/demo-venv");
  });
});
