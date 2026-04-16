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
  test("publishes a stable launcher with explicit binary and script build hooks", () => {
    const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as PackageJson;

    expect(packageJson.private).not.toBe(true);
    expect(packageJson.packageManager).toBe("bun@1.3.11");
    expect(packageJson.bin?.cmdgen).toBe("./dist/cmdgen.js");
    expect(packageJson.files).toContain("dist");
    expect(packageJson.scripts?.["build:binary"]).toBe(
      "mkdir -p dist && bun build --compile --outfile=dist/cmdgen ./src/bin.ts",
    );
    expect(packageJson.scripts?.["build:script:bun"]).toBe(
      "mkdir -p dist && bun build --target=node --format=esm --outfile=dist/cli.js --banner='#!/usr/bin/env node' ./src/bin.ts",
    );
    expect(packageJson.scripts?.["build:script:rolldown"]).toBe(
      "mkdir -p dist && npx rolldown ./src/bin.ts --platform node --format esm --inline-dynamic-imports --file dist/cli.js --banner '#!/usr/bin/env node'",
    );
    expect(packageJson.scripts?.["build:launcher:bun"]).toBe(
      "mkdir -p dist && bun build --target=node --format=esm --outfile=dist/cmdgen.js --banner='#!/usr/bin/env node' ./src/launcher.ts",
    );
    expect(packageJson.scripts?.["build:launcher:rolldown"]).toBe(
      "mkdir -p dist && npx rolldown ./src/launcher.ts --platform node --format esm --inline-dynamic-imports --file dist/cmdgen.js --banner '#!/usr/bin/env node'",
    );
    expect(packageJson.scripts?.build).toBe(
      "if command -v bun >/dev/null 2>&1; then npm run build:script:bun && npm run build:binary && npm run build:launcher:bun; else npm run build:script:rolldown && npm run build:launcher:rolldown; fi",
    );
    expect(packageJson.scripts?.prepare).toBe("npm run build");
    expect(packageJson.scripts?.prepack).toBe("npm run build");
    expect(packageJson.scripts?.prepublishOnly).toBe("npm run build");
  });
});
