import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

type PackageJson = {
  private?: boolean;
  bin?: Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
};

describe("package.json publish contract", () => {
  test("publishes a built cli entrypoint", () => {
    const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as PackageJson;

    expect(packageJson.private).not.toBe(true);
    expect(packageJson.bin?.cmdgen).toBe("./dist/cli.js");
    expect(packageJson.files).toContain("dist");
    expect(packageJson.scripts?.build).toBe(
      "bun build --target=node --format=esm --packages=external --outfile=dist/cli.js --banner='#!/usr/bin/env node' ./src/bin.ts",
    );
    expect(packageJson.scripts?.prepare).toBe("bun run build");
    expect(packageJson.scripts?.prepack).toBe("bun run build");
  });
});
