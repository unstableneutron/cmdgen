import { describe, expect, test } from "vitest";
import { normalizeOutput } from "../src/normalize";

describe("normalizeOutput", () => {
  test("trims plain text", () => {
    expect(normalizeOutput("  jj st\n")).toBe("jj st");
  });

  test("strips fenced code blocks but preserves multiline structure", () => {
    expect(normalizeOutput('```bash\nfor f in *.ts; do\n  echo "$f"\ndone\n```')).toBe(
      'for f in *.ts; do\n  echo "$f"\ndone',
    );
  });

  test("preserves heredoc indentation and body", () => {
    expect(normalizeOutput("cat <<'PY'\nprint('hi')\nPY\n")).toBe("cat <<'PY'\nprint('hi')\nPY");
  });

  test("throws when output is empty after cleanup", () => {
    expect(() => normalizeOutput("```\n\n```")).toThrow("No command generated");
  });
});
