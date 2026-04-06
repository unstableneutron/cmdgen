const CANDIDATE_COMMANDS = [
  "mise",
  "brew",
  "uv",
  "bun",
  "pnpm",
  "npm",
  "python",
  "python3",
  "jj",
  "git",
] as const;

export type EnvironmentMetadata = {
  shell: string;
  cwd: string;
  availableCommands: string[];
  virtualEnv?: string;
};

export function detectEnvironmentMetadata(options?: {
  shell?: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  hasCommand?: (name: string) => boolean;
}): EnvironmentMetadata {
  const env = options?.env ?? process.env;
  const hasCommand = options?.hasCommand ?? ((name: string) => Boolean(Bun.which(name)));

  const availableCommands = CANDIDATE_COMMANDS.filter((name) => hasCommand(name));

  return {
    shell: options?.shell ?? env.SHELL ?? "sh",
    cwd: options?.cwd ?? process.cwd(),
    availableCommands: [...availableCommands],
    virtualEnv: env.VIRTUAL_ENV,
  };
}

export function formatEnvironmentMetadata(metadata: EnvironmentMetadata): string {
  const lines = [
    `Current shell: ${metadata.shell}`,
    `Current directory: ${metadata.cwd}`,
    `Available commands: ${metadata.availableCommands.join(", ") || "none detected"}`,
  ];

  if (metadata.virtualEnv) {
    lines.push(`Active virtualenv: ${metadata.virtualEnv}`);
  }

  return lines.join("\n");
}
