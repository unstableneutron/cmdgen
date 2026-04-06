import { quoteForPosixShell } from "./shared";

export function emitBashInit(programPath: string): string {
  const quotedProgramPath = quoteForPosixShell(programPath);

  return `cmdgen() {
  local query="$*"
  local -a history_entries=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && history_entries+=("$line")
  done < <(history 3 | sed -E 's/^[[:space:]]*[0-9]+[[:space:]]*//')

  local -a cmd=(${quotedProgramPath} generate --shell bash --cwd "$PWD")
  local entry
  for entry in "\${history_entries[@]}"; do
    cmd+=(--history-entry "$entry")
  done
  cmd+=(-- "$query")
  "\${cmd[@]}"
}

d() {
  cmdgen "$@"
}
`;
}
