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
      debugLogger: { enabled: false, log() {} },
    });

    expect(command).toContain("uv run --isolated python");
  });

  test("logs raw and final output when debug is enabled", async () => {
    const events: Array<{ label: string; data: unknown }> = [];

    const command = await generateCommand({
      query: "show repo root",
      history: [],
      availableCommands: ["uv", "bun"],
      environmentText: "Available commands: uv, bun",
      requestTarget: resolveRequestTarget("/bin/zsh", "show repo root"),
      completeText: async () => "```bash\npwd\n```",
      debugLogger: {
        enabled: true,
        log(label: string, data?: unknown): void {
          events.push({ label, data });
        },
      },
    });

    expect(command).toBe("pwd");
    expect(events.map((event) => event.label)).toEqual([
      "prompt-built",
      "model-output-raw",
      "model-output-normalized",
      "command-final",
    ]);
  });

  test("wraps raw python output into a runnable shell command", async () => {
    const command = await generateCommand({
      query: "list directories in cwd in python",
      history: [],
      availableCommands: ["uv", "bun"],
      environmentText: "Available commands: uv, bun",
      requestTarget: resolveRequestTarget("/bin/zsh", "list directories in cwd in python"),
      completeText: async () => "import os\nprint(os.getcwd())",
      debugLogger: { enabled: false, log() {} },
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
      debugLogger: { enabled: false, log() {} },
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
        debugLogger: { enabled: false, log() {} },
      }),
    ).rejects.toThrow("Query is required");
  });
});
