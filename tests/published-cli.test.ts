import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("published cli entrypoint", () => {
  test("builds a cli that runs with node", () => {
    execFileSync("npm", ["run", "build"], {
      cwd: resolve("."),
      stdio: "pipe",
    });

    const output = execFileSync("node", [resolve("dist/cli.js"), "init", "zsh"], {
      cwd: resolve("."),
      encoding: "utf8",
    });

    expect(output).toContain("cmdgen()");
    expect(output).toContain("generate --shell zsh");
  });
});
