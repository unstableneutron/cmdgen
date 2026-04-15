import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

type PackJson = Array<{
  files: Array<{ path: string }>;
}>;

describe("packed artifact", () => {
  test("ships the built cli artifact without tracking dist in git", () => {
    execFileSync("npm", ["run", "build"], { stdio: "pipe" });

    expect(existsSync(resolve("dist/cli.js"))).toBe(true);
    expect(() =>
      execFileSync("git", ["ls-files", "--error-unmatch", "dist/cli.js"], {
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).toThrow();

    const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
      encoding: "utf8",
    });
    const jsonStart = raw.indexOf("[");

    const [packInfo] = JSON.parse(raw.slice(jsonStart)) as PackJson;
    const paths = packInfo.files.map((file) => file.path);

    expect(paths).toContain("dist/cli.js");
    expect(paths).not.toContain("bin/cmdgen");
    expect(paths).not.toContain("src/cli.ts");
  });
});
