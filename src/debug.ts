export type DebugLogger = {
  enabled: boolean;
  log(label: string, data?: unknown): void;
};

export const disabledDebugLogger: DebugLogger = {
  enabled: false,
  log() {},
};

function stringifyDebugData(data: unknown): string {
  if (data === undefined) {
    return "";
  }

  try {
    return ` ${JSON.stringify(data)}`;
  } catch {
    return ` ${JSON.stringify(Object.prototype.toString.call(data))}`;
  }
}

export function createDebugLogger(enabled: boolean, write: (text: string) => void): DebugLogger {
  if (!enabled) {
    return disabledDebugLogger;
  }

  return {
    enabled: true,
    log(label: string, data?: unknown): void {
      write(`[cmdgen:${label}]${stringifyDebugData(data)}\n`);
    },
  };
}
