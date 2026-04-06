export type DebugLogger = {
  enabled: boolean;
  log(label: string, data?: unknown): void;
};

export type DebugFormat = "ndjson" | "pretty";

export const disabledDebugLogger: DebugLogger = {
  enabled: false,
  log() {},
};

type DebugSource = "cmdgen" | "model" | "provider";

type DebugEntry = {
  ts: string;
  event: string;
  source: DebugSource;
  data: unknown;
};

function inferDebugSource(event: string): DebugSource {
  if (event === "provider-payload") {
    return "provider";
  }

  if (event.startsWith("model-")) {
    return "model";
  }

  return "cmdgen";
}

function toDebugEntry(event: string, data: unknown): DebugEntry {
  return {
    ts: new Date().toISOString(),
    event,
    source: inferDebugSource(event),
    data: data ?? null,
  };
}

function formatPrettyEntry(entry: DebugEntry): string {
  if (entry.data === null) {
    return `[${entry.ts}] ${entry.source} ${entry.event}\n`;
  }

  if (typeof entry.data === "string") {
    return `[${entry.ts}] ${entry.source} ${entry.event}: ${entry.data}\n`;
  }

  return `[${entry.ts}] ${entry.source} ${entry.event}\n${JSON.stringify(entry.data, null, 2)}\n`;
}

export function createDebugLogger(
  enabled: boolean,
  write: (text: string) => void,
  format: DebugFormat = "ndjson",
): DebugLogger {
  if (!enabled) {
    return disabledDebugLogger;
  }

  return {
    enabled: true,
    log(event: string, data?: unknown): void {
      const entry = toDebugEntry(event, data);
      write(format === "pretty" ? formatPrettyEntry(entry) : `${JSON.stringify(entry)}\n`);
    },
  };
}
