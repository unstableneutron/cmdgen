import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, test } from "vitest";

const tempPaths: string[] = [];

afterEach(() => {
  while (tempPaths.length > 0) {
    const path = tempPaths.pop();
    if (path) {
      rmSync(path, { recursive: true, force: true });
    }
  }
});

describe("bin/cmdgen", () => {
  test("follows symlinks when locating src/cli.ts", () => {
    const workspace = mkdtempSync(join(tmpdir(), "cmdgen-bin-test-"));
    tempPaths.push(workspace);

    const linkedBin = join(workspace, "cmdgen");
    const targetBin = resolve("bin/cmdgen");
    symlinkSync(targetBin, linkedBin);

    const output = execFileSync(linkedBin, ["init", "zsh"], {
      cwd: resolve("."),
      encoding: "utf8",
    });

    expect(output).toContain("cmdgen()");
    expect(output).toContain("generate --shell zsh");
  });
});
