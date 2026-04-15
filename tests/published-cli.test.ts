import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("published cli entrypoint", () => {
  test("builds a cli that runs with node", () => {
    const distDir = resolve("dist");
    const builtCliPath = join(distDir, `published-cli-${Date.now()}.js`);

    mkdirSync(distDir, { recursive: true });

    execFileSync(
      "bun",
      [
        "build",
        "--target=node",
        "--format=esm",
        "--packages=external",
        `--outfile=${builtCliPath}`,
        "--banner=#!/usr/bin/env node",
        "./src/bin.ts",
      ],
      {
        cwd: resolve("."),
        stdio: "pipe",
      },
    );

    const output = execFileSync("node", [builtCliPath, "init", "zsh"], {
      cwd: resolve("."),
      encoding: "utf8",
    });

    rmSync(builtCliPath, { force: true });

    expect(output).toContain("cmdgen()");
    expect(output).toContain("generate --shell zsh");
  });
});
