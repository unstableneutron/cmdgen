import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";

type PackJson = Array<{
  files: Array<{ path: string }>;
}>;

describe("packed artifact", () => {
  test("ships the built cli instead of the Bun wrapper", () => {
    execFileSync("bun", ["run", "build"], { stdio: "pipe" });

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
