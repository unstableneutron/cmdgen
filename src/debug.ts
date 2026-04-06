export type DebugLogger = {
  enabled: boolean;
  log(label: string, data?: unknown): void;
};

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

export function createDebugLogger(enabled: boolean, write: (text: string) => void): DebugLogger {
  if (!enabled) {
    return disabledDebugLogger;
  }

  return {
    enabled: true,
    log(event: string, data?: unknown): void {
      write(`${JSON.stringify(toDebugEntry(event, data))}\n`);
    },
  };
}
