export function normalizeOutput(markdown: string): string {
  const trimmed = markdown.trim();
  const fenced = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  const source = fenced ? fenced[1] : trimmed;
  const normalized = source.trim();

  if (!normalized) {
    throw new Error("No command generated");
  }

  return normalized;
}
