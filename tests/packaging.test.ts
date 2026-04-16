import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

type PackJson = Array<{
  files: Array<{ path: string }>;
}>;

function parsePackJson(raw: string): PackJson {
  const jsonStart = raw.search(/\[\s*\{\s*"id":/m);
  if (jsonStart === -1) {
    throw new Error(`Unable to locate npm pack JSON output:\n${raw}`);
  }

  return JSON.parse(raw.slice(jsonStart)) as PackJson;
}

describe("packed artifact", () => {
  test("ships launcher and bundled cli artifacts without tracking dist in git", () => {
    execFileSync("npm", ["run", "build"], { stdio: "pipe" });

    expect(existsSync(resolve("dist/cmdgen.js"))).toBe(true);
    expect(existsSync(resolve("dist/cli.js"))).toBe(true);
    expect(readFileSync(resolve("dist/cli.js"), "utf8")).not.toContain(
      'from "@mariozechner/pi-ai"',
    );
    expect(readFileSync(resolve("dist/cli.js"), "utf8")).not.toContain(
      'from "@mariozechner/pi-coding-agent"',
    );

    const binaryExists = existsSync(resolve("dist/cmdgen"));

    expect(() =>
      execFileSync("git", ["ls-files", "--error-unmatch", "dist/cmdgen.js"], {
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).toThrow();

    const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
      encoding: "utf8",
    });
    const [packInfo] = parsePackJson(raw);
    const paths = packInfo.files.map((file) => file.path);

    expect(paths).toContain("dist/cmdgen.js");
    expect(paths).toContain("dist/cli.js");
    if (binaryExists) {
      expect(paths).toContain("dist/cmdgen");
    }
    expect(paths).not.toContain("src/cli.ts");
    expect(paths).not.toContain("src/launcher.ts");
  });
});
