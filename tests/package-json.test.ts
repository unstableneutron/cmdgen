import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

type PackageJson = {
  private?: boolean;
  packageManager?: string;
  bin?: Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
};

describe("package.json publish contract", () => {
  test("publishes a built cli entrypoint with Bun-or-rolldown source install hooks", () => {
    const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as PackageJson;

    expect(packageJson.private).not.toBe(true);
    expect(packageJson.packageManager).toBe("bun@1.3.11");
    expect(packageJson.bin?.cmdgen).toBe("./dist/cli.js");
    expect(packageJson.files).toContain("dist");
    expect(packageJson.scripts?.["build:bun"]).toBe(
      "mkdir -p dist && bun build --target=node --format=esm --packages=external --outfile=dist/cli.js --banner='#!/usr/bin/env node' ./src/bin.ts",
    );
    expect(packageJson.scripts?.["build:rolldown"]).toBe(
      "mkdir -p dist && npx rolldown ./src/bin.ts --platform node --format esm --inline-dynamic-imports --file dist/cli.js --external @mariozechner/pi-ai,@mariozechner/pi-coding-agent --banner '#!/usr/bin/env node'",
    );
    expect(packageJson.scripts?.build).toBe(
      "if command -v bun >/dev/null 2>&1; then npm run build:bun; else npm run build:rolldown; fi",
    );
    expect(packageJson.scripts?.prepare).toBe("npm run build");
    expect(packageJson.scripts?.prepack).toBe("npm run build");
    expect(packageJson.scripts?.prepublishOnly).toBe("npm run build");
  });
});
