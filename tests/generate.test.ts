import { describe, expect, test } from "vitest";
import { generateCommand } from "../src/generate";
import { resolveRequestTarget } from "../src/request-target";

describe("generateCommand", () => {
  test("passes requestTarget through to prompt generation", async () => {
    const command = await generateCommand({
      query: "list directories in cwd in python",
      history: [],
      availableCommands: ["uv", "bun"],
      environmentText: "Available commands: uv, bun",
      requestTarget: resolveRequestTarget("/bin/zsh", "list directories in cwd in python"),
      completeText: async (prompt) => {
        expect(prompt).toContain("Implementation target: python");
        return "uv run --isolated python - <<'PY'\nprint('ok')\nPY";
      },
    });

    expect(command).toContain("uv run --isolated python");
  });

  test("wraps raw python output into a runnable shell command", async () => {
    const command = await generateCommand({
      query: "list directories in cwd in python",
      history: [],
      availableCommands: ["uv", "bun"],
      environmentText: "Available commands: uv, bun",
      requestTarget: resolveRequestTarget("/bin/zsh", "list directories in cwd in python"),
      completeText: async () => "import os\nprint(os.getcwd())",
    });

    expect(command).toContain("uv run --isolated python - <<'PY'");
    expect(command).toContain("import os");
  });

  test("wraps raw javascript output into a runnable bun command", async () => {
    const command = await generateCommand({
      query: "count files in cwd in javascript",
      history: [],
      availableCommands: ["bun"],
      environmentText: "Available commands: bun",
      requestTarget: resolveRequestTarget("/bin/zsh", "count files in cwd in javascript"),
      completeText: async () => "console.log('ok')",
    });

    expect(command).toContain("bun - <<'JS'");
    expect(command).toContain("console.log('ok')");
  });

  test("throws when query is blank", async () => {
    await expect(
      generateCommand({
        query: "   ",
        history: [],
        availableCommands: [],
        environmentText: "Current shell: /bin/zsh",
        requestTarget: resolveRequestTarget("/bin/zsh", "show repo root"),
        completeText: async () => "pwd",
      }),
    ).rejects.toThrow("Query is required");
  });
});
